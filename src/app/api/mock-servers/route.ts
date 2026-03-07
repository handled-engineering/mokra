import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { serverAnalytics } from "@/lib/mixpanel-server"

const createMockServerSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  name: z.string().min(1, "Name is required"),
})

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mockServers = await prisma.mockServer.findMany({
    where: { userId: session.user.id },
    include: {
      service: true,
      _count: {
        select: {
          requestLogs: true,
          mockStates: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ mockServers })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { serviceId, name } = createMockServerSchema.parse(body)

    // Check if service exists and is active
    const service = await prisma.mockService.findFirst({
      where: { id: serviceId, isActive: true },
    })

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or inactive" },
        { status: 404 }
      )
    }

    // Check subscription limits (basic plan = 3 mock servers, pro = unlimited)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    const mockServerCount = await prisma.mockServer.count({
      where: { userId: session.user.id },
    })

    const limits: Record<string, number> = {
      FREE: 10,
      BASIC: 50,
      PRO: 1000,
    }

    const plan = subscription?.plan || "FREE"
    const limit = limits[plan]
    if (mockServerCount >= limit) {
      // Track limit reached
      serverAnalytics.limitReached(session.user.id, {
        limitType: "mock_servers",
        currentPlan: plan,
        currentCount: mockServerCount,
        limit,
      }, session.user.email)

      return NextResponse.json(
        { error: `Mock server limit reached. Upgrade your plan for more servers.` },
        { status: 403 }
      )
    }

    const mockServer = await prisma.mockServer.create({
      data: {
        userId: session.user.id,
        serviceId,
        name,
      },
      include: {
        service: true,
      },
    })

    serverAnalytics.mockServerCreated(session.user.id, {
      serverId: mockServer.id,
      serviceName: mockServer.service.name,
      serviceSlug: mockServer.service.slug,
    }, session.user.email)

    return NextResponse.json({ mockServer })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating mock server:", error)
    return NextResponse.json(
      { error: "Failed to create mock server" },
      { status: 500 }
    )
  }
}
