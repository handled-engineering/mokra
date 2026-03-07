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
    path: z.string(),
    context: z.string(),
  })).optional(),
})

export async function GET(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mockServer = await prisma.mockServer.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      endpointContexts: true,
    },
  })

  if (!mockServer) {
    return NextResponse.json({ error: "Mock server not found" }, { status: 404 })
  }

  return NextResponse.json({
    serviceContext: mockServer.customContext,
    endpointContexts: mockServer.endpointContexts,
  })
}

export async function PUT(req: Request, { params }: Props) {
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

  try {
    const body = await req.json()
    const { serviceContext, endpointContexts } = updateContextSchema.parse(body)

    // Update service-level context
    if (serviceContext !== undefined) {
      await prisma.mockServer.update({
        where: { id: params.id },
        data: { customContext: serviceContext || null },
      })
    }

    // Update endpoint-specific contexts
    if (endpointContexts) {
      for (const ec of endpointContexts) {
        if (ec.context.trim()) {
          await prisma.mockServerEndpointContext.upsert({
            where: {
              mockServerId_path: {
                mockServerId: params.id,
                path: ec.path,
              },
            },
            update: { context: ec.context },
            create: {
              mockServerId: params.id,
              path: ec.path,
              context: ec.context,
            },
          })
        } else {
          // Delete if context is empty
          await prisma.mockServerEndpointContext.deleteMany({
            where: {
              mockServerId: params.id,
              path: ec.path,
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
