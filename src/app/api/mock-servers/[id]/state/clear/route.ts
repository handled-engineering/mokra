import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: { id: string }
}

// POST - Clear state records (all, by endpoint, or by resource type)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { endpointId, resourceType, clearAll } = body

  // Verify mock server ownership
  const mockServer = await prisma.mockServer.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!mockServer) {
    return NextResponse.json({ error: "Mock server not found" }, { status: 404 })
  }

  // Build where clause
  const whereClause: {
    mockServerId: string
    endpointId?: string
    resourceType?: string
  } = {
    mockServerId: params.id,
  }

  if (!clearAll) {
    if (endpointId) {
      whereClause.endpointId = endpointId
    }
    if (resourceType) {
      whereClause.resourceType = resourceType
    }
  }

  const result = await prisma.mockState.deleteMany({
    where: whereClause,
  })

  return NextResponse.json({
    success: true,
    deletedCount: result.count,
  })
}
