/**
 * Documentation generator for file-based services
 * Generates structured documentation from LoadedService data
 */

import { LoadedService, LoadedEndpoint, ParameterDefinition } from "./types"

// ============================================================================
// Documentation Types
// ============================================================================

export interface GeneratedDocs {
  service: ServiceDocs
  endpoints: EndpointDocs[]
  fileStructure: FileNode[]
}

export interface ServiceDocs {
  name: string
  slug: string
  version: string
  description?: string
  baseUrl?: string
  documentationUrl?: string
  authentication?: {
    type: string
    required: boolean
    description: string
  }
  rateLimit?: {
    enabled?: boolean
    requestsPerMinute?: number
    burstLimit?: number
  }
  readme?: string
}

export interface EndpointDocs {
  method: string
  path: string
  summary?: string
  description?: string
  tags: string[]
  pathParameters: ParameterDoc[]
  queryParameters: ParameterDoc[]
  requestBody?: RequestBodyDoc
  responses: ResponseDoc[]
  constraints?: string
  notes?: string
  isStateful: boolean
}

export interface ParameterDoc {
  name: string
  type: string
  description?: string
  required: boolean
  default?: unknown
  enum?: unknown[]
  example?: unknown
}

export interface RequestBodyDoc {
  contentType: string
  schema: Record<string, unknown>
  example?: unknown
}

export interface ResponseDoc {
  statusCode: number
  description: string
  headers?: Record<string, string>
  body?: unknown
}

export interface FileNode {
  name: string
  type: "file" | "folder"
  path: string
  children?: FileNode[]
}

// ============================================================================
// Documentation Generator
// ============================================================================

export function generateServiceDocs(service: LoadedService): GeneratedDocs {
  const serviceDocs = generateServiceInfo(service)
  const endpoints = service.endpoints.map(generateEndpointDocs)
  const fileStructure = generateFileStructure(service)

  return {
    service: serviceDocs,
    endpoints,
    fileStructure,
  }
}

function generateServiceInfo(service: LoadedService): ServiceDocs {
  const authDescription = getAuthDescription(service.authentication)

  return {
    name: service.name,
    slug: service.slug,
    version: service.version,
    description: service.description,
    baseUrl: service.baseUrl,
    documentationUrl: service.documentationUrl,
    authentication: service.authentication
      ? {
          type: service.authentication.type,
          required: service.authentication.required ?? true,
          description: authDescription,
        }
      : undefined,
    rateLimit: service.rateLimit,
    readme: service.readme,
  }
}

function getAuthDescription(
  auth: LoadedService["authentication"]
): string {
  if (!auth) return "No authentication required"

  switch (auth.type) {
    case "api_key":
      return `API Key required in ${auth.headerName || "X-API-Key"} header`
    case "bearer":
      return "Bearer token required in Authorization header"
    case "basic":
      return "Basic authentication required"
    case "oauth2":
      return "OAuth 2.0 authentication required"
    case "none":
      return "No authentication required"
    default:
      return `${auth.type} authentication required`
  }
}

function generateEndpointDocs(endpoint: LoadedEndpoint): EndpointDocs {
  const pathParameters = extractPathParameters(endpoint)
  const queryParameters = extractQueryParameters(endpoint)
  const requestBody = extractRequestBody(endpoint)
  const responses = extractResponses(endpoint)

  return {
    method: endpoint.method,
    path: endpoint.path,
    summary: endpoint.summary,
    description: endpoint.description,
    tags: endpoint.tags || [],
    pathParameters,
    queryParameters,
    requestBody,
    responses,
    constraints: endpoint.constraints,
    notes: endpoint.notes,
    isStateful: endpoint.isStateful ?? false,
  }
}

function extractPathParameters(endpoint: LoadedEndpoint): ParameterDoc[] {
  const params: ParameterDoc[] = []

  // Extract from pathParameters config
  if (endpoint.pathParameters) {
    for (const [name, def] of Object.entries(endpoint.pathParameters)) {
      params.push(convertParameterDef(name, def, true))
    }
  }

  // Also extract from path pattern (e.g., /users/:id)
  const pathParams = endpoint.path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)
  if (pathParams) {
    for (const param of pathParams) {
      const name = param.slice(1) // Remove leading :
      if (!params.find((p) => p.name === name)) {
        params.push({
          name,
          type: "string",
          required: true,
        })
      }
    }
  }

  return params
}

function extractQueryParameters(endpoint: LoadedEndpoint): ParameterDoc[] {
  if (!endpoint.queryParameters) return []

  return Object.entries(endpoint.queryParameters).map(([name, def]) =>
    convertParameterDef(name, def, false)
  )
}

function convertParameterDef(
  name: string,
  def: ParameterDefinition,
  isPath: boolean
): ParameterDoc {
  return {
    name,
    type: def.type,
    description: def.description,
    required: isPath ? true : def.required ?? false,
    default: def.default,
    enum: def.enum,
    example: def.example,
  }
}

function extractRequestBody(endpoint: LoadedEndpoint): RequestBodyDoc | undefined {
  if (!endpoint.requestSchema || Object.keys(endpoint.requestSchema).length === 0) {
    return undefined
  }

  return {
    contentType: "application/json",
    schema: endpoint.requestSchema,
    example: generateExampleFromSchema(endpoint.requestSchema),
  }
}

function extractResponses(endpoint: LoadedEndpoint): ResponseDoc[] {
  const responses: ResponseDoc[] = []

  for (const [statusCode, response] of Object.entries(endpoint.responses)) {
    responses.push({
      statusCode: parseInt(statusCode, 10),
      description: getStatusDescription(parseInt(statusCode, 10)),
      headers: response.headers,
      body: response.body,
    })
  }

  // Sort by status code
  responses.sort((a, b) => a.statusCode - b.statusCode)

  return responses
}

function getStatusDescription(statusCode: number): string {
  const descriptions: Record<number, string> = {
    200: "Successful response",
    201: "Resource created successfully",
    204: "No content",
    400: "Bad request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not found",
    422: "Validation error",
    429: "Too many requests",
    500: "Internal server error",
  }
  return descriptions[statusCode] || `HTTP ${statusCode}`
}

function generateExampleFromSchema(schema: Record<string, unknown>): unknown {
  const example: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === "object" && value !== null) {
      const def = value as ParameterDefinition
      example[key] = getExampleValue(def)
    } else if (typeof value === "string") {
      // Simple type string
      example[key] = getExampleForType(value)
    }
  }

  return example
}

function getExampleValue(def: ParameterDefinition): unknown {
  if (def.example !== undefined) return def.example
  if (def.default !== undefined) return def.default
  if (def.enum && def.enum.length > 0) return def.enum[0]
  return getExampleForType(def.type)
}

function getExampleForType(type: string): unknown {
  switch (type) {
    case "string":
      return "string"
    case "number":
      return 0
    case "integer":
      return 0
    case "boolean":
      return true
    case "array":
      return []
    case "object":
      return {}
    default:
      return null
  }
}

function generateFileStructure(service: LoadedService): FileNode[] {
  const root: FileNode = {
    name: service.slug,
    type: "folder",
    path: service.slug,
    children: [],
  }

  // Add service.json
  root.children!.push({
    name: "service.json",
    type: "file",
    path: `${service.slug}/service.json`,
  })

  // Add README.md if exists
  if (service.readme) {
    root.children!.push({
      name: "README.md",
      type: "file",
      path: `${service.slug}/README.md`,
    })
  }

  // Add endpoints folder
  if (service.endpoints.length > 0) {
    const endpointsFolder: FileNode = {
      name: "endpoints",
      type: "folder",
      path: `${service.slug}/endpoints`,
      children: [],
    }

    // Group endpoints by path
    const pathTree = buildPathTree(service.endpoints, service.slug)
    endpointsFolder.children = pathTree

    root.children!.push(endpointsFolder)
  }

  return [root]
}

function buildPathTree(endpoints: LoadedEndpoint[], serviceSlug: string): FileNode[] {
  const tree: Map<string, FileNode> = new Map()

  for (const endpoint of endpoints) {
    // Convert path to folder structure (e.g., /v1/books/:id -> v1/books/{id})
    const pathParts = endpoint.path
      .split("/")
      .filter(Boolean)
      .map((part) => {
        // Convert :param to {param}
        if (part.startsWith(":")) {
          return `{${part.slice(1)}}`
        }
        return part
      })

    let currentPath = `${serviceSlug}/endpoints`
    let currentChildren = tree

    // Build folder structure for path
    for (const part of pathParts) {
      const nodePath = `${currentPath}/${part}`

      if (!currentChildren.has(part)) {
        const node: FileNode = {
          name: part,
          type: "folder",
          path: nodePath,
          children: [],
        }
        currentChildren.set(part, node)
      }

      currentPath = nodePath
      const node = currentChildren.get(part)!
      if (!node.children) {
        node.children = []
      }
      // Convert children array to map for next iteration
      const childMap = new Map<string, FileNode>()
      for (const child of node.children) {
        childMap.set(child.name, child)
      }
      currentChildren = childMap
      // Update node.children from map
      node.children = Array.from(childMap.values())
    }

    // Add method folder
    const methodPath = `${currentPath}/${endpoint.method}`
    const methodFolder: FileNode = {
      name: endpoint.method,
      type: "folder",
      path: methodPath,
      children: [
        { name: "endpoint.json", type: "file", path: `${methodPath}/endpoint.json` },
      ],
    }

    // Add notes.md if exists
    if (endpoint.notes) {
      methodFolder.children!.push({
        name: "notes.md",
        type: "file",
        path: `${methodPath}/notes.md`,
      })
    }

    // Add request folder if has request schema
    if (endpoint.requestSchema && Object.keys(endpoint.requestSchema).length > 0) {
      methodFolder.children!.push({
        name: "request",
        type: "folder",
        path: `${methodPath}/request`,
        children: [
          { name: "schema.json", type: "file", path: `${methodPath}/request/schema.json` },
        ],
      })
    }

    // Add responses folder
    const responseStatusCodes = Object.keys(endpoint.responses)
    if (responseStatusCodes.length > 0) {
      const responsesFolder: FileNode = {
        name: "responses",
        type: "folder",
        path: `${methodPath}/responses`,
        children: responseStatusCodes.map((code) => ({
          name: code,
          type: "folder" as const,
          path: `${methodPath}/responses/${code}`,
          children: [
            { name: "body.json", type: "file" as const, path: `${methodPath}/responses/${code}/body.json` },
          ],
        })),
      }
      methodFolder.children!.push(responsesFolder)
    }

    // Add method folder to current path
    const lastPart = pathParts[pathParts.length - 1]
    if (lastPart && currentChildren.has(lastPart)) {
      const parentNode = currentChildren.get(lastPart)!
      if (!parentNode.children) {
        parentNode.children = []
      }
      // Check if method folder already exists
      if (!parentNode.children.find((c) => c.name === endpoint.method)) {
        parentNode.children.push(methodFolder)
      }
    }
  }

  return Array.from(tree.values())
}

// ============================================================================
// Markdown Generator
// ============================================================================

export function generateMarkdownDocs(docs: GeneratedDocs): string {
  const lines: string[] = []

  // Service header
  lines.push(`# ${docs.service.name}`)
  lines.push("")

  if (docs.service.description) {
    lines.push(docs.service.description)
    lines.push("")
  }

  // Service info table
  lines.push("## Service Information")
  lines.push("")
  lines.push("| Property | Value |")
  lines.push("|----------|-------|")
  lines.push(`| Version | ${docs.service.version} |`)
  if (docs.service.baseUrl) {
    lines.push(`| Base URL | \`${docs.service.baseUrl}\` |`)
  }
  if (docs.service.authentication) {
    lines.push(`| Authentication | ${docs.service.authentication.description} |`)
  }
  if (docs.service.rateLimit?.enabled) {
    lines.push(`| Rate Limit | ${docs.service.rateLimit.requestsPerMinute} req/min |`)
  }
  lines.push("")

  // Endpoints
  lines.push("## Endpoints")
  lines.push("")

  // Group by tags
  const taggedEndpoints = new Map<string, EndpointDocs[]>()
  const untaggedEndpoints: EndpointDocs[] = []

  for (const endpoint of docs.endpoints) {
    if (endpoint.tags.length > 0) {
      for (const tag of endpoint.tags) {
        if (!taggedEndpoints.has(tag)) {
          taggedEndpoints.set(tag, [])
        }
        taggedEndpoints.get(tag)!.push(endpoint)
      }
    } else {
      untaggedEndpoints.push(endpoint)
    }
  }

  // Render tagged endpoints
  for (const [tag, endpoints] of Array.from(taggedEndpoints.entries())) {
    lines.push(`### ${tag.charAt(0).toUpperCase() + tag.slice(1)}`)
    lines.push("")
    for (const endpoint of endpoints) {
      lines.push(...renderEndpoint(endpoint))
    }
  }

  // Render untagged endpoints
  if (untaggedEndpoints.length > 0) {
    if (taggedEndpoints.size > 0) {
      lines.push("### Other Endpoints")
      lines.push("")
    }
    for (const endpoint of untaggedEndpoints) {
      lines.push(...renderEndpoint(endpoint))
    }
  }

  return lines.join("\n")
}

function renderEndpoint(endpoint: EndpointDocs): string[] {
  const lines: string[] = []
  const methodColor = getMethodColor(endpoint.method)

  lines.push(`#### \`${endpoint.method}\` ${endpoint.path}`)
  lines.push("")

  if (endpoint.summary) {
    lines.push(`**${endpoint.summary}**`)
    lines.push("")
  }

  if (endpoint.description) {
    lines.push(endpoint.description)
    lines.push("")
  }

  if (endpoint.isStateful) {
    lines.push("> **Stateful Endpoint**: This endpoint supports state persistence.")
    lines.push("")
  }

  // Path parameters
  if (endpoint.pathParameters.length > 0) {
    lines.push("**Path Parameters:**")
    lines.push("")
    lines.push("| Name | Type | Description |")
    lines.push("|------|------|-------------|")
    for (const param of endpoint.pathParameters) {
      const desc = param.description || "-"
      lines.push(`| \`${param.name}\` | ${param.type} | ${desc} |`)
    }
    lines.push("")
  }

  // Query parameters
  if (endpoint.queryParameters.length > 0) {
    lines.push("**Query Parameters:**")
    lines.push("")
    lines.push("| Name | Type | Required | Default | Description |")
    lines.push("|------|------|----------|---------|-------------|")
    for (const param of endpoint.queryParameters) {
      const required = param.required ? "Yes" : "No"
      const defaultVal = param.default !== undefined ? `\`${param.default}\`` : "-"
      const desc = param.description || "-"
      lines.push(`| \`${param.name}\` | ${param.type} | ${required} | ${defaultVal} | ${desc} |`)
    }
    lines.push("")
  }

  // Request body
  if (endpoint.requestBody) {
    lines.push("**Request Body:**")
    lines.push("")
    lines.push("```json")
    lines.push(JSON.stringify(endpoint.requestBody.example, null, 2))
    lines.push("```")
    lines.push("")
  }

  // Responses
  if (endpoint.responses.length > 0) {
    lines.push("**Responses:**")
    lines.push("")
    for (const response of endpoint.responses) {
      lines.push(`<details>`)
      lines.push(`<summary>${response.statusCode} - ${response.description}</summary>`)
      lines.push("")
      if (response.body) {
        lines.push("```json")
        lines.push(JSON.stringify(response.body, null, 2))
        lines.push("```")
      }
      lines.push("")
      lines.push("</details>")
      lines.push("")
    }
  }

  if (endpoint.constraints) {
    lines.push(`> **Constraints:** ${endpoint.constraints}`)
    lines.push("")
  }

  lines.push("---")
  lines.push("")

  return lines
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: "green",
    POST: "blue",
    PUT: "orange",
    PATCH: "yellow",
    DELETE: "red",
  }
  return colors[method] || "gray"
}
