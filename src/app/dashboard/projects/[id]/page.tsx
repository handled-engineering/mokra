import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyButton } from "./copy-button"
import { ContextEditor } from "./context-editor"
import { SavedResources } from "./saved-resources"

interface Props {
  params: { id: string }
}

export default async function ProjectDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const project = await prisma.userProject.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      service: {
        include: {
          endpoints: {
            orderBy: { path: "asc" },
          },
        },
      },
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

  if (!project) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const apiUrl = `${baseUrl}/api/mock/${project.service.slug}`

  const methodColors: Record<string, string> = {
    GET: "bg-green-100 text-green-800",
    POST: "bg-blue-100 text-blue-800",
    PUT: "bg-yellow-100 text-yellow-800",
    PATCH: "bg-orange-100 text-orange-800",
    DELETE: "bg-red-100 text-red-800",
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <p className="text-gray-600">{project.service.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* API Key */}
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Use these credentials to access your mock API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Base URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-gray-100 p-2 rounded">
                    {apiUrl}
                  </code>
                  <CopyButton text={apiUrl} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">API Key</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-gray-100 p-2 rounded font-mono">
                    {project.apiKey}
                  </code>
                  <CopyButton text={project.apiKey} />
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-2">Example Request</p>
                <pre className="text-xs bg-blue-100 p-2 rounded overflow-x-auto">
{`curl -X GET "${apiUrl}/customers" \\
  -H "X-API-Key: ${project.apiKey}"`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Custom Context */}
          <ContextEditor
            projectId={project.id}
            endpoints={project.service.endpoints}
            initialServiceContext={project.customContext}
            initialEndpointContexts={project.endpointContexts}
          />

          {/* Available Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle>Available Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {project.service.endpoints.map((endpoint) => (
                  <div
                    key={endpoint.id}
                    className="flex items-center gap-4 p-3 rounded-lg border"
                  >
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        methodColors[endpoint.method] || "bg-gray-100"
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono">{endpoint.path}</code>
                    {endpoint.description && (
                      <span className="text-sm text-gray-500 ml-auto">
                        {endpoint.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Request Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {project.requestLogs.length === 0 ? (
                <p className="text-center text-gray-600 py-8">
                  No requests yet. Start making API calls!
                </p>
              ) : (
                <div className="space-y-2">
                  {project.requestLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 p-2 rounded text-sm hover:bg-gray-50"
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.statusCode < 400
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.statusCode}
                      </span>
                      <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                        {log.method}
                      </span>
                      <span className="flex-1 truncate font-mono text-xs">
                        {log.path}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {log.duration}ms
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Resources - Full Width */}
          <SavedResources projectId={project.id} />
        </div>

        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Requests</span>
                <span className="font-semibold">{project.requestLogs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Saved Resources</span>
                <span className="font-semibold">{project.mockStates.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Endpoints</span>
                <span className="font-semibold">{project.service.endpoints.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Stateful Mode Info */}
          <Card>
            <CardHeader>
              <CardTitle>Stateful Mode</CardTitle>
              <CardDescription>
                How to use persistent state
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p className="text-gray-600">
                Add the header to enable stateful responses:
              </p>
              <code className="block bg-gray-100 p-2 rounded text-xs">
                X-Stateful: true
              </code>
              <ul className="text-gray-600 space-y-1 text-xs">
                <li>- POST creates new records</li>
                <li>- GET returns saved data or 404</li>
                <li>- PUT/PATCH updates existing</li>
                <li>- DELETE removes records</li>
              </ul>
              <p className="text-xs text-gray-500">
                Max 50 records per endpoint
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
