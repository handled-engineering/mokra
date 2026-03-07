import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { serverAnalytics } from "@/lib/mixpanel-server"

const stateRequirementSchema = z.object({
  mockServerId: z.string().min(1),
  resourceType: z.string().min(1),
  resourcePath: z.string().min(1),
  initialState: z.unknown(),
  description: z.string().optional(),
})

const assertSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sonataExpression: z.string().min(1),
  mockServerId: z.string().min(1),
  targetResourcePath: z.string().optional(),
  expectedResult: z.unknown().optional(),
})

const createTestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  customInstructions: z.string().optional(),
  mockServerIds: z.array(z.string()).min(1, "At least one mock server is required"),
  stateRequirements: z.array(stateRequirementSchema).optional(),
  asserts: z.array(assertSchema).optional(),
})

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  const tests = await prisma.mockworldTest.findMany({
    where: {
      userId: session.user.id,
      ...(status && {
        runs: {
          some: {
            status: status.toUpperCase() as "PENDING" | "RUNNING" | "PASSED" | "FAILED",
          },
        },
      }),
    },
    include: {
      mockServers: {
        include: {
          mockServer: {
            include: {
              service: true,
            },
          },
        },
      },
      asserts: true,
      runs: {
        orderBy: { startedAt: "desc" },
        take: 10,
        include: {
          assertResults: true,
        },
      },
      _count: {
        select: {
          runs: true,
          asserts: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  // Transform to match the UI types
  const transformedTests = tests.map((test) => {
    const recentRuns = test.runs.map((r) => r.status.toLowerCase())
    const lastRun = test.runs[0]

    return {
      id: test.id,
      name: test.name,
      description: test.description,
      runCount: test._count.runs,
      passedCount: test.runs.filter((r) => r.status === "PASSED").length,
      failedCount: test.runs.filter((r) => r.status === "FAILED").length,
      pendingCount: test.runs.filter((r) => r.status === "PENDING").length,
      runningCount: test.runs.filter((r) => r.status === "RUNNING").length,
      expectedCount: test._count.asserts,
      lastRunStatus: lastRun?.status.toLowerCase(),
      lastRunAt: lastRun?.completedAt || lastRun?.startedAt,
      isActive: test.isActive,
      recentRuns,
      services: test.mockServers.map((ms) => ({
        serviceSlug: ms.mockServer.service.slug,
        serviceName: ms.mockServer.service.name,
        logoUrl: ms.mockServer.service.logoUrl,
      })),
    }
  })

  return NextResponse.json({ tests: transformedTests })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createTestSchema.parse(body)

    // Verify all mock servers belong to user
    const mockServers = await prisma.mockServer.findMany({
      where: {
        id: { in: data.mockServerIds },
        userId: session.user.id,
      },
    })

    if (mockServers.length !== data.mockServerIds.length) {
      return NextResponse.json(
        { error: "One or more mock servers not found or not owned by user" },
        { status: 400 }
      )
    }

    const test = await prisma.mockworldTest.create({
      data: {
        userId: session.user.id,
        name: data.name,
        description: data.description,
        customInstructions: data.customInstructions,
        mockServers: {
          create: data.mockServerIds.map((mockServerId) => ({
            mockServerId,
          })),
        },
        stateRequirements: data.stateRequirements
          ? {
              create: data.stateRequirements.map((req) => ({
                mockServerId: req.mockServerId,
                resourceType: req.resourceType,
                resourcePath: req.resourcePath,
                initialState: req.initialState as object,
                description: req.description,
              })),
            }
          : undefined,
        asserts: data.asserts
          ? {
              create: data.asserts.map((assert) => ({
                name: assert.name,
                description: assert.description,
                sonataExpression: assert.sonataExpression,
                mockServerId: assert.mockServerId,
                targetResourcePath: assert.targetResourcePath,
                expectedResult: assert.expectedResult as object | undefined,
              })),
            }
          : undefined,
      },
      include: {
        mockServers: {
          include: {
            mockServer: {
              include: {
                service: true,
              },
            },
          },
        },
        stateRequirements: true,
        asserts: true,
      },
    })

    // Track test created
    serverAnalytics.testCreated(session.user.id, {
      testId: test.id,
      name: data.name,
      mockServerCount: data.mockServerIds.length,
      assertionCount: data.asserts?.length || 0,
    }, session.user.email)

    return NextResponse.json({ test }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating test:", error)
    return NextResponse.json(
      { error: "Failed to create test" },
      { status: 500 }
    )
  }
}
