/**
 * Export database services to file-based format
 *
 * Usage:
 *   npx tsx scripts/export-services.ts           # Export all services
 *   npx tsx scripts/export-services.ts <slug>    # Export specific service
 */

import { PrismaClient } from "@prisma/client"

// Local type for endpoint data (from parsedSpec JSON or database relation)
interface MockEndpoint {
  path: string
  method: string
  description?: string | null
  constraints?: string | null
  requestSchema?: Record<string, string> | null
  responseSchema?: Record<string, unknown> | null
}
import * as fs from "fs/promises"
import * as path from "path"

const prisma = new PrismaClient()
const SERVICES_PATH = path.join(process.cwd(), "services")

interface ServiceJson {
  name: string
  slug: string
  description?: string
  version: string
  baseUrl?: string
  documentationUrl?: string
  defaultHeaders?: Record<string, string>
  authentication?: {
    type: "api_key" | "bearer" | "basic" | "oauth2" | "none"
    headerName?: string
  }
  isActive: boolean
}

interface EndpointJson {
  path: string
  method: string
  description?: string
  summary?: string
  tags?: string[]
  queryParameters?: Record<string, unknown>
  constraints?: string
  defaultStatusCode?: number
  isStateful?: boolean
}

async function exportService(serviceId: string, outputPath: string) {
  const service = await prisma.mockService.findUnique({
    where: { id: serviceId },
  })

  if (!service) {
    throw new Error(`Service not found: ${serviceId}`)
  }

  console.log(`Exporting service: ${service.name} (${service.slug})`)

  const serviceDir = path.join(outputPath, service.slug)
  await fs.mkdir(serviceDir, { recursive: true })

  // Write service.json
  const serviceJson: ServiceJson = {
    name: service.name,
    slug: service.slug,
    description: service.description || undefined,
    version: "1.0.0",
    defaultHeaders: {
      "Content-Type": "application/json",
    },
    authentication: {
      type: "bearer",
    },
    isActive: service.isActive,
  }

  await fs.writeFile(
    path.join(serviceDir, "service.json"),
    JSON.stringify(serviceJson, null, 2)
  )

  // Write README.md from documentation
  const readme = `# ${service.name}

${service.description || ""}

## Documentation

${service.documentation || "No documentation available."}
`
  await fs.writeFile(path.join(serviceDir, "README.md"), readme)

  // Create endpoints folder
  const endpointsDir = path.join(serviceDir, "endpoints")
  await fs.mkdir(endpointsDir, { recursive: true })

  // Extract endpoints from parsedSpec JSON
  const parsedSpec = service.parsedSpec as { endpoints?: MockEndpoint[] } | null
  const endpoints: MockEndpoint[] = parsedSpec?.endpoints ?? []

  // Export each endpoint
  for (const endpoint of endpoints) {
    await exportEndpoint(endpoint, endpointsDir)
  }

  console.log(`  Exported ${endpoints.length} endpoints`)
}

async function exportEndpoint(endpoint: MockEndpoint, baseDir: string) {
  // Convert path to folder structure: /v1/customers/:id -> v1/customers/{id}
  const pathSegments = endpoint.path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(":")) {
        return `{${segment.slice(1)}}`
      }
      return segment
    })

  const endpointDir = path.join(baseDir, ...pathSegments, endpoint.method)
  await fs.mkdir(endpointDir, { recursive: true })

  // Write endpoint.json
  const endpointJson: EndpointJson = {
    path: endpoint.path,
    method: endpoint.method,
    description: endpoint.description || undefined,
    constraints: endpoint.constraints || undefined,
    defaultStatusCode: endpoint.method === "POST" ? 201 : 200,
  }

  await fs.writeFile(
    path.join(endpointDir, "endpoint.json"),
    JSON.stringify(endpointJson, null, 2)
  )

  // Write request schema if exists (for POST/PUT/PATCH)
  if (
    endpoint.requestSchema &&
    ["POST", "PUT", "PATCH"].includes(endpoint.method)
  ) {
    const requestDir = path.join(endpointDir, "request")
    await fs.mkdir(requestDir, { recursive: true })

    // Convert simple schema format to JSON Schema
    const requestSchemaData = endpoint.requestSchema as Record<string, string>
    const jsonSchema = convertToJsonSchema(requestSchemaData)

    await fs.writeFile(
      path.join(requestDir, "schema.json"),
      JSON.stringify(jsonSchema, null, 2)
    )
  }

  // Write response schemas
  if (endpoint.responseSchema) {
    const responsesDir = path.join(endpointDir, "responses")
    await fs.mkdir(responsesDir, { recursive: true })

    const schema = endpoint.responseSchema as Record<string, unknown>

    // Check if it's in the new format with status codes
    const hasStatusCodes = Object.keys(schema).some((key) => /^\d{3}$/.test(key))

    if (hasStatusCodes) {
      // New format: { "200": { body: {...}, headers: {...} } }
      for (const [statusCode, responseData] of Object.entries(schema)) {
        if (!/^\d{3}$/.test(statusCode)) continue

        const statusDir = path.join(responsesDir, statusCode)
        await fs.mkdir(statusDir, { recursive: true })

        const response = responseData as { body?: unknown; headers?: Record<string, string> }

        // Write body.json
        await fs.writeFile(
          path.join(statusDir, "body.json"),
          JSON.stringify(response.body || response, null, 2)
        )

        // Write headers.json if present
        if (response.headers) {
          await fs.writeFile(
            path.join(statusDir, "headers.json"),
            JSON.stringify(response.headers, null, 2)
          )
        }
      }
    } else {
      // Old format: just response body
      const statusCode = endpoint.method === "POST" ? "201" : "200"
      const statusDir = path.join(responsesDir, statusCode)
      await fs.mkdir(statusDir, { recursive: true })

      await fs.writeFile(
        path.join(statusDir, "body.json"),
        JSON.stringify(schema, null, 2)
      )
    }
  }

  // Create placeholder notes.md
  const notesContent = `# ${endpoint.method} ${endpoint.path}

${endpoint.description || "No description available."}

## Business Logic

<!-- Add business logic notes here -->

## Response Behavior

<!-- Add response behavior notes here -->

## Field Generation

<!-- Add field generation hints for AI here -->
`
  await fs.writeFile(path.join(endpointDir, "notes.md"), notesContent)
}

function convertToJsonSchema(
  simpleSchema: Record<string, string>
): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, type] of Object.entries(simpleSchema)) {
    switch (type) {
      case "string":
        properties[key] = { type: "string" }
        break
      case "number":
        properties[key] = { type: "number" }
        break
      case "boolean":
        properties[key] = { type: "boolean" }
        break
      case "object":
        properties[key] = { type: "object" }
        break
      case "array":
        properties[key] = { type: "array" }
        break
      default:
        properties[key] = { type: "string" }
    }
  }

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined,
  }
}

async function main() {
  const args = process.argv.slice(2)

  // Ensure services directory exists
  await fs.mkdir(SERVICES_PATH, { recursive: true })

  if (args.length > 0) {
    // Export specific service by slug or ID
    const identifier = args[0]

    // Try to find by slug first, then by ID
    let service = await prisma.mockService.findFirst({
      where: { slug: identifier },
    })

    if (!service) {
      service = await prisma.mockService.findUnique({
        where: { id: identifier },
      })
    }

    if (!service) {
      console.error(`Service not found: ${identifier}`)
      process.exit(1)
    }

    await exportService(service.id, SERVICES_PATH)
  } else {
    // Export all services
    const services = await prisma.mockService.findMany()
    console.log(`Found ${services.length} services to export`)

    for (const service of services) {
      await exportService(service.id, SERVICES_PATH)
    }
  }

  console.log("\nExport complete!")
  console.log(`Services exported to: ${SERVICES_PATH}`)
}

main()
  .catch((error) => {
    console.error("Export failed:", error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
