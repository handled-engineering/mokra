import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { DashboardContent } from "./dashboard-content"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const userId = session.user.id

  // Get date for "today" stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    mockServers,
    recentRequests,
    totalRequests,
    requestsToday,
    allRequestLogs,
    user,
    apiKeyCount,
    requestLogCount,
    completeTest,
  ] = await Promise.all([
    prisma.mockServer.findMany({
      where: { userId: session.user.id },
      include: {
        service: true,
        _count: {
          select: { requestLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.requestLog.findMany({
      where: {
        mockServer: {
          userId: session.user.id,
        },
      },
      include: {
        mockServer: {
          include: { service: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.requestLog.count({
      where: {
        mockServer: {
          userId: session.user.id,
        },
      },
    }),
    prisma.requestLog.count({
      where: {
        mockServer: {
          userId: session.user.id,
        },
        createdAt: {
          gte: today,
        },
      },
    }),
    prisma.requestLog.findMany({
      where: {
        mockServer: {
          userId: session.user.id,
        },
      },
      select: {
        statusCode: true,
        duration: true,
      },
      take: 1000,
    }),
    // Onboarding data
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingDismissed: true },
    }),
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

  // Calculate metrics
  const successfulRequests = allRequestLogs.filter((r) => r.statusCode < 400).length
  const successRate = allRequestLogs.length > 0
    ? Math.round((successfulRequests / allRequestLogs.length) * 100)
    : 0

  const avgResponseTime = allRequestLogs.length > 0
    ? Math.round(allRequestLogs.reduce((sum, r) => sum + r.duration, 0) / allRequestLogs.length)
    : 0

  // Count unique services
  const uniqueServices = new Set(mockServers.map((ms) => ms.service.id)).size

  // Compute onboarding progress
  const onboardingProgress = {
    step1: mockServers.length > 0,
    step2: apiKeyCount > 0,
    step3: requestLogCount > 0,
    step4: !!completeTest,
    dismissed: user?.onboardingDismissed ?? false,
  }

  // Get first mock server info for onboarding
  const firstMockServer = mockServers[0]
  const mockServerEndpoint = firstMockServer
    ? `https://api.mokra.ai/mock/${firstMockServer.service.slug}/${firstMockServer.id}`
    : undefined
  const firstMockServerId = firstMockServer?.id

  return (
    <DashboardContent
      onboardingProgress={onboardingProgress}
      mockServerEndpoint={mockServerEndpoint}
      firstMockServerId={firstMockServerId}
      mockServers={mockServers.map((ms) => ({
        id: ms.id,
        name: ms.name,
        serviceName: ms.service.name,
        serviceLogoUrl: ms.service.logoUrl,
        requestCount: ms._count.requestLogs,
      }))}
      recentRequests={recentRequests.map((log) => ({
        id: log.id,
        method: log.method,
        path: log.path,
        statusCode: log.statusCode,
        duration: log.duration,
        createdAt: log.createdAt,
        serviceName: log.mockServer.service.name,
        serviceLogoUrl: log.mockServer.service.logoUrl,
      }))}
      stats={{
        totalServers: mockServers.length,
        totalRequests,
        requestsToday,
        uniqueServices,
        successRate,
        avgResponseTime,
        successfulRequests,
        failedRequests: allRequestLogs.length - successfulRequests,
        totalLogged: allRequestLogs.length,
      }}
    />
  )
}
