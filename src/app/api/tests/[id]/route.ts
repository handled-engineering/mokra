import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { serverAnalytics } from "@/lib/mixpanel-server"

const stateRequirementSchema = z.object({
  id: z.string().optional(),
  mockServerId: z.string().min(1),
  resourceType: z.string().min(1),
  resourcePath: z.string().min(1),
  initialState: z.unknown(),
  description: z.string().optional(),
})

const assertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  sonataExpression: z.string().min(1),
  mockServerId: z.string().min(1),
  targetResourcePath: z.string().optional(),
  expectedResult: z.unknown().optional(),
})

const updateTestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  customInstructions: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  mockServerIds: z.array(z.string()).optional(),
  stateRequirements: z.array(stateRequirementSchema).optional(),
  asserts: z.array(assertSchema).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const test = await prisma.mockworldTest.findFirst({
    where: {
      id,
      userId: session.user.id,
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
      runs: {
        orderBy: { startedAt: "desc" },
        include: {
          assertResults: {
            include: {
              assert: true,
            },
          },
        },
      },
    },
  })

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 })
  }

  // Transform to match UI types
  const transformedTest = {
    id: test.id,
    name: test.name,
    description: test.description,
    setup: {
      services: test.mockServers.map((ms) => ({
        serviceSlug: ms.mockServer.service.slug,
        serviceName: ms.mockServer.service.name,
        mockServerId: ms.mockServerId,
        logoUrl: ms.mockServer.service.logoUrl,
      })),
      stateRequirements: test.stateRequirements.map((sr) => ({
        id: sr.id,
        mockServerId: sr.mockServerId,
        resourceType: sr.resourceType,
        resourcePath: sr.resourcePath,
        initialState: sr.initialState,
        description: sr.description,
      })),
      customInstructions: test.customInstructions || "",
    },
    asserts: test.asserts.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      sonataExpression: a.sonataExpression,
      mockServerId: a.mockServerId,
      targetResourcePath: a.targetResourcePath,
      expectedResult: a.expectedResult,
    })),
    runs: test.runs.map((r) => ({
      id: r.id,
      testId: r.testId,
      status: r.status.toLowerCase(),
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      duration: r.duration,
      assertResults: r.assertResults.map((ar) => ({
        assertId: ar.assertId,
        assertName: ar.assert.name,
        passed: ar.passed,
        actualValue: ar.actualValue,
        expectedValue: ar.expectedValue,
        error: ar.error,
      })),
      logs: r.logs ? r.logs.split("\n") : [],
      error: r.error,
    })),
    createdAt: test.createdAt,
    updatedAt: test.updatedAt,
    isActive: test.isActive,
  }

  return NextResponse.json({ test: transformedTest })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership
  const existingTest = await prisma.mockworldTest.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!existingTest) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 })
  }

  try {
    const body = await req.json()
    const data = updateTestSchema.parse(body)

    // If updating mock servers, verify ownership
    if (data.mockServerIds) {
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
    }

    // Use transaction for complex updates
    const test = await prisma.$transaction(async (tx) => {
      // Update basic fields
      await tx.mockworldTest.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          customInstructions: data.customInstructions,
          isActive: data.isActive,
        },
      })

      // Update mock servers if provided
      if (data.mockServerIds) {
        await tx.testMockServer.deleteMany({
          where: { testId: id },
        })
        await tx.testMockServer.createMany({
          data: data.mockServerIds.map((mockServerId) => ({
            testId: id,
            mockServerId,
          })),
        })
      }

      // Update state requirements if provided
      if (data.stateRequirements) {
        await tx.testStateRequirement.deleteMany({
          where: { testId: id },
        })
        await tx.testStateRequirement.createMany({
          data: data.stateRequirements.map((req) => ({
            testId: id,
            mockServerId: req.mockServerId,
            resourceType: req.resourceType,
            resourcePath: req.resourcePath,
            initialState: req.initialState as object,
            description: req.description,
          })),
        })
      }

      // Update asserts if provided
      if (data.asserts) {
        await tx.testAssert.deleteMany({
          where: { testId: id },
        })
        await tx.testAssert.createMany({
          data: data.asserts.map((assert) => ({
            testId: id,
            name: assert.name,
            description: assert.description,
            sonataExpression: assert.sonataExpression,
            mockServerId: assert.mockServerId,
            targetResourcePath: assert.targetResourcePath,
            expectedResult: assert.expectedResult as object | undefined,
          })),
        })
      }

      // Fetch updated test
      return tx.mockworldTest.findUnique({
        where: { id },
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
    })

    return NextResponse.json({ test })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating test:", error)
    return NextResponse.json(
      { error: "Failed to update test" },
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

  // Verify ownership
  const existingTest = await prisma.mockworldTest.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!existingTest) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 })
  }

  await prisma.mockworldTest.delete({
    where: { id },
  })

  // Track test deleted
  serverAnalytics.testDeleted(session.user.id, { testId: id }, session.user.email)

  return NextResponse.json({ success: true })
}
