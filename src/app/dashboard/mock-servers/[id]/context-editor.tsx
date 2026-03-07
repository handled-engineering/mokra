"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface Endpoint {
  method: string
  path: string
  description?: string | null
}

interface Props {
  mockServerId: string
  endpoints: Endpoint[]
  initialServiceContext?: string | null
  initialEndpointContexts: Array<{ path: string; context: string }>
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-600",
  POST: "text-blue-600",
  PUT: "text-amber-600",
  PATCH: "text-orange-600",
  DELETE: "text-red-600",
  Query: "text-emerald-600",
  Mutation: "text-blue-600",
}

export function ContextEditor({
  mockServerId,
  endpoints,
  initialServiceContext,
  initialEndpointContexts,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [serviceContext, setServiceContext] = useState(initialServiceContext || "")
  const [endpointContexts, setEndpointContexts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const ec of initialEndpointContexts) {
      map[ec.path] = ec.context
    }
    return map
  })
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleSave = async () => {
    setSaving(true)
    try {
      const endpointContextsList = Object.entries(endpointContexts).map(([path, context]) => ({
        path,
        context,
      }))

      const res = await fetch(`/api/mock-servers/${mockServerId}/context`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceContext,
          endpointContexts: endpointContextsList,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to save")
      }

      toast({
        title: "Saved",
        description: "Custom context updated successfully",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save custom context",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-3">Custom Context</h3>
      <p className="text-sm text-gray-500 mb-4">
        Add instructions to control how AI generates mock responses.
      </p>

      <div className="space-y-6">
        {/* Service-level context */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Service-level
          </label>
          <textarea
            placeholder="Instructions for all endpoints. E.g., 'Return dates in ISO format' or 'Use realistic names'"
            value={serviceContext}
            onChange={(e) => setServiceContext(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>

        {/* Endpoint-specific contexts */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Per-endpoint
          </label>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
            {endpoints.map((endpoint) => {
              const endpointKey = `${endpoint.method}:${endpoint.path}`
              const isExpanded = expandedEndpoint === endpointKey
              const hasContext = !!endpointContexts[endpoint.path]

              return (
                <div key={endpointKey}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                    onClick={() => setExpandedEndpoint(isExpanded ? null : endpointKey)}
                  >
                    <span className={`text-sm font-mono font-medium ${METHOD_COLORS[endpoint.method] || "text-gray-600"}`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono text-gray-700">{endpoint.path}</code>
                    {hasContext && (
                      <span className="ml-auto text-xs text-gray-400">configured</span>
                    )}
                    <svg
                      className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <textarea
                        placeholder={`Instructions for ${endpoint.method} ${endpoint.path}`}
                        value={endpointContexts[endpoint.path] || ""}
                        onChange={(e) =>
                          setEndpointContexts((prev) => ({
                            ...prev,
                            [endpoint.path]: e.target.value,
                          }))
                        }
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  )
}
