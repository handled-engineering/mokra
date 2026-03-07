import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

const generateSchema = z.object({
  type: z.enum(["schema", "response"]),
  input: z.string().min(1, "Input is required"),
  context: z.string().optional(),
  statusCode: z.string().optional(),
})

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

function getHeadersContext(statusCode: string): string {
  const code = parseInt(statusCode)
  if (code === 201) {
    return "For 201 Created, consider including a Location header pointing to the new resource."
  }
  if (code === 301 || code === 302 || code === 307 || code === 308) {
    return "For redirect responses, include a Location header with the redirect URL."
  }
  if (code === 401) {
    return "For 401 Unauthorized, consider including a WWW-Authenticate header."
  }
  if (code === 429) {
    return "For 429 Too Many Requests, include Retry-After header (seconds until retry) and optionally X-RateLimit-Remaining."
  }
  if (code === 503) {
    return "For 503 Service Unavailable, consider including a Retry-After header."
  }
  return "Include Content-Type header and any other relevant headers for this response type."
}

function getStatusCodeContext(statusCode: string): string {
  const code = parseInt(statusCode)
  if (code >= 200 && code < 300) {
    return "This is a SUCCESS response. Include the requested resource data with realistic field values."
  }
  if (code === 400) {
    return "This is a BAD REQUEST error response. Include an error message and details about what was wrong with the request (e.g., missing fields, invalid format)."
  }
  if (code === 401) {
    return "This is an UNAUTHORIZED error response. Include an error message indicating authentication is required or credentials are invalid."
  }
  if (code === 403) {
    return "This is a FORBIDDEN error response. Include an error message indicating the user lacks permission to access this resource."
  }
  if (code === 404) {
    return "This is a NOT FOUND error response. Include an error message indicating the requested resource doesn't exist."
  }
  if (code === 422) {
    return "This is a VALIDATION ERROR response. Include detailed field-level validation errors with specific messages for each invalid field."
  }
  if (code === 429) {
    return "This is a RATE LIMIT error response. Include an error message about rate limiting, and optionally a retryAfter field."
  }
  if (code >= 500) {
    return "This is a SERVER ERROR response. Include a generic error message without exposing internal details, optionally with an error code or request ID."
  }
  return `This is a response with status code ${statusCode}.`
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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "CONTRIBUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { type, input, context, statusCode } = generateSchema.parse(body)

    const anthropic = getAnthropic()

    if (type === "schema") {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `You are an API schema generator. Analyze the following input and extract the field names and their types.

The input could be:
- API documentation
- Example JSON data
- A description of fields
- Code snippets
- Any other format describing API parameters

${context ? `Context: This is for a ${context} (request body or query parameters)` : ""}

Return a JSON object where keys are field names and values are one of: "string", "number", "boolean", "object", "array"

Example output:
{
  "name": "string",
  "age": "number",
  "active": "boolean",
  "metadata": "object",
  "tags": "array"
}

Input to analyze:
${input}

Return ONLY valid JSON, no markdown code blocks or explanation.`,
          },
        ],
        system:
          "You are an API schema generator that outputs only valid JSON. Extract field names and their types from any input format.",
      })

      const content = response.content[0]
      if (content.type !== "text") {
        throw new Error("Failed to generate schema")
      }

      const schema = JSON.parse(cleanJsonResponse(content.text))
      return NextResponse.json({ schema })
    } else {
      // Generate sample response with headers
      const statusContext = getStatusCodeContext(statusCode || "200")
      const headersContext = getHeadersContext(statusCode || "200")

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `You are an API response generator. Generate a realistic sample response for HTTP status code ${statusCode || "200"}.

${statusContext}

${headersContext}

The input describes what this response should contain:
${input}

Generate a realistic response with both headers and body. Return a JSON object with this structure:
{
  "headers": {
    "Content-Type": "application/json",
    // other relevant headers for this status code
  },
  "body": {
    // the response body
  }
}

IMPORTANT:
- Include appropriate headers for the status code (e.g., Location for 201, Retry-After for 429)
- Headers can be empty {} if no special headers are needed
- Body should have realistic fake data appropriate for this status code

Return ONLY valid JSON, no markdown code blocks or explanation.`,
          },
        ],
        system:
          "You are an API response generator that outputs only valid JSON. Generate realistic sample responses with appropriate headers and body.",
      })

      const content = response.content[0]
      if (content.type !== "text") {
        throw new Error("Failed to generate response")
      }

      const parsed = JSON.parse(cleanJsonResponse(content.text))

      // Handle both old format (just body) and new format (headers + body)
      if (parsed.headers !== undefined && parsed.body !== undefined) {
        return NextResponse.json({ headers: parsed.headers, body: parsed.body })
      } else {
        // Old format - the whole response is the body
        return NextResponse.json({ headers: {}, body: parsed })
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error generating with AI:", error)
    return NextResponse.json(
      { error: "Failed to generate. Please try again." },
      { status: 500 }
    )
  }
}
