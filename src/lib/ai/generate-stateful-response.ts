import { MockEndpoint } from "@prisma/client"
import { generateCompletion } from "./providers"

interface ValidationResult {
  valid: boolean
  errors: Array<{
    field: string
    message: string
    code: string
  }>
}

interface MergeResponseParams {
  endpoint: MockEndpoint
  method: string
  path: string
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  dbRecord: Record<string, unknown> | null
  sampleResponse: unknown
  statusCode: number
  customInstruction?: string
}

interface StatefulResponse {
  statusCode: number
  body: unknown
  headers?: Record<string, string>
}

export async function validateRequestBody(
  validationRules: string,
  requestBody: unknown,
  endpoint: MockEndpoint
): Promise<ValidationResult> {
  const prompt = `You are a request validator. Validate the following request body against the validation rules.

Validation Rules:
${validationRules}

Endpoint: ${endpoint.method} ${endpoint.path}
Request Schema: ${JSON.stringify(endpoint.requestSchema) || "Not specified"}

Request Body to Validate:
${JSON.stringify(requestBody, null, 2)}

Analyze the request body and determine if it passes all validation rules.

Return a JSON object with this structure:
{
  "valid": true/false,
  "errors": [
    {
      "field": "field_name",
      "message": "Human-readable error message",
      "code": "ERROR_CODE"
    }
  ]
}

If valid, return an empty errors array.
Return ONLY valid JSON, no markdown or explanation.`

  try {
    const result = await generateCompletion({
      messages: [{ role: "user", content: prompt }],
      system: "You are a strict API request validator. Always return valid JSON only.",
      maxTokens: 1024,
    })

    let jsonStr = result.content.trim()
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7)
    else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3)
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3)

    return JSON.parse(jsonStr.trim()) as ValidationResult
  } catch (error) {
    console.error("Error validating request:", error)
    return { valid: true, errors: [] }
  }
}

/**
 * Transform stored data to match the endpoint's response schema using AI.
 * Falls back to raw data if transformation fails.
 */
export async function generateStatefulResponse(
  params: MergeResponseParams
): Promise<StatefulResponse> {
  const { endpoint, dbRecord, sampleResponse, statusCode, customInstruction } = params

  if (!dbRecord) {
    return {
      statusCode: 404,
      body: {
        error: {
          message: "Resource not found",
          type: "not_found_error",
        },
      },
    }
  }

  // Check if endpoint has a response schema to transform to
  const responseSchema = endpoint.responseSchema as Record<string, unknown> | null
  const hasSchema = responseSchema && Object.keys(responseSchema).length > 0

  // If no schema defined, return raw data
  if (!hasSchema) {
    return {
      statusCode,
      body: dbRecord,
      headers: { "X-Stateful-Response": "true" },
    }
  }

  // Use AI to transform stored data to match response schema
  try {
    const customInstructionSection = customInstruction
      ? `
**** CRITICAL - CUSTOM INSTRUCTION (HIGHEST PRIORITY) ****
${customInstruction}
**** END CUSTOM INSTRUCTION ****

`
      : ""

    const prompt = `${customInstructionSection}Transform the stored database record to match the API response schema.

Response Schema (the format to return):
${JSON.stringify(sampleResponse, null, 2)}

Stored Database Record (source data):
${JSON.stringify(dbRecord, null, 2)}

Instructions:
1. Return ONLY the fields defined in the response schema
2. Use values from the database record where field names match
3. For schema fields not in the record, use null or appropriate defaults
4. Do NOT include extra fields from the record that aren't in the schema
5. Maintain the exact structure/nesting of the response schema
6. If custom instruction specifies a status code (e.g., "return 403"), use that status code

Return a JSON object with this EXACT structure:
{
  "statusCode": ${statusCode},
  "body": { ... the transformed response body ... }
}

If custom instruction requests a different status code, change the statusCode field accordingly.
Return ONLY this JSON object, no markdown or explanation.`

    const result = await generateCompletion({
      messages: [{ role: "user", content: prompt }],
      system: "You transform data to match schemas. Return ONLY valid JSON, no markdown or explanation.",
      maxTokens: 16384,
    })

    let jsonStr = result.content.trim()
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7)
    else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3)
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3)

    const parsed = JSON.parse(jsonStr.trim())

    // Extract statusCode and body from AI's response
    const finalStatusCode = parsed.statusCode || statusCode
    const finalBody = parsed.body !== undefined ? parsed.body : parsed

    return {
      statusCode: finalStatusCode,
      body: finalBody,
      headers: { "X-Stateful-Response": "true", "X-Schema-Transform": "applied" },
    }
  } catch (error) {
    console.error("Error transforming response:", error)
    // Fallback to raw data on any error
    return {
      statusCode,
      body: dbRecord,
      headers: { "X-Stateful-Response": "true", "X-Schema-Transform": "failed" },
    }
  }
}

export async function generateNotFoundResponse(
  endpoint: MockEndpoint,
  resourceId: string
): Promise<StatefulResponse> {
  const responseSchema = endpoint.responseSchema as Record<string, unknown> | null

  if (responseSchema && responseSchema["404"]) {
    return {
      statusCode: 404,
      body: responseSchema["404"],
    }
  }

  return {
    statusCode: 404,
    body: {
      error: {
        message: `Resource with id '${resourceId}' not found`,
        type: "not_found_error",
        code: "resource_not_found",
      },
    },
  }
}

export async function generateValidationErrorResponse(
  errors: ValidationResult["errors"]
): Promise<StatefulResponse> {
  return {
    statusCode: 422,
    body: {
      error: {
        message: "Validation failed",
        type: "validation_error",
        code: "invalid_request",
        details: errors,
      },
    },
  }
}

export async function generateLimitExceededResponse(): Promise<StatefulResponse> {
  return {
    statusCode: 429,
    body: {
      error: {
        message: "Record limit exceeded. Maximum 50 records per resource type per project.",
        type: "rate_limit_error",
        code: "record_limit_exceeded",
      },
    },
  }
}

/**
 * Generate a response for POST/PUT/PATCH operations.
 * Transforms saved record to match response schema if defined.
 */
export async function generateStateWriteResponse(
  endpoint: MockEndpoint,
  method: string,
  savedRecord: Record<string, unknown>,
  pathParams: Record<string, string>,
  customInstruction?: string
): Promise<StatefulResponse> {
  const statusCode = method === "POST" ? 201 : 200
  const responseSchema = endpoint.responseSchema as Record<string, unknown> | null

  // Get the appropriate response schema for this status code
  const sampleResponse = responseSchema?.[statusCode.toString()] || responseSchema?.["200"] || null

  // If no schema, return raw saved record
  if (!sampleResponse || Object.keys(sampleResponse).length === 0) {
    return {
      statusCode,
      body: savedRecord,
      headers: { "X-Stateful-Response": "true" },
    }
  }

  // Transform to match schema
  try {
    const customInstructionSection = customInstruction
      ? `
**** CRITICAL - CUSTOM INSTRUCTION (HIGHEST PRIORITY) ****
${customInstruction}
**** END CUSTOM INSTRUCTION ****

`
      : ""

    const prompt = `${customInstructionSection}Transform the saved record to match the API response schema for a ${method} response.

Response Schema (the format to return):
${JSON.stringify(sampleResponse, null, 2)}

Saved Record (source data):
${JSON.stringify(savedRecord, null, 2)}

Instructions:
1. Return ONLY the fields defined in the response schema
2. Use values from the saved record where field names match
3. For schema fields not in the record, use null or appropriate defaults
4. Do NOT include extra fields from the record that aren't in the schema
5. If custom instruction specifies a status code, use that status code

Return a JSON object with this EXACT structure:
{
  "statusCode": ${statusCode},
  "body": { ... the transformed response body ... }
}

If custom instruction requests a different status code, change the statusCode field accordingly.
Return ONLY this JSON object, no markdown or explanation.`

    const result = await generateCompletion({
      messages: [{ role: "user", content: prompt }],
      system: "You transform data to match schemas. Return ONLY valid JSON.",
      maxTokens: 16384,
    })

    let jsonStr = result.content.trim()
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7)
    else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3)
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3)

    const parsed = JSON.parse(jsonStr.trim())

    // Extract statusCode and body from AI's response
    const finalStatusCode = parsed.statusCode || statusCode
    const finalBody = parsed.body !== undefined ? parsed.body : parsed

    return {
      statusCode: finalStatusCode,
      body: finalBody,
      headers: { "X-Stateful-Response": "true", "X-Schema-Transform": "applied" },
    }
  } catch (error) {
    console.error("Error transforming write response:", error)
    return { statusCode, body: savedRecord, headers: { "X-Stateful-Response": "true" } }
  }
}

export async function generateDeleteResponse(
  endpoint: MockEndpoint,
  resourceId: string
): Promise<StatefulResponse> {
  const responseSchema = endpoint.responseSchema as Record<string, unknown> | null

  if (responseSchema && responseSchema["200"]) {
    return {
      statusCode: 200,
      body: responseSchema["200"],
    }
  }

  return {
    statusCode: 200,
    body: {
      id: resourceId,
      deleted: true,
    },
  }
}
