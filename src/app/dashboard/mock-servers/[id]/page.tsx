import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { getServiceLoader } from "@/lib/services/loader"
import { MockServerDashboard } from "./mock-server-dashboard"

interface Props {
  params: { id: string }
}

export default async function MockServerDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const mockServer = await prisma.mockServer.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      service: true,
      requestLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      mockStates: {
        orderBy: { updatedAt: "desc" },
      },
      endpointContexts: true,
    },
  })

  if (!mockServer) {
    notFound()
  }

  // Load endpoints from filesystem
  const loader = getServiceLoader()
  const loadedService = await loader.loadService(mockServer.service.slug)
  const endpoints = loadedService?.endpoints ?? []
  const isGraphQL = loadedService?.type === "graphql"

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const apiUrl = `${baseUrl}/api/mock/${mockServer.service.slug}`

  return (
    <MockServerDashboard
      mockServer={{
        id: mockServer.id,
        name: mockServer.name,
        customContext: mockServer.customContext,
        service: {
          name: mockServer.service.name,
          slug: mockServer.service.slug,
        },
        requestLogs: mockServer.requestLogs.map((log) => ({
          id: log.id,
          method: log.method,
          path: log.path,
          statusCode: log.statusCode,
          duration: log.duration,
          createdAt: log.createdAt,
        })),
        mockStates: mockServer.mockStates.map((state) => ({
          id: state.id,
        })),
        endpointContexts: mockServer.endpointContexts.map((ctx) => ({
          path: ctx.path,
          context: ctx.context,
        })),
      }}
      endpoints={endpoints.map((e) => ({
        method: e.method,
        path: e.path,
        description: e.description,
      }))}
      isGraphQL={isGraphQL}
      apiUrl={apiUrl}
    />
  )
}
