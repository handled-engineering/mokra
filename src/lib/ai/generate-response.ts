import { generateCompletion, AIProvider } from "./providers"
import { PaginationConfig, RateLimitConfig } from "@/lib/services/types"

// Endpoint interface (loaded from filesystem, not database)
interface MockEndpoint {
  id: string
  method: string
  path: string
  description?: string | null
  requestSchema?: Record<string, unknown> | null
  responseSchema?: Record<string, unknown> | null
  constraints?: string | null
}

interface StateEntry {
  resourceType: string
  resourceId: string
  data: unknown
}

interface GenerateResponseParams {
  endpoint: MockEndpoint
  method: string
  path: string
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  body?: unknown
  existingState: StateEntry[]
  documentation: string
  serviceContext?: string // User's custom context for the service
  endpointContext?: string // User's custom context for this specific endpoint
  customInstruction?: string // Per-request custom instruction from x-custom-instruction header
  endpointNotes?: string // Notes from notes.md file for file-based endpoints
  provider?: AIProvider // Optional AI provider override
  paginationConfig?: PaginationConfig // Pagination rules from pagination.json
  rateLimitConfig?: RateLimitConfig // Rate limit rules from rate-limit.json
}

interface GeneratedResponse {
  statusCode: number
  body: unknown
  stateUpdate?: {
    resourceType: string
    resourceId: string
    data: unknown
    action: "create" | "update" | "delete"
  }
}

function buildPaginationRules(config?: PaginationConfig): string {
  if (!config) return ""

  const rules: string[] = ["\nPagination Rules:"]

  rules.push(`- Pagination type: ${config.type}`)
  rules.push(`- Default page size: ${config.defaultPageSize} items`)
  rules.push(`- Maximum page size: ${config.maxPageSize} items`)

  if (config.type === "cursor" && config.connectionPattern) {
    rules.push(`- Use cursor-based pagination`)
    rules.push(`- Include next_cursor/prev_cursor in response metadata`)
  } else if (config.type === "offset" && config.offsetPattern) {
    rules.push(`- Use offset/limit pagination`)
    rules.push(`- Offset param: ${config.offsetPattern.offsetParam}, Limit param: ${config.offsetPattern.limitParam}`)
  } else if (config.type === "page" && config.pagePattern) {
    rules.push(`- Use page-based pagination`)
    rules.push(`- Page param: ${config.pagePattern.pageParam}, Per-page param: ${config.pagePattern.perPageParam}`)
  }

  if (config.notes) {
    rules.push(`- Note: ${config.notes}`)
  }

  return rules.join("\n")
}

function buildRateLimitRules(config?: RateLimitConfig): string {
  if (!config) return ""

  const rules: string[] = ["\nRate Limiting Context:"]

  rules.push(`- Rate limit type: ${config.type}`)

  if (config.costBased) {
    rules.push(`- This API uses cost-based rate limiting`)
  }

  if (config.fixedWindow) {
    rules.push(`- Requests per window: ${config.fixedWindow.requestsPerWindow}`)
    rules.push(`- Window size: ${config.fixedWindow.windowSizeSeconds} seconds`)
  }

  if (config.headers) {
    const headersList: string[] = []
    if (config.headers.limit) headersList.push(`Limit: ${config.headers.limit}`)
    if (config.headers.remaining) headersList.push(`Remaining: ${config.headers.remaining}`)
    if (config.headers.reset) headersList.push(`Reset: ${config.headers.reset}`)
    if (headersList.length > 0) {
      rules.push(`- Rate limit headers: ${headersList.join(", ")}`)
    }
  }

  if (config.notes) {
    rules.push(`- Note: ${config.notes}`)
  }

  return rules.join("\n")
}

export async function generateMockResponse(params: GenerateResponseParams): Promise<GeneratedResponse> {
  const { endpoint, method, path, pathParams, queryParams, body, existingState, documentation, serviceContext, endpointContext, customInstruction, endpointNotes, provider, paginationConfig, rateLimitConfig } = params

  // Build context about existing state
  const stateContext = existingState.length > 0
    ? `Existing data in the system:\n${existingState.map(s =>
        `- ${s.resourceType}/${s.resourceId}: ${JSON.stringify(s.data)}`
      ).join("\n")}`
    : "No existing data in the system yet."

  // Build custom context section
  const customContextSection = (serviceContext || endpointContext)
    ? `
IMPORTANT - User Custom Context (FOLLOW THESE INSTRUCTIONS):
${serviceContext ? `Service-level context: ${serviceContext}` : ""}
${endpointContext ? `Endpoint-specific context: ${endpointContext}` : ""}
`
    : ""

  // Build endpoint notes section (from notes.md file)
  const endpointNotesSection = endpointNotes
    ? `
ENDPOINT NOTES (Important context for this endpoint):
${endpointNotes}
`
    : ""

  // Build per-request custom instruction section - HIGHEST PRIORITY
  const customInstructionSection = customInstruction
    ? `
**** CRITICAL - PER-REQUEST INSTRUCTION (HIGHEST PRIORITY - MUST FOLLOW) ****
The user has provided a custom instruction for this specific request. This takes precedence over all other instructions:

${customInstruction}

You MUST follow this instruction exactly. It may specify:
- A specific status code to return (e.g., "return 400", "return 403")
- Required fields that must be in the response
- Specific values to include
- Error conditions to simulate
- Any other custom behavior

This instruction overrides default behavior.
**** END CRITICAL INSTRUCTION ****
`
    : ""

  // Build pagination and rate limit rules
  const paginationRulesSection = buildPaginationRules(paginationConfig)
  const rateLimitRulesSection = buildRateLimitRules(rateLimitConfig)

  const prompt = `You are a mock API server. Generate a realistic response for the following API request.
${customInstructionSection}

API Documentation Context:
${documentation}
${customContextSection}${endpointNotesSection}${paginationRulesSection}${rateLimitRulesSection}

Endpoint Details:
- Method: ${method}
- Path Pattern: ${endpoint.path}
- Actual Path: ${path}
- Description: ${endpoint.description || "No description"}
- Request Schema: ${JSON.stringify(endpoint.requestSchema) || "Not specified"}
- Response Schema: ${JSON.stringify(endpoint.responseSchema) || "Not specified"}
- Constraints: ${endpoint.constraints || "None specified"}

Request Details:
- Path Parameters: ${JSON.stringify(pathParams)}
- Query Parameters: ${JSON.stringify(queryParams)}
- Request Body: ${body ? JSON.stringify(body) : "None"}

${stateContext}

Instructions:
1. Generate a realistic API response that follows the documentation constraints
2. For GET requests: Return existing data if it matches, or generate new realistic data
3. For POST requests: Create new data with a generated ID, respecting any constraints
4. For PUT/PATCH requests: Update existing data or return 404 if not found
5. For DELETE requests: Return success if exists, 404 if not found
6. Maintain consistency with existing state
7. Generate realistic-looking data (proper names, emails, dates, etc.)

Return a JSON object with this structure:
{
  "statusCode": 200,
  "body": { ... the response body ... },
  "stateUpdate": {
    "resourceType": "e.g., customers",
    "resourceId": "the id of the resource",
    "data": { ... the full resource data ... },
    "action": "create|update|delete"
  }
}

The stateUpdate is optional - only include it if this request modifies data.

Return ONLY valid JSON, no markdown code blocks or explanation.`

  try {
    const result = await generateCompletion(
      {
        messages: [{ role: "user", content: prompt }],
        system: "You are a mock API server that generates realistic API responses. Always return valid JSON only, no markdown or explanation.",
        maxTokens: 4096,
      },
      provider
    )

    // Clean the response - remove any markdown code blocks if present
    let jsonStr = result.content.trim()
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    const parsed = JSON.parse(jsonStr) as GeneratedResponse
    return parsed
  } catch (error) {
    console.error("Error generating mock response:", error)
    return {
      statusCode: 500,
      body: { error: "Failed to generate response" },
    }
  }
}
