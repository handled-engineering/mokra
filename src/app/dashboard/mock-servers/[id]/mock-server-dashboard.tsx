"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ContextEditor } from "./context-editor"
import { SavedResources } from "./saved-resources"

interface Endpoint {
  method: string
  path: string
  description?: string | null
}

interface RequestLog {
  id: string
  method: string
  path: string
  statusCode: number
  duration: number
  createdAt: Date
}

interface EndpointContext {
  path: string
  context: string
}

interface MockServerDashboardProps {
  mockServer: {
    id: string
    name: string
    customContext: string | null
    service: {
      name: string
      slug: string
    }
    requestLogs: RequestLog[]
    mockStates: Array<{ id: string }>
    endpointContexts: EndpointContext[]
  }
  endpoints: Endpoint[]
  isGraphQL: boolean
  apiUrl: string
}

type Tab = "endpoints" | "usage" | "logs" | "state" | "settings"

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-600",
  POST: "text-blue-600",
  PUT: "text-amber-600",
  PATCH: "text-orange-600",
  DELETE: "text-red-600",
  Query: "text-emerald-600",
  Mutation: "text-blue-600",
}

export function MockServerDashboard({
  mockServer,
  endpoints,
  isGraphQL,
  apiUrl,
}: MockServerDashboardProps) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") as Tab | null
  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab && ["endpoints", "usage", "logs", "state", "settings"].includes(initialTab)
      ? initialTab
      : "endpoints"
  )
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "endpoints", label: "Endpoints" },
    { id: "usage", label: "Usage Example" },
    { id: "logs", label: "Logs" },
    { id: "state", label: "State" },
    { id: "settings", label: "Settings" },
  ]

  // Calculate stats
  const totalRequests = mockServer.requestLogs.length
  const successfulRequests = mockServer.requestLogs.filter(log => log.statusCode < 400).length
  const failedRequests = totalRequests - successfulRequests
  const avgResponseTime = totalRequests > 0
    ? Math.round(mockServer.requestLogs.reduce((sum, log) => sum + log.duration, 0) / totalRequests)
    : 0
  const savedStates = mockServer.mockStates.length

  return (
    <div className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Back Link */}
        <Link
          href="/dashboard/mock-servers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Back to Mock Servers
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-gray-900">{mockServer.name}</h1>
            <span className="text-sm text-gray-500">{mockServer.service.name}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {isGraphQL ? "GraphQL API" : `${endpoints.length} endpoints`}
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "endpoints" && (
          <div>
            {endpoints.length === 0 ? (
              <div className="border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500 font-medium">No endpoints available</p>
                <p className="text-sm text-gray-400 mt-1">
                  {isGraphQL ? "GraphQL schema operations will appear here." : "REST endpoints will appear here once configured."}
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 font-medium text-gray-500">
                        {isGraphQL ? "Type" : "Method"}
                      </th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">
                        {isGraphQL ? "Operation" : "Path"}
                      </th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {endpoints.map((endpoint) => (
                      <tr key={`${endpoint.method}:${endpoint.path}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`font-mono font-medium ${METHOD_COLORS[endpoint.method] || "text-gray-600"}`}>
                            {endpoint.method}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="font-mono text-gray-900">{endpoint.path}</code>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {endpoint.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "usage" && (
          <div className="space-y-6">
            {/* Base URL */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Base URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                  {apiUrl}
                </code>
                <button
                  onClick={() => copy(apiUrl, "url")}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded hover:bg-gray-50"
                >
                  {copied === "url" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Server ID */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Server ID
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                  {mockServer.id}
                </code>
                <button
                  onClick={() => copy(mockServer.id, "id")}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded hover:bg-gray-50"
                >
                  {copied === "id" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* cURL Example */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                cURL Example
              </label>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">{`curl ${apiUrl}${isGraphQL ? "/graphql" : endpoints[0]?.path || "/example"} \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-Mock-Server-Id: ${mockServer.id}"${isGraphQL ? ` \\
  -H "Content-Type: application/json" \\
  -d '{"query": "..."}'` : ""}`}</pre>
              </div>
            </div>

            {/* JavaScript/Fetch Example */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                JavaScript (Fetch)
              </label>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">{`const response = await fetch("${apiUrl}${isGraphQL ? "/graphql" : endpoints[0]?.path || "/example"}", {
  headers: {
    "X-API-Key": "YOUR_API_KEY",
    "X-Mock-Server-Id": "${mockServer.id}"${isGraphQL ? `,
    "Content-Type": "application/json"` : ""}
  }${isGraphQL ? `,
  method: "POST",
  body: JSON.stringify({ query: "..." })` : ""}
});

const data = await response.json();`}</pre>
              </div>
            </div>

            {/* Headers Reference */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Required Headers</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs shrink-0">X-API-Key</code>
                  <div>
                    <span className="text-red-600 text-xs font-medium">Required</span>
                    <p className="text-gray-500 mt-0.5">
                      Your API key for authentication. <a href="/dashboard/api-keys" className="text-blue-600 hover:underline">Get your API key</a>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs shrink-0">X-Mock-Server-Id</code>
                  <div>
                    <span className="text-gray-500 text-xs font-medium">Optional</span>
                    <p className="text-gray-500 mt-0.5">Required when you have multiple servers for this service</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs shrink-0">X-Stateful</code>
                  <div>
                    <span className="text-gray-500 text-xs font-medium">Optional</span>
                    <p className="text-gray-500 mt-0.5">Set to &quot;true&quot; to enable stateful mode and persist data across requests</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {activeTab === "logs" && (
        <div>
          {mockServer.requestLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="font-medium">No requests yet</p>
              <p className="text-sm mt-1">Make API calls to see them logged here.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Method</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Path</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Duration</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockServer.requestLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`font-mono ${log.statusCode < 400 ? "text-emerald-600" : "text-red-600"}`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono ${METHOD_COLORS[log.method] || "text-gray-600"}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="font-mono text-gray-900">{log.path}</code>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {log.duration}ms
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "state" && (
        <SavedResources mockServerId={mockServer.id} />
      )}

      {activeTab === "settings" && (
        <div className="space-y-8">
          <ContextEditor
            mockServerId={mockServer.id}
            endpoints={endpoints}
            initialServiceContext={mockServer.customContext}
            initialEndpointContexts={mockServer.endpointContexts}
          />

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Stateful Mode</h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                Enable persistent state for CRUD operations by adding this header:
              </p>
              <code className="block bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-900">
                X-Stateful: true
              </code>
              <div className="mt-4 text-sm text-gray-500">
                <p>POST creates records, GET retrieves them, PUT/PATCH updates, DELETE removes.</p>
                <p className="mt-1">Max 50 records per endpoint. Clear from the State tab.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Right Sidebar - Stats Dashboard */}
      <div className="w-72 shrink-0 space-y-4">
        <h2 className="text-sm font-medium text-gray-900">Overview</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Requests */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Total Requests</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{totalRequests}</p>
          </div>

          {/* Success Rate */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Success Rate</p>
            <p className="text-2xl font-semibold text-emerald-600 mt-1">
              {totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0}%
            </p>
          </div>

          {/* Avg Response Time */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Avg Response</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{avgResponseTime}<span className="text-sm font-normal text-gray-500">ms</span></p>
          </div>

          {/* Saved States */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Saved States</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{savedStates}</p>
          </div>
        </div>

        {/* Request Breakdown */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Request Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600">Successful</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{successfulRequests}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">Failed</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{failedRequests}</span>
            </div>
          </div>
          {totalRequests > 0 && (
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(successfulRequests / totalRequests) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Endpoints Summary */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Endpoints</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{isGraphQL ? "Operations" : "REST Endpoints"}</span>
            <span className="text-sm font-medium text-gray-900">{endpoints.length}</span>
          </div>
          {!isGraphQL && endpoints.length > 0 && (
            <div className="mt-3 space-y-1">
              {Object.entries(
                endpoints.reduce((acc, ep) => {
                  acc[ep.method] = (acc[ep.method] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([method, count]) => (
                <div key={method} className="flex items-center justify-between text-xs">
                  <span className={`font-mono font-medium ${METHOD_COLORS[method] || "text-gray-600"}`}>{method}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Quick Copy</h3>
          <div className="space-y-2">
            <button
              onClick={() => copy(apiUrl, "url")}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <span className="text-gray-600">Base URL</span>
              <span className="text-xs text-gray-400">{copied === "url" ? "Copied!" : "Click to copy"}</span>
            </button>
            <button
              onClick={() => copy(mockServer.id, "id")}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <span className="text-gray-600">Server ID</span>
              <span className="text-xs text-gray-400">{copied === "id" ? "Copied!" : "Click to copy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
