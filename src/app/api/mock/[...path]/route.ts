import { NextResponse, NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { MockEngine } from "@/lib/mock-engine"

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

  // Check if service is active
  if (!project.service.isActive) {
    return NextResponse.json(
      {
        error: {
          message: "This mock service is currently inactive",
          type: "service_error",
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

  // Build endpoint context map
  const endpointContextMap: Record<string, string> = {}
  for (const ctx of project.endpointContexts) {
    endpointContextMap[ctx.endpointId] = ctx.context
  }

  // Create mock engine and handle request
  const engine = new MockEngine(
    project.service,
    project.id,
    project.customContext || undefined,
    endpointContextMap
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
      "X-Mock-Service": project.service.name,
      "X-Stateful-Mode": isStateful ? "enabled" : "disabled",
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
