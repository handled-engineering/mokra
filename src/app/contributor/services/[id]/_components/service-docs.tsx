"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  AlertCircle,
  BookOpen,
  Code,
  Copy,
  Check,
} from "lucide-react"
import type { GeneratedDocs, EndpointDocs, FileNode } from "@/lib/services"

interface ServiceDocsProps {
  serviceId: string
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-100 text-green-800 border-green-200",
  POST: "bg-blue-100 text-blue-800 border-blue-200",
  PUT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PATCH: "bg-orange-100 text-orange-800 border-orange-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
}

export function ServiceDocs({ serviceId }: ServiceDocsProps) {
  const [docs, setDocs] = useState<GeneratedDocs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<unknown>(null)
  const [activeTab, setActiveTab] = useState<"endpoints" | "files">("endpoints")

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch(`/api/contributor/services/${serviceId}/docs`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.message || data.error)
          setHint(data.hint)
          return
        }

        setDocs(data.docs)
      } catch (err) {
        setError("Failed to load documentation")
      } finally {
        setLoading(false)
      }
    }

    fetchDocs()
  }, [serviceId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading documentation...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            File-Based Documentation
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        {hint !== null && hint !== undefined && (
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              To enable file-based documentation, create the following structure:
            </p>
            <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(hint, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>
    )
  }

  if (!docs) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Generated Documentation
            </CardTitle>
            <CardDescription>
              Auto-generated from service files
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "endpoints" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("endpoints")}
            >
              <Code className="h-4 w-4 mr-2" />
              Endpoints
            </Button>
            <Button
              variant={activeTab === "files" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("files")}
            >
              <Folder className="h-4 w-4 mr-2" />
              File Structure
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "endpoints" ? (
          <EndpointsView docs={docs} />
        ) : (
          <FileStructureView nodes={docs.fileStructure} />
        )}
      </CardContent>
    </Card>
  )
}

function EndpointsView({ docs }: { docs: GeneratedDocs }) {
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
  const taggedEndpoints = new Map<string, EndpointDocs[]>()
  const untaggedEndpoints: EndpointDocs[] = []

  for (const endpoint of docs.endpoints) {
    if (endpoint.tags.length > 0) {
      const tag = endpoint.tags[0]
      if (!taggedEndpoints.has(tag)) {
        taggedEndpoints.set(tag, [])
      }
      taggedEndpoints.get(tag)!.push(endpoint)
    } else {
      untaggedEndpoints.push(endpoint)
    }
  }

  return (
    <div className="space-y-6">
      {/* Service Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500">Version</p>
          <p className="font-medium">{docs.service.version}</p>
        </div>
        {docs.service.baseUrl && (
          <div>
            <p className="text-xs text-gray-500">Base URL</p>
            <code className="text-sm">{docs.service.baseUrl}</code>
          </div>
        )}
        {docs.service.authentication && (
          <div>
            <p className="text-xs text-gray-500">Auth</p>
            <p className="font-medium capitalize">{docs.service.authentication.type}</p>
          </div>
        )}
        {docs.service.rateLimit?.enabled && (
          <div>
            <p className="text-xs text-gray-500">Rate Limit</p>
            <p className="font-medium">{docs.service.rateLimit.requestsPerMinute}/min</p>
          </div>
        )}
      </div>

      {/* Endpoints by tag */}
      {Array.from(taggedEndpoints.entries()).map(([tag, endpoints]) => (
        <div key={tag}>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            {tag}
          </h3>
          <div className="space-y-2">
            {endpoints.map((endpoint) => (
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
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
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
  endpoint: EndpointDocs
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <Badge className={METHOD_COLORS[endpoint.method]} variant="outline">
            {endpoint.method}
          </Badge>
          <code className="text-sm font-mono flex-1">{endpoint.path}</code>
          {endpoint.isStateful && (
            <Badge variant="secondary" className="text-xs">
              Stateful
            </Badge>
          )}
          {endpoint.summary && (
            <span className="text-sm text-gray-500 hidden md:block">
              {endpoint.summary}
            </span>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-8 mt-2 p-4 border-l-2 border-gray-200 space-y-4">
          {endpoint.description && (
            <p className="text-sm text-gray-600">{endpoint.description}</p>
          )}

          {/* Path Parameters */}
          {endpoint.pathParameters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Path Parameters
              </h4>
              <div className="space-y-1">
                {endpoint.pathParameters.map((param) => (
                  <div
                    key={param.name}
                    className="flex items-center gap-2 text-sm"
                  >
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                      {param.name}
                    </code>
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
          {endpoint.queryParameters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Query Parameters
              </h4>
              <div className="space-y-1">
                {endpoint.queryParameters.map((param) => (
                  <div
                    key={param.name}
                    className="flex items-center gap-2 text-sm"
                  >
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                      {param.name}
                    </code>
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

          {/* Request Body */}
          {endpoint.requestBody && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Request Body
              </h4>
              <JsonBlock data={endpoint.requestBody.example} />
            </div>
          )}

          {/* Responses */}
          {endpoint.responses.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Responses
              </h4>
              <div className="space-y-2">
                {endpoint.responses.map((response) => (
                  <ResponseBlock key={response.statusCode} response={response} />
                ))}
              </div>
            </div>
          )}

          {/* Constraints */}
          {endpoint.constraints && (
            <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
              <strong>Constraints:</strong> {endpoint.constraints}
            </div>
          )}

          {/* Notes */}
          {endpoint.notes && (
            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
              <strong>Notes:</strong>
              <pre className="mt-1 whitespace-pre-wrap font-sans">
                {endpoint.notes}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ResponseBlock({ response }: { response: EndpointDocs["responses"][0] }) {
  const [expanded, setExpanded] = useState(response.statusCode >= 200 && response.statusCode < 300)

  const statusColor =
    response.statusCode >= 200 && response.statusCode < 300
      ? "text-green-600"
      : response.statusCode >= 400 && response.statusCode < 500
      ? "text-yellow-600"
      : "text-red-600"

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-400" />
          )}
          <span className={`font-mono font-bold ${statusColor}`}>
            {response.statusCode}
          </span>
          <span className="text-sm text-gray-500">{response.description}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 mt-1">
          {response.headers && Object.keys(response.headers).length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Headers:</p>
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
    <div className="relative group">
      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
        {json}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1 rounded bg-gray-700 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  )
}

function FileStructureView({ nodes }: { nodes: FileNode[] }) {
  return (
    <div className="font-mono text-sm">
      {nodes.map((node) => (
        <FileTreeNode key={node.path} node={node} depth={0} />
      ))}
    </div>
  )
}

function FileTreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 3)

  const isFolder = node.type === "folder"
  const hasChildren = isFolder && node.children && node.children.length > 0

  const Icon = isFolder
    ? expanded
      ? FolderOpen
      : Folder
    : node.name.endsWith(".json")
    ? FileJson
    : FileText

  const iconColor = isFolder
    ? "text-blue-500"
    : node.name.endsWith(".json")
    ? "text-yellow-500"
    : "text-gray-500"

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 ${
          hasChildren ? "cursor-pointer" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <span className="w-4 h-4 flex items-center justify-center">
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-gray-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400" />
            )}
          </span>
        )}
        {!hasChildren && <span className="w-4" />}
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span>{node.name}</span>
      </div>
      {expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
