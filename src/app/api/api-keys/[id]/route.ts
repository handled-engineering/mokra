import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { serverAnalytics } from "@/lib/mixpanel-server"

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  excludedMockServerIds: z.array(z.string()).optional(),
})

function maskApiKey(key: string): string {
  if (key.length <= 8) return key
  return `${key.slice(0, 3)}${"*".repeat(key.length - 7)}${key.slice(-4)}`
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      exclusions: {
        include: {
          mockServer: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 })
  }

  return NextResponse.json({
    apiKey: {
      ...apiKey,
      key: maskApiKey(apiKey.key),
    },
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { name, expiresAt, excludedMockServerIds } = updateApiKeySchema.parse(body)

    // Check ownership
    const existingApiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingApiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    // Validate excluded mock server IDs if provided
    if (excludedMockServerIds !== undefined && excludedMockServerIds.length > 0) {
      const validMockServers = await prisma.mockServer.findMany({
        where: {
          id: { in: excludedMockServerIds },
          userId: session.user.id,
        },
        select: { id: true },
      })

      if (validMockServers.length !== excludedMockServerIds.length) {
        return NextResponse.json(
          { error: "One or more mock servers not found" },
          { status: 400 }
        )
      }
    }

    // Update API key and exclusions in a transaction
    const apiKey = await prisma.$transaction(async (tx) => {
      // Update the API key fields
      const updatedApiKey = await tx.apiKey.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        },
      })

      // Update exclusions if provided
      if (excludedMockServerIds !== undefined) {
        // Delete existing exclusions
        await tx.apiKeyExclusion.deleteMany({
          where: { apiKeyId: id },
        })

        // Create new exclusions
        if (excludedMockServerIds.length > 0) {
          await tx.apiKeyExclusion.createMany({
            data: excludedMockServerIds.map((mockServerId) => ({
              apiKeyId: id,
              mockServerId,
            })),
          })
        }
      }

      return updatedApiKey
    })

    // Fetch the updated API key with exclusions
    const fullApiKey = await prisma.apiKey.findUnique({
      where: { id },
      include: {
        exclusions: {
          include: {
            mockServer: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      apiKey: {
        ...fullApiKey,
        key: maskApiKey(fullApiKey!.key),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating API key:", error)
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Check ownership
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 })
  }

  // Delete will cascade to exclusions
  await prisma.apiKey.delete({
    where: { id },
  })

  // Track API key deleted
  serverAnalytics.apiKeyDeleted(session.user.id, session.user.email)

  return NextResponse.json({ success: true })
}
