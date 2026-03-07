import { NextResponse, NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { MockEngine } from "@/lib/mock-engine"
import { GraphQLEngine } from "@/lib/graphql-engine"
import {
  ServiceLoader,
  toMockService,
  buildEndpointNotesMap,
} from "@/lib/services"
import { serverAnalytics } from "@/lib/mixpanel-server"

// Initialize service loader (singleton)
const serviceLoader = new ServiceLoader({
  cacheTTL: process.env.NODE_ENV === "development" ? 0 : 300000,
})

async function handleMockRequest(req: NextRequest, segments: string[]) {
  const requestStartTime = Date.now()

  // First segment is the service slug
  const serviceSlug = segments[0]
  const apiPath = "/" + segments.slice(1).join("/")

  // Get API key from header
  const apiKeyValue = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "")

  if (!apiKeyValue) {
    return NextResponse.json(
      {
        error: {
          message: "API key is required. Include it in the X-API-Key header.",
          type: "authentication_error",
        },
      },
      { status: 401 }
    )
  }

  // Find the API key in the new shared API keys table
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key: apiKeyValue },
    include: {
      user: true,
      exclusions: {
        select: { mockServerId: true },
      },
    },
  })

  if (!apiKeyRecord) {
    return NextResponse.json(
      {
        error: {
          message: "Invalid API key",
          type: "authentication_error",
        },
      },
      { status: 401 }
    )
  }

  // Check if API key has expired
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return NextResponse.json(
      {
        error: {
          message: "API key has expired",
          type: "authentication_error",
        },
      },
      { status: 401 }
    )
  }

  // Find all active mock servers for this user and service
  const mockServers = await prisma.mockServer.findMany({
    where: {
      userId: apiKeyRecord.userId,
      isActive: true,
      service: { slug: serviceSlug },
    },
    include: {
      service: true,
      endpointContexts: true,
    },
  })

  if (mockServers.length === 0) {
    return NextResponse.json(
      {
        error: {
          message: `No active mock server found for service '${serviceSlug}'`,
          type: "not_found",
        },
      },
      { status: 404 }
    )
  }

  // Determine which mock server to use
  let mockServer = mockServers[0]

  if (mockServers.length > 1) {
    // Multiple servers - require X-Mock-Server-Id header
    const mockServerId = req.headers.get("x-mock-server-id")

    if (!mockServerId) {
      return NextResponse.json(
        {
          error: {
            message: "Multiple mock servers exist for this service. Specify which one using the X-Mock-Server-Id header.",
            type: "ambiguous_server",
            availableServers: mockServers.map((s) => ({
              id: s.id,
              name: s.name,
            })),
          },
        },
        { status: 400 }
      )
    }

    const selectedServer = mockServers.find((s) => s.id === mockServerId)
    if (!selectedServer) {
      return NextResponse.json(
        {
          error: {
            message: `Mock server '${mockServerId}' not found for this service`,
            type: "not_found",
            availableServers: mockServers.map((s) => ({
              id: s.id,
              name: s.name,
            })),
          },
        },
        { status: 404 }
      )
    }

    mockServer = selectedServer
  }

  // Check if this mock server is excluded from the API key
  const excludedIds = apiKeyRecord.exclusions.map((e) => e.mockServerId)
  if (excludedIds.includes(mockServer.id)) {
    return NextResponse.json(
      {
        error: {
          message: "API key does not have access to this mock server",
          type: "forbidden",
        },
      },
      { status: 403 }
    )
  }

  // Update lastUsedAt asynchronously (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Ignore errors - this is non-critical
    })

  // Try to load service from filesystem first
  const fileService = await serviceLoader.loadService(serviceSlug)

  // Load service from filesystem (required for endpoints)
  if (!fileService) {
    return NextResponse.json(
      {
        error: {
          message: "Service configuration not found in filesystem",
          type: "configuration_error",
        },
      },
      { status: 500 }
    )
  }

  // Convert to MockEngine compatible format
  const mockService = toMockService(fileService)
  const serviceForEngine = {
    ...mockServer.service,
    endpoints: mockService.endpoints,
    documentation: fileService.readme || mockServer.service.documentation,
  }

  // Build endpoint notes map from file-based endpoints
  let endpointNotesMap: Record<string, string> = {}
  const notesMap = buildEndpointNotesMap(fileService)
  notesMap.forEach((value, key) => {
    endpointNotesMap[key] = value
  })

  // Check if service is active
  if (!serviceForEngine.isActive) {
    return NextResponse.json(
      {
        error: {
          message: "This service has been deactivated by Mokra. Please contact the service administrator.",
          type: "service_unavailable",
          code: "SERVICE_DEACTIVATED",
          service: serviceForEngine.name,
        },
      },
      { status: 503 }
    )
  }

  // Parse headers
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })

  // Check if this is a GraphQL service
  if (fileService.type === "graphql") {
    return handleGraphQLRequest(req, fileService, mockServer, headers, segments, apiKeyRecord.userId, requestStartTime)
  }

  // Parse request body for POST/PUT/PATCH
  let body: unknown = undefined
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      body = await req.json()
    } catch {
      // Body might be empty or not JSON
    }
  }

  // Parse query params
  const query: Record<string, string> = {}
  req.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value
  })

  // Build endpoint context map from database (keyed by path pattern)
  const endpointContextMap: Record<string, string> = {}
  for (const ctx of mockServer.endpointContexts) {
    endpointContextMap[ctx.path] = ctx.context
  }

  // Create mock engine and handle request
  const engine = new MockEngine(
    serviceForEngine,
    mockServer.id,
    mockServer.customContext || undefined,
    endpointContextMap,
    endpointNotesMap,
    fileService?.paginationConfig,
    fileService?.rateLimitConfig
  )
  const response = await engine.handleRequest({
    method: req.method,
    path: apiPath,
    query,
    body,
    headers,
  })

  // Check if stateful mode was used
  const isStateful = headers["x-stateful"]?.toLowerCase() === "true"

  // Track mock request (fire and forget to not affect response time)
  const requestDuration = Date.now() - requestStartTime
  serverAnalytics.mockRequestMade(apiKeyRecord.userId, {
    serverId: mockServer.id,
    serviceSlug,
    method: req.method,
    path: apiPath,
    statusCode: response.statusCode,
    duration: requestDuration,
    isStateful,
    isGraphQL: false,
  })

  return NextResponse.json(response.body, {
    status: response.statusCode,
    headers: {
      "X-Mock-Service": serviceForEngine.name,
      "X-Stateful-Mode": isStateful ? "enabled" : "disabled",
      "X-Source": fileService ? "filesystem" : "database",
      ...response.headers,
    },
  })
}

async function handleGraphQLRequest(
  req: NextRequest,
  fileService: Awaited<ReturnType<typeof serviceLoader.loadService>>,
  mockServer: { id: string; customContext: string | null },
  headers: Record<string, string>,
  segments: string[],
  userId: string,
  requestStartTime: number
) {
  if (!fileService || fileService.type !== "graphql") {
    return NextResponse.json(
      { errors: [{ message: "Not a GraphQL service" }] },
      { status: 400 }
    )
  }

  // Only POST is supported for GraphQL
  if (req.method !== "POST") {
    return NextResponse.json(
      { errors: [{ message: "GraphQL only supports POST requests" }] },
      { status: 405 }
    )
  }

  // Determine the schema version
  // Version can come from: path (e.g., /shopify/2024-01/graphql) or header
  let version: string | undefined

  // Check path for version (e.g., segments = ["shopify", "2024-01", "graphql"])
  if (segments.length >= 2) {
    // The version is typically the second segment for GraphQL services
    const potentialVersion = segments[1]
    // Check if this version exists in the schemas
    const hasVersion = fileService.graphqlSchemas?.some(
      (s) => s.version === potentialVersion
    )
    if (hasVersion) {
      version = potentialVersion
    }
  }

  // Check header for version
  if (!version) {
    const versionHeader = fileService.graphql?.versionHeader || "X-API-Version"
    version = headers[versionHeader.toLowerCase()] || headers[versionHeader]
  }

  // Get the schema for this version
  const schemaVersion = await serviceLoader.getGraphQLSchema(
    fileService.slug,
    version
  )

  if (!schemaVersion) {
    return NextResponse.json(
      {
        errors: [
          {
            message: version
              ? `GraphQL schema version '${version}' not found`
              : "No GraphQL schema found for this service",
          },
        ],
      },
      { status: 404 }
    )
  }

  // Parse the GraphQL request body
  let graphqlRequest: { query: string; operationName?: string; variables?: Record<string, unknown> }
  try {
    graphqlRequest = await req.json()
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Invalid JSON in request body" }] },
      { status: 400 }
    )
  }

  if (!graphqlRequest.query) {
    return NextResponse.json(
      { errors: [{ message: "Missing 'query' in request body" }] },
      { status: 400 }
    )
  }

  // Create GraphQL engine and handle request
  try {
    const engine = new GraphQLEngine(
      fileService,
      schemaVersion,
      mockServer.id,
      mockServer.customContext || undefined
    )

    const response = await engine.handleRequest(graphqlRequest, headers)

    // Track GraphQL request
    const requestDuration = Date.now() - requestStartTime
    serverAnalytics.mockRequestMade(userId, {
      serverId: mockServer.id,
      serviceSlug: fileService.slug,
      method: "POST",
      path: "/graphql",
      statusCode: response.statusCode,
      duration: requestDuration,
      isStateful: false,
      isGraphQL: true,
    })

    return NextResponse.json(response.body, {
      status: response.statusCode,
      headers: {
        "Content-Type": "application/json",
        "X-Mock-Service": fileService.name,
        "X-GraphQL-Version": schemaVersion.version,
        "X-Source": "filesystem",
        ...response.headers,
      },
    })
  } catch (error) {
    console.error("GraphQL engine error:", error)
    return NextResponse.json(
      {
        errors: [
          {
            message: `GraphQL engine error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(req, params.path)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(req, params.path)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(req, params.path)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(req, params.path)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleMockRequest(req, params.path)
}
