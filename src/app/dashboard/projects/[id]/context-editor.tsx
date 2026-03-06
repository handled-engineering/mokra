"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MockEndpoint } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react"

interface EndpointContext {
  endpointId: string
  context: string
}

interface Props {
  projectId: string
  endpoints: MockEndpoint[]
  initialServiceContext?: string | null
  initialEndpointContexts: Array<{ endpointId: string; context: string }>
}

export function ContextEditor({
  projectId,
  endpoints,
  initialServiceContext,
  initialEndpointContexts,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serviceContext, setServiceContext] = useState(initialServiceContext || "")
  const [endpointContexts, setEndpointContexts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const ec of initialEndpointContexts) {
      map[ec.endpointId] = ec.context
    }
    return map
  })
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleSave = async () => {
    setSaving(true)
    try {
      const endpointContextsList = Object.entries(endpointContexts).map(([endpointId, context]) => ({
        endpointId,
        context,
      }))

      const res = await fetch(`/api/projects/${projectId}/context`, {
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

  const methodColors: Record<string, string> = {
    GET: "bg-green-100 text-green-800",
    POST: "bg-blue-100 text-blue-800",
    PUT: "bg-yellow-100 text-yellow-800",
    PATCH: "bg-orange-100 text-orange-800",
    DELETE: "bg-red-100 text-red-800",
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-gray-500" />
            <CardTitle>Custom Context</CardTitle>
          </div>
          {isOpen ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
        </div>
        <CardDescription>
          Add custom instructions to control how responses are generated
        </CardDescription>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-6">
          {/* Service-level context */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Service-Level Context
            </label>
            <Textarea
              placeholder="Add custom instructions that apply to all endpoints. E.g., 'Always return dates in ISO format' or 'Use realistic Nigerian names'"
              value={serviceContext}
              onChange={(e) => setServiceContext(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              These instructions will be applied to all API responses
            </p>
          </div>

          {/* Endpoint-specific contexts */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Endpoint-Specific Context
            </label>
            <div className="space-y-2">
              {endpoints.map((endpoint) => (
                <div key={endpoint.id} className="border rounded-lg">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50"
                    onClick={() =>
                      setExpandedEndpoint(
                        expandedEndpoint === endpoint.id ? null : endpoint.id
                      )
                    }
                  >
                    {expandedEndpoint === endpoint.id ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        methodColors[endpoint.method] || "bg-gray-100"
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono">{endpoint.path}</code>
                    {endpointContexts[endpoint.id] && (
                      <span className="ml-auto text-xs text-blue-600">
                        Has custom context
                      </span>
                    )}
                  </button>
                  {expandedEndpoint === endpoint.id && (
                    <div className="px-3 pb-3">
                      <Textarea
                        placeholder={`Custom instructions for ${endpoint.method} ${endpoint.path}. E.g., 'Return exactly 5 items' or 'Include a discount field'`}
                        value={endpointContexts[endpoint.id] || ""}
                        onChange={(e) =>
                          setEndpointContexts((prev) => ({
                            ...prev,
                            [endpoint.id]: e.target.value,
                          }))
                        }
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Custom Context"}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
