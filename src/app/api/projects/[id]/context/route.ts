import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { z } from "zod"

interface Props {
  params: { id: string }
}

const updateContextSchema = z.object({
  serviceContext: z.string().optional(),
  endpointContexts: z.array(z.object({
    endpointId: z.string(),
    context: z.string(),
  })).optional(),
})

export async function GET(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const project = await prisma.userProject.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      endpointContexts: true,
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({
    serviceContext: project.customContext,
    endpointContexts: project.endpointContexts,
  })
}

export async function PUT(req: Request, { params }: Props) {
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
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { serviceContext, endpointContexts } = updateContextSchema.parse(body)

    // Update service-level context
    if (serviceContext !== undefined) {
      await prisma.userProject.update({
        where: { id: params.id },
        data: { customContext: serviceContext || null },
      })
    }

    // Update endpoint-specific contexts
    if (endpointContexts) {
      for (const ec of endpointContexts) {
        if (ec.context.trim()) {
          await prisma.projectEndpointContext.upsert({
            where: {
              projectId_endpointId: {
                projectId: params.id,
                endpointId: ec.endpointId,
              },
            },
            update: { context: ec.context },
            create: {
              projectId: params.id,
              endpointId: ec.endpointId,
              context: ec.context,
            },
          })
        } else {
          // Delete if context is empty
          await prisma.projectEndpointContext.deleteMany({
            where: {
              projectId: params.id,
              endpointId: ec.endpointId,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating context:", error)
    return NextResponse.json(
      { error: "Failed to update context" },
      { status: 500 }
    )
  }
}
