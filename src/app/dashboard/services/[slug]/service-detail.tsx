"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Code2,
  Shield,
  Clock,
  Copy,
  Check,
  Layers,
} from "lucide-react"
import type { LoadedService, LoadedEndpoint } from "@/lib/services"

interface ServiceDetailProps {
  service: LoadedService
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800 border-emerald-200",
  POST: "bg-blue-100 text-blue-800 border-blue-200",
  PUT: "bg-amber-100 text-amber-800 border-amber-200",
  PATCH: "bg-orange-100 text-orange-800 border-orange-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
}

type Tab = "endpoints" | "details"

export function ServiceDetail({ service }: ServiceDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("endpoints")

  const tabs: { id: Tab; label: string }[] = [
    { id: "endpoints", label: "Endpoints" },
    { id: "details", label: "Details" },
  ]

  const isGraphQL = service.type === "graphql"

  return (
    <div className="flex gap-8 animate-fade-in">
      {/* Main Content */}
      <div className="min-w-0 flex-1">
        {/* Back Button */}
        <Link
          href="/dashboard/services"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Back to Services
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{service.name}</h1>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              /{service.slug}
            </code>
            {service.isActive && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {service.description || "No description available"}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {isGraphQL ? "GraphQL API" : `${service.endpoints.length} endpoints`}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
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
          <EndpointsTable endpoints={service.endpoints} isGraphQL={isGraphQL} />
        )}
        {activeTab === "details" && (
          <EndpointDetails endpoints={service.endpoints} />
        )}
      </div>

      {/* Right Sidebar */}
      <div className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-6 space-y-6">
          {/* Service Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-4 text-sm font-medium text-gray-900">Service Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-500">
                  <Code2 className="size-4" />
                  Endpoints
                </span>
                <span className="font-medium">{service.endpoints.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-500">
                  <Layers className="size-4" />
                  Type
                </span>
                <span className="font-medium capitalize">{service.type || "REST"}</span>
              </div>
              {service.version && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-500">
                    <Clock className="size-4" />
                    Version
                  </span>
                  <span className="font-medium">{service.version}</span>
                </div>
              )}
              {service.authentication && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-500">
                    <Shield className="size-4" />
                    Auth
                  </span>
                  <span className="font-medium capitalize">
                    {service.authentication.type}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Rate Limit Info */}
          {service.rateLimit?.enabled && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-4 text-sm font-medium text-gray-900">Rate Limiting</h3>
              <div className="text-sm">
                <span className="text-gray-500">Requests/minute: </span>
                <span className="font-medium">{service.rateLimit.requestsPerMinute}</span>
              </div>
            </div>
          )}

          {/* Create Mock Server CTA */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-blue-900">
              Ready to test?
            </h3>
            <p className="mb-3 text-xs text-blue-700">
              Create a mock server to start making API calls.
            </p>
            <Link href="/dashboard/services">
              <Button size="sm" className="w-full">
                Create Mock Server
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function EndpointsTable({
  endpoints,
  isGraphQL,
}: {
  endpoints: LoadedEndpoint[]
  isGraphQL: boolean
}) {
  if (endpoints.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-8 text-center">
        <p className="font-medium text-gray-500">No endpoints available</p>
        <p className="mt-1 text-sm text-gray-400">
          {isGraphQL
            ? "GraphQL schema operations will appear here."
            : "REST endpoints will appear here once configured."}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-2 text-left font-medium text-gray-500">
              {isGraphQL ? "Type" : "Method"}
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">
              {isGraphQL ? "Operation" : "Path"}
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((endpoint, idx) => (
            <tr
              key={`${endpoint.method}:${endpoint.path}`}
              className={idx !== endpoints.length - 1 ? "border-b border-gray-100" : ""}
            >
              <td className="px-4 py-2">
                <Badge className={METHOD_COLORS[endpoint.method]} variant="outline">
                  {endpoint.method}
                </Badge>
              </td>
              <td className="px-4 py-2">
                <code className="font-mono text-sm">{endpoint.path}</code>
              </td>
              <td className="px-4 py-2 text-gray-500">
                {endpoint.description || endpoint.summary || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EndpointDetails({ endpoints }: { endpoints: LoadedEndpoint[] }) {
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set())

  const toggleEndpoint = (key: string) => {
    const newExpanded = new Set(expandedEndpoints)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedEndpoints(newExpanded)
  }

  // Group endpoints by tags
  const taggedEndpoints = new Map<string, LoadedEndpoint[]>()
  const untaggedEndpoints: LoadedEndpoint[] = []

  for (const endpoint of endpoints) {
    if (endpoint.tags && endpoint.tags.length > 0) {
      const tag = endpoint.tags[0]
      if (!taggedEndpoints.has(tag)) {
        taggedEndpoints.set(tag, [])
      }
      taggedEndpoints.get(tag)!.push(endpoint)
    } else {
      untaggedEndpoints.push(endpoint)
    }
  }

  if (endpoints.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-8 text-center">
        <p className="font-medium text-gray-500">No endpoint details available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Endpoints by tag */}
      {Array.from(taggedEndpoints.entries()).map(([tag, tagEndpoints]) => (
        <div key={tag}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
            {tag}
          </h3>
          <div className="space-y-2">
            {tagEndpoints.map((endpoint) => (
              <EndpointCard
                key={`${endpoint.method}:${endpoint.path}`}
                endpoint={endpoint}
                expanded={expandedEndpoints.has(`${endpoint.method}:${endpoint.path}`)}
                onToggle={() => toggleEndpoint(`${endpoint.method}:${endpoint.path}`)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Untagged endpoints */}
      {untaggedEndpoints.length > 0 && (
        <div>
          {taggedEndpoints.size > 0 && (
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Other
            </h3>
          )}
          <div className="space-y-2">
            {untaggedEndpoints.map((endpoint) => (
              <EndpointCard
                key={`${endpoint.method}:${endpoint.path}`}
                endpoint={endpoint}
                expanded={expandedEndpoints.has(`${endpoint.method}:${endpoint.path}`)}
                onToggle={() => toggleEndpoint(`${endpoint.method}:${endpoint.path}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EndpointCard({
  endpoint,
  expanded,
  onToggle,
}: {
  endpoint: LoadedEndpoint
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50">
          {expanded ? (
            <ChevronDown className="size-4 text-gray-400" />
          ) : (
            <ChevronRight className="size-4 text-gray-400" />
          )}
          <Badge className={METHOD_COLORS[endpoint.method]} variant="outline">
            {endpoint.method}
          </Badge>
          <code className="flex-1 font-mono text-sm">{endpoint.path}</code>
          {endpoint.isStateful && (
            <Badge variant="secondary" className="text-xs">
              Stateful
            </Badge>
          )}
          {endpoint.summary && (
            <span className="hidden text-sm text-gray-500 md:block">
              {endpoint.summary}
            </span>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-8 mt-2 space-y-4 border-l-2 border-gray-200 p-4">
          {endpoint.description && (
            <p className="text-sm text-gray-600">{endpoint.description}</p>
          )}

          {/* Path Parameters */}
          {endpoint.pathParameters && Object.keys(endpoint.pathParameters).length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Path Parameters
              </h4>
              <div className="space-y-1">
                {Object.entries(endpoint.pathParameters).map(([name, param]) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5">{name}</code>
                    <span className="text-gray-400">{param.type}</span>
                    {param.description && (
                      <span className="text-gray-500">- {param.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Parameters */}
          {endpoint.queryParameters && Object.keys(endpoint.queryParameters).length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Query Parameters
              </h4>
              <div className="space-y-1">
                {Object.entries(endpoint.queryParameters).map(([name, param]) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5">{name}</code>
                    <span className="text-gray-400">{param.type}</span>
                    {!param.required && (
                      <Badge variant="outline" className="text-xs">
                        optional
                      </Badge>
                    )}
                    {param.default !== undefined && (
                      <span className="text-gray-400">
                        = {JSON.stringify(param.default)}
                      </span>
                    )}
                    {param.description && (
                      <span className="text-gray-500">- {param.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Schema */}
          {endpoint.requestSchema && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Request Body
              </h4>
              <JsonBlock data={endpoint.requestSchema} />
            </div>
          )}

          {/* Responses */}
          {endpoint.responses && Object.keys(endpoint.responses).length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Responses
              </h4>
              <div className="space-y-2">
                {Object.entries(endpoint.responses).map(([statusCode, response]) => (
                  <ResponseBlock
                    key={statusCode}
                    statusCode={parseInt(statusCode)}
                    response={response}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Constraints */}
          {endpoint.constraints && (
            <div className="rounded border border-yellow-200 bg-yellow-50 p-2 text-sm text-gray-600">
              <strong>Constraints:</strong> {endpoint.constraints}
            </div>
          )}

          {/* Notes */}
          {endpoint.notes && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-sm text-gray-600">
              <strong>Notes:</strong>
              <pre className="mt-1 whitespace-pre-wrap font-sans">{endpoint.notes}</pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ResponseBlock({
  statusCode,
  response,
}: {
  statusCode: number
  response: { body: unknown; headers?: Record<string, string> }
}) {
  const [expanded, setExpanded] = useState(statusCode >= 200 && statusCode < 300)

  const statusColor =
    statusCode >= 200 && statusCode < 300
      ? "text-green-600"
      : statusCode >= 400 && statusCode < 500
        ? "text-yellow-600"
        : "text-red-600"

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <div className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50">
          {expanded ? (
            <ChevronDown className="size-3 text-gray-400" />
          ) : (
            <ChevronRight className="size-3 text-gray-400" />
          )}
          <span className={`font-mono font-bold ${statusColor}`}>{statusCode}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 mt-1">
          {response.headers && Object.keys(response.headers).length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs text-gray-500">Headers:</p>
              <JsonBlock data={response.headers} />
            </div>
          )}
          {response.body !== undefined && response.body !== null && (
            <JsonBlock data={response.body} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function JsonBlock({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
        {json}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded bg-gray-700 p-1 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100"
      >
        {copied ? (
          <Check className="size-3 text-green-400" />
        ) : (
          <Copy className="size-3" />
        )}
      </button>
    </div>
  )
}
