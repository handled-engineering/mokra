import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export interface OnboardingProgress {
  step1: boolean // Has MockServer
  step2: boolean // Has ApiKey
  step3: boolean // Has RequestLog
  step4: boolean // Has MockworldTest with mockServer and assertion
  dismissed: boolean
}

const updateSchema = z.object({
  dismissed: z.boolean(),
})

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // Query all progress data in parallel
  const [user, mockServerCount, apiKeyCount, requestLogCount, completeTest] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { onboardingDismissed: true },
      }),
      prisma.mockServer.count({ where: { userId } }),
      prisma.apiKey.count({ where: { userId } }),
      prisma.requestLog.count({
        where: { mockServer: { userId } },
      }),
      prisma.mockworldTest.findFirst({
        where: {
          userId,
          mockServers: { some: {} },
          asserts: { some: {} },
        },
      }),
    ])

  const progress: OnboardingProgress = {
    step1: mockServerCount > 0,
    step2: apiKeyCount > 0,
    step3: requestLogCount > 0,
    step4: !!completeTest,
    dismissed: user?.onboardingDismissed ?? false,
  }

  // Determine current step (first incomplete)
  let currentStep: number | null = null
  if (!progress.step1) currentStep = 1
  else if (!progress.step2) currentStep = 2
  else if (!progress.step3) currentStep = 3
  else if (!progress.step4) currentStep = 4

  return NextResponse.json({ progress, currentStep })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { dismissed } = updateSchema.parse(body)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingDismissed: dismissed },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error updating onboarding status:", error)
    return NextResponse.json(
      { error: "Failed to update onboarding status" },
      { status: 500 }
    )
  }
}
