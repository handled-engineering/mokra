import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { generateApiKey } from "@/lib/utils"
import { serverAnalytics } from "@/lib/mixpanel-server"

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  expiresAt: z.string().datetime().optional().nullable(),
  excludedMockServerIds: z.array(z.string()).optional().default([]),
})

function maskApiKey(key: string): string {
  if (key.length <= 8) return key
  return `${key.slice(0, 3)}${"*".repeat(key.length - 7)}${key.slice(-4)}`
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    include: {
      exclusions: {
        include: {
          mockServer: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Mask the keys in the response
  const maskedApiKeys = apiKeys.map((apiKey) => ({
    ...apiKey,
    key: maskApiKey(apiKey.key),
  }))

  return NextResponse.json({ apiKeys: maskedApiKeys })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, expiresAt, excludedMockServerIds } = createApiKeySchema.parse(body)

    // Check subscription limits for API keys
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    const apiKeyCount = await prisma.apiKey.count({
      where: { userId: session.user.id },
    })

    const limits: Record<string, number> = {
      FREE: 2,
      BASIC: 10,
      PRO: 100,
    }

    const plan = subscription?.plan || "FREE"
    const limit = limits[plan]
    if (apiKeyCount >= limit) {
      // Track limit reached
      serverAnalytics.limitReached(session.user.id, {
        limitType: "api_keys",
        currentPlan: plan,
        currentCount: apiKeyCount,
        limit,
      }, session.user.email)

      return NextResponse.json(
        { error: `API key limit reached. Upgrade your plan for more keys.` },
        { status: 403 }
      )
    }

    // Validate excluded mock server IDs belong to this user
    if (excludedMockServerIds.length > 0) {
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

    // Generate unique API key
    let key = generateApiKey()
    let existing = await prisma.apiKey.findUnique({ where: { key } })
    while (existing) {
      key = generateApiKey()
      existing = await prisma.apiKey.findUnique({ where: { key } })
    }

    // Create API key with exclusions in a transaction
    const apiKey = await prisma.$transaction(async (tx) => {
      const newApiKey = await tx.apiKey.create({
        data: {
          userId: session.user.id,
          key,
          name,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      })

      if (excludedMockServerIds.length > 0) {
        await tx.apiKeyExclusion.createMany({
          data: excludedMockServerIds.map((mockServerId) => ({
            apiKeyId: newApiKey.id,
            mockServerId,
          })),
        })
      }

      return newApiKey
    })

    // Track API key created
    serverAnalytics.apiKeyCreated(session.user.id, {
      name,
      hasExpiry: !!expiresAt,
      excludedServerCount: excludedMockServerIds.length,
    }, session.user.email)

    // Return the full key (only shown once)
    return NextResponse.json({
      apiKey: {
        ...apiKey,
        key, // Return unmasked key on creation
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating API key:", error)
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    )
  }
}
