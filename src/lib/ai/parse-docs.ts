import Anthropic from "@anthropic-ai/sdk"

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

export interface ParsedEndpoint {
  method: string
  path: string
  description?: string
  requestSchema?: Record<string, unknown>
  responseSchema?: Record<string, unknown>
  constraints?: string
}

export interface ParsedSpec {
  serviceName: string
  description: string
  baseUrl?: string
  endpoints: ParsedEndpoint[]
}

interface ExtractedLinks {
  serviceName: string
  description: string
  baseUrl?: string
  endpointLinks: string[]
  endpointSummaries: Array<{ method: string; path: string; link?: string }>
}

async function fetchUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.text()
}

async function extractLinksFromMainPage(
  documentation: string,
  baseUrl: string
): Promise<ExtractedLinks> {
  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 64000,
    messages: [
      {
        role: "user",
        content: `You are an API documentation analyzer. Analyze this documentation page and extract:

1. The service/API name
2. A brief description of the API
3. The base URL for API calls (if mentioned)
4. ALL links to detailed endpoint documentation pages
5. A summary of ALL endpoints mentioned (method, path, and link to detailed docs if available)

The base URL of this documentation is: ${baseUrl}

Return a JSON object:
{
  "serviceName": "string",
  "description": "string",
  "baseUrl": "string or null",
  "endpointLinks": ["full URLs to detailed endpoint docs"],
  "endpointSummaries": [
    { "method": "GET", "path": "/v1/users", "link": "full URL or null" }
  ]
}

CRITICAL REQUIREMENTS:
- You MUST extract EVERY SINGLE link and endpoint - do NOT stop at any arbitrary limit
- Convert relative links to absolute URLs using the base URL
- Include ALL endpoints even if there are 50, 100, or more
- Look for links in navigation, sidebars, tables, inline references, and ALL page sections
- Look for pagination links or "more" links that might lead to additional endpoints
- Extract links to sub-pages that might contain more endpoint documentation
- Double-check that you have not missed any links or endpoints before returning

Documentation:
${documentation}

Return ONLY valid JSON.`,
      },
    ],
    system:
      "You are an API documentation analyzer that outputs only valid JSON. You MUST extract ALL links and endpoints without any limit.",
  })

  const content = response.content[0]
  if (content.type !== "text") {
    throw new Error("Failed to extract links")
  }

  return JSON.parse(cleanJsonResponse(content.text)) as ExtractedLinks
}

async function parseEndpointPage(
  html: string,
  context: { method?: string; path?: string }
): Promise<ParsedEndpoint | null> {
  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: `Extract endpoint details from this documentation page.

Known context: ${context.method ? `Method: ${context.method}` : ""} ${context.path ? `Path: ${context.path}` : ""}

Return a JSON object:
{
  "method": "GET|POST|PUT|PATCH|DELETE",
  "path": "/path/:param",
  "description": "what this endpoint does",
  "requestSchema": { "fieldName": { "type": "string", "description": "...", "required": true } },
  "responseSchema": { "fieldName": { "type": "string", "description": "..." } },
  "constraints": "validation rules, rate limits, auth requirements"
}

Documentation:
${html}

Return ONLY valid JSON, or null if no endpoint found.`,
      },
    ],
    system: "You are an API documentation parser that outputs only valid JSON.",
  })

  const content = response.content[0]
  if (content.type !== "text") {
    return null
  }

  const cleaned = cleanJsonResponse(content.text)
  if (cleaned === "null") return null

  return JSON.parse(cleaned) as ParsedEndpoint
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

// Original single-pass parsing for simple docs or raw documentation strings
export async function parseApiDocumentation(
  documentation: string
): Promise<ParsedSpec> {
  const prompt = `You are an API documentation parser. Analyze the following API documentation and extract:
1. Service name
2. Description
3. ALL API endpoints with their:
   - HTTP method (GET, POST, PUT, PATCH, DELETE)
   - Path (e.g., /users, /users/:id)
   - Description
   - Request body schema (if applicable)
   - Response schema
   - Any constraints or validation rules mentioned

Return a JSON object with this structure:
{
  "serviceName": "string",
  "description": "string",
  "baseUrl": "string (optional)",
  "endpoints": [
    {
      "method": "GET|POST|PUT|PATCH|DELETE",
      "path": "/path/:param",
      "description": "what this endpoint does",
      "requestSchema": { "field": "type" },
      "responseSchema": { "field": "type" },
      "constraints": "any validation rules or constraints"
    }
  ]
}

CRITICAL REQUIREMENTS:
- You MUST extract EVERY SINGLE endpoint from the documentation - do NOT stop at 10 or any arbitrary limit
- Extract ALL endpoints even if there are 20, 50, 100, or more - there is NO limit
- Use :param syntax for path parameters (e.g., /users/:id)
- If the documentation is unclear, make reasonable inferences
- For schemas, use simple type descriptions like "string", "number", "boolean", "object", "array"
- Double-check that you have not missed any endpoints before returning

API Documentation:
${documentation}

Return ONLY valid JSON, no markdown code blocks or explanation.`

  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 64000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    system:
      "You are an API documentation parser that outputs only valid JSON. Never include markdown code blocks or explanations. You MUST extract ALL endpoints without any limit.",
  })

  const content = response.content[0]
  if (content.type !== "text") {
    throw new Error("Failed to parse API documentation")
  }

  try {
    const parsed = JSON.parse(cleanJsonResponse(content.text)) as ParsedSpec
    return parsed
  } catch {
    throw new Error("Invalid JSON response from AI")
  }
}

// Multi-step crawling parser for URL-based documentation
export async function parseApiDocumentationFromUrl(
  url: string,
  options: {
    maxDepth?: number
    maxLinksToFollow?: number
    concurrency?: number
  } = {}
): Promise<ParsedSpec> {
  const { maxDepth = 3, maxLinksToFollow = 200, concurrency = 10 } = options

  console.log(`Fetching main documentation page: ${url}`)
  const mainPageHtml = await fetchUrl(url)

  // Step 1: Extract links and endpoint summaries from main page
  console.log("Analyzing main page for endpoint links...")
  const extracted = await extractLinksFromMainPage(mainPageHtml, url)

  console.log(
    `Found ${extracted.endpointSummaries.length} endpoints, ${extracted.endpointLinks.length} detail links`
  )

  // Step 1.5: Recursively discover more links from sub-pages
  const allLinks = new Set(extracted.endpointLinks)
  const visitedLinks = new Set<string>()
  let linksToExplore = [...extracted.endpointLinks].slice(0, 20) // Explore first 20 links for more links

  for (let depth = 0; depth < maxDepth - 1 && linksToExplore.length > 0; depth++) {
    console.log(`Depth ${depth + 1}: Exploring ${linksToExplore.length} pages for more links...`)

    const newLinksFound: string[] = []

    for (let i = 0; i < linksToExplore.length; i += concurrency) {
      const batch = linksToExplore.slice(i, i + concurrency)

      const results = await Promise.allSettled(
        batch.map(async (link) => {
          if (visitedLinks.has(link)) return []
          visitedLinks.add(link)

          try {
            const html = await fetchUrl(link)
            const subExtracted = await extractLinksFromMainPage(html, link)
            return subExtracted.endpointLinks.filter((l) => !allLinks.has(l))
          } catch {
            return []
          }
        })
      )

      for (const result of results) {
        if (result.status === "fulfilled") {
          for (const newLink of result.value) {
            if (!allLinks.has(newLink)) {
              allLinks.add(newLink)
              newLinksFound.push(newLink)
            }
          }
        }
      }
    }

    linksToExplore = newLinksFound.slice(0, 20)
    console.log(`Found ${newLinksFound.length} new links at depth ${depth + 1}`)
  }

  console.log(`Total unique links discovered: ${allLinks.size}`)

  // Step 2: Crawl detail pages for richer schema info
  const detailLinks = Array.from(allLinks).slice(0, maxLinksToFollow)
  const endpointsWithDetails: ParsedEndpoint[] = []
  const processedPaths = new Set<string>()

  // Process links in batches for concurrency control
  for (let i = 0; i < detailLinks.length; i += concurrency) {
    const batch = detailLinks.slice(i, i + concurrency)
    console.log(
      `Processing links ${i + 1}-${Math.min(i + concurrency, detailLinks.length)} of ${detailLinks.length}...`
    )

    const results = await Promise.allSettled(
      batch.map(async (link) => {
        try {
          const html = await fetchUrl(link)
          const summary = extracted.endpointSummaries.find(
            (s) => s.link === link
          )
          return parseEndpointPage(html, {
            method: summary?.method,
            path: summary?.path,
          })
        } catch (err) {
          console.warn(`Failed to fetch ${link}:`, err)
          return null
        }
      })
    )

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        const key = `${result.value.method}:${result.value.path}`
        if (!processedPaths.has(key)) {
          processedPaths.add(key)
          endpointsWithDetails.push(result.value)
        }
      }
    }
  }

  // Step 3: Add any endpoints from summaries that weren't crawled
  for (const summary of extracted.endpointSummaries) {
    const key = `${summary.method}:${summary.path}`
    if (!processedPaths.has(key)) {
      processedPaths.add(key)
      endpointsWithDetails.push({
        method: summary.method,
        path: summary.path,
      })
    }
  }

  console.log(`Total endpoints parsed: ${endpointsWithDetails.length}`)

  return {
    serviceName: extracted.serviceName,
    description: extracted.description,
    baseUrl: extracted.baseUrl,
    endpoints: endpointsWithDetails,
  }
}
