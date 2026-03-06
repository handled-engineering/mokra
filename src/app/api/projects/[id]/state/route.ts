import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface RouteParams {
  params: { id: string }
}

// GET - Fetch all state records for a project, grouped by endpoint
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify project ownership
  const project = await prisma.userProject.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      service: {
        include: {
          endpoints: true,
        },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Fetch all state records
  const states = await prisma.mockState.findMany({
    where: { projectId: params.id },
    orderBy: { updatedAt: "desc" },
  })

  // Group by endpoint and resource type
  const grouped: Record<
    string,
    {
      endpointId: string
      endpointPath: string | null
      endpointMethod: string | null
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
    const key = `${state.endpointId}:${state.resourceType}`

    if (!grouped[key]) {
      // Find matching endpoint
      const endpoint = project.service.endpoints.find((e) => e.id === state.endpointId)

      grouped[key] = {
        endpointId: state.endpointId,
        endpointPath: endpoint?.path || null,
        endpointMethod: endpoint?.method || null,
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

  // Verify project ownership and state belongs to project
  const state = await prisma.mockState.findFirst({
    where: {
      id: stateId,
      projectId: params.id,
      project: {
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
