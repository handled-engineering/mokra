import Anthropic from "@anthropic-ai/sdk"
import { LoadedService, PaginationConfig, RateLimitConfig } from "@/lib/services/types"

interface ParsedOperation {
  type: "query" | "mutation" | "subscription"
  name: string | null
  selections: string[]
  variables: Record<string, unknown>
}

interface GenerateGraphQLResponseParams {
  service: LoadedService
  schema: string
  operation: ParsedOperation
  variables: Record<string, unknown>
  returnTypeInfo: string
  rawQuery: string // The original raw GraphQL query string
  customInstruction?: string
  customContext?: string
}

interface GraphQLResponseBody {
  data?: unknown
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: Array<string | number>
  }>
}

function getAnthropic(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

function cleanJsonResponse(text: string): string {
  let jsonStr = text.trim()
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7)
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3)
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3)
  }
  return jsonStr.trim()
}

function buildPaginationRules(config?: PaginationConfig): string {
  if (!config) return ""

  const rules: string[] = ["Pagination Rules:"]

  rules.push(`- Pagination type: ${config.type}`)
  rules.push(`- Default page size: ${config.defaultPageSize} items`)
  rules.push(`- Maximum page size: ${config.maxPageSize} items`)

  if (config.type === "cursor" && config.connectionPattern) {
    rules.push(`- Use Relay-style cursor pagination with edges/node pattern`)
    rules.push(`- Always include pageInfo with hasNextPage, hasPreviousPage, startCursor, and endCursor`)
    rules.push(`- Generate realistic base64-encoded cursor strings`)
  }

  if (config.notes) {
    rules.push(`- Note: ${config.notes}`)
  }

  return rules.join("\n")
}

function buildRateLimitRules(config?: RateLimitConfig): string {
  if (!config) return ""

  const rules: string[] = ["Rate Limiting Context:"]

  rules.push(`- Rate limit type: ${config.type}`)

  if (config.costBased) {
    rules.push(`- This API uses cost-based rate limiting`)
  }

  if (config.bucket) {
    rules.push(`- Bucket capacity: ${config.bucket.maxCapacity}`)
    rules.push(`- Restore rate: ${config.bucket.restoreRate} ${config.bucket.restoreRateUnit}`)
  }

  if (config.queryCosts) {
    rules.push(`- Default query cost: ${config.queryCosts.default}`)
    if (config.queryCosts.mutations) {
      rules.push(`- Mutation cost: ${config.queryCosts.mutations}`)
    }
  }

  if (config.notes) {
    rules.push(`- Note: ${config.notes}`)
  }

  return rules.join("\n")
}

function extractPaginationArgs(rawQuery: string): { field: string; first?: number; last?: number; after?: string; before?: string }[] {
  const paginationArgs: { field: string; first?: number; last?: number; after?: string; before?: string }[] = []

  // Match all patterns like "fieldName(first: 10)" or "fieldName(last: 5, before: "cursor")" in the raw query
  // This regex finds field names followed by parentheses containing arguments
  const fieldWithArgsPattern = /(\w+)\s*\(\s*([^)]+)\s*\)/g
  let match

  while ((match = fieldWithArgsPattern.exec(rawQuery)) !== null) {
    const field = match[1]
    const argsStr = match[2]

    // Skip if this is the operation definition (query, mutation, subscription)
    if (['query', 'mutation', 'subscription'].includes(field.toLowerCase())) {
      continue
    }

    const args: { field: string; first?: number; last?: number; after?: string; before?: string } = { field }

    // Extract first
    const firstMatch = argsStr.match(/first\s*:\s*(\d+)/)
    if (firstMatch) args.first = parseInt(firstMatch[1], 10)

    // Extract last
    const lastMatch = argsStr.match(/last\s*:\s*(\d+)/)
    if (lastMatch) args.last = parseInt(lastMatch[1], 10)

    // Extract after
    const afterMatch = argsStr.match(/after\s*:\s*"([^"]*)"/)
    if (afterMatch) args.after = afterMatch[1]

    // Extract before
    const beforeMatch = argsStr.match(/before\s*:\s*"([^"]*)"/)
    if (beforeMatch) args.before = beforeMatch[1]

    if (args.first !== undefined || args.last !== undefined) {
      paginationArgs.push(args)
    }
  }

  return paginationArgs
}

export async function generateGraphQLResponse(
  params: GenerateGraphQLResponseParams
): Promise<GraphQLResponseBody> {
  const {
    service,
    schema,
    operation,
    variables,
    returnTypeInfo,
    rawQuery,
    customInstruction,
    customContext,
  } = params

  const anthropic = getAnthropic()

  // Build pagination rules section
  const paginationRules = buildPaginationRules(service.paginationConfig)

  // Build rate limit rules section
  const rateLimitRules = buildRateLimitRules(service.rateLimitConfig)

  // Only include schema in prompt if it's not too large (< 50KB)
  const MAX_SCHEMA_SIZE = 50000
  const schemaSection = schema.length < MAX_SCHEMA_SIZE
    ? `
GraphQL Schema:
\`\`\`graphql
${schema}
\`\`\``
    : `
Note: Full schema is too large to include. Generate responses based on the query structure and field names.
The API follows standard GraphQL conventions with Relay-style pagination (edges/node/pageInfo pattern).`

  const systemPrompt = `You are a GraphQL API mock response generator for ${service.name}.
You generate realistic mock responses that conform to the GraphQL schema.
${schemaSection}

${service.description ? `Service Description: ${service.description}` : ""}
${customContext ? `Custom Context: ${customContext}` : ""}
${paginationRules}
${rateLimitRules}

Rules:
1. Generate responses that match the GraphQL schema types exactly
2. Only include fields that were requested in the query
3. Generate realistic, contextually appropriate data
4. For IDs, use formats like "gid://shopify/Product/123456" for Shopify-style APIs
5. Return valid JSON in the format: { "data": { ... } }
6. For mutations, return appropriate created/updated data
7. Handle variables appropriately in the response
8. **CRITICAL**: You MUST respect pagination arguments exactly:
   - If "first: N" is specified, return EXACTLY N items in the edges array (not more, not less)
   - If "last: N" is specified, return EXACTLY N items in the edges array
   - If no pagination argument is specified, use the default page size from Pagination Rules
   - Always include proper pageInfo with hasNextPage, hasPreviousPage, startCursor, endCursor`

  // Extract pagination arguments from query
  const paginationArgs = extractPaginationArgs(rawQuery)
  const paginationRequirements = paginationArgs.length > 0
    ? `
**PAGINATION REQUIREMENTS (MUST FOLLOW EXACTLY):**
${paginationArgs.map(arg => {
  if (arg.first) return `- "${arg.field}" field: Return EXACTLY ${arg.first} items in the edges array`
  if (arg.last) return `- "${arg.field}" field: Return EXACTLY ${arg.last} items in the edges array`
  return ""
}).filter(Boolean).join("\n")}
`
    : ""

  const userPrompt = `Generate a mock response for this GraphQL ${operation.type}:

Operation Name: ${operation.name || "anonymous"}
Operation Type: ${operation.type}
Return Type: ${returnTypeInfo}

Raw Query:
\`\`\`graphql
${rawQuery}
\`\`\`

Variables:
${JSON.stringify(variables, null, 2)}
${paginationRequirements}
${customInstruction ? `Custom Instruction: ${customInstruction}` : ""}

Return a valid JSON response with the structure:
{
  "data": {
    // Response data matching the requested fields
  }
}

Return ONLY valid JSON, no markdown code blocks or explanation.`

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== "text") {
      throw new Error("Unexpected response type")
    }

    const parsed = JSON.parse(cleanJsonResponse(content.text))
    return parsed as GraphQLResponseBody
  } catch (error) {
    console.error("Error generating GraphQL response:", error)

    // Return error response with details
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return {
      errors: [
        {
          message: `Failed to generate mock response: ${errorMessage}`,
          path: [operation.name || "root"],
        },
      ],
    }
  }
}
