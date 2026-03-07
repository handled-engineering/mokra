import { NextResponse, NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { MockEngine } from "@/lib/mock-engine"
import {
  ServiceLoader,
  toMockService,
  buildEndpointNotesMap,
} from "@/lib/services"

// Initialize service loader (singleton)
const serviceLoader = new ServiceLoader({
  cacheTTL: process.env.NODE_ENV === "development" ? 0 : 300000,
})

async function handleMockRequest(req: NextRequest, segments: string[]) {
  // First segment is the service slug
  const serviceSlug = segments[0]
  const apiPath = "/" + segments.slice(1).join("/")

  // Get API key from header
  const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "")

  if (!apiKey) {
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

  // Find the project by API key with custom contexts
  const project = await prisma.userProject.findFirst({
    where: {
      apiKey,
      isActive: true,
    },
    include: {
      service: {
        include: {
          endpoints: true,
        },
      },
      endpointContexts: true,
    },
  })

  if (!project) {
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

  // Verify the service slug matches
  if (project.service.slug !== serviceSlug) {
    return NextResponse.json(
      {
        error: {
          message: "API key does not match this service",
          type: "authentication_error",
        },
      },
      { status: 401 }
    )
  }

  // Try to load service from filesystem first
  const fileService = await serviceLoader.loadService(serviceSlug)

  // Determine which service to use and build endpoint notes
  let serviceForEngine: typeof project.service
  let endpointNotesMap: Record<string, string> = {}

  if (fileService) {
    // Use file-based service - convert to MockEngine compatible format
    const mockService = toMockService(fileService)
    serviceForEngine = {
      ...project.service,
      endpoints: mockService.endpoints as typeof project.service.endpoints,
      documentation: fileService.readme || project.service.documentation,
      // Use database isActive status (controlled via UI), not file-based
      isActive: project.service.isActive,
    }

    // Build endpoint notes map from file-based endpoints
    const notesMap = buildEndpointNotesMap(fileService)
    notesMap.forEach((value, key) => {
      endpointNotesMap[key] = value
    })
  } else {
    // Fall back to database service
    serviceForEngine = project.service
  }

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

  // Parse headers
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })

  // Build endpoint context map from database
  const endpointContextMap: Record<string, string> = {}
  for (const ctx of project.endpointContexts) {
    endpointContextMap[ctx.endpointId] = ctx.context
  }

  // Create mock engine and handle request
  const engine = new MockEngine(
    serviceForEngine,
    project.id,
    project.customContext || undefined,
    endpointContextMap,
    endpointNotesMap
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
