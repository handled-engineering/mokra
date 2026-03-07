import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: { id: string }
}

// GET - Fetch all state records for a mock server, grouped by resource type
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  // Fetch all state records
  const states = await prisma.mockState.findMany({
    where: { mockServerId: params.id },
    orderBy: { updatedAt: "desc" },
  })

  // Group by resource type
  const grouped: Record<
    string,
    {
      resourceType: string
      records: Array<{
        id: string
        resourceId: string
        data: unknown
        createdAt: Date
        updatedAt: Date
      }>
    }
  > = {}

  for (const state of states) {
    const key = state.resourceType

    if (!grouped[key]) {
      grouped[key] = {
        resourceType: state.resourceType,
        records: [],
      }
    }

    grouped[key].records.push({
      id: state.id,
      resourceId: state.resourceId,
      data: state.data,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    })
  }

  return NextResponse.json({
    total: states.length,
    groups: Object.values(grouped),
  })
}

// DELETE - Delete a specific state record
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { stateId } = await req.json()

  if (!stateId) {
    return NextResponse.json({ error: "stateId is required" }, { status: 400 })
  }

  // Verify mock server ownership and state belongs to mock server
  const state = await prisma.mockState.findFirst({
    where: {
      id: stateId,
      mockServerId: params.id,
      mockServer: {
        userId: session.user.id,
      },
    },
  })

  if (!state) {
    return NextResponse.json({ error: "State not found" }, { status: 404 })
  }

  await prisma.mockState.delete({
    where: { id: stateId },
  })

  return NextResponse.json({ success: true })
}
