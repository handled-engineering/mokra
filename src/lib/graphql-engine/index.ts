import {
  parse,
  validate,
  DocumentNode,
  OperationDefinitionNode,
  SelectionSetNode,
  FieldNode,
  buildSchema,
  buildClientSchema,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLOutputType,
  IntrospectionQuery,
} from "graphql"
import { Prisma } from "@prisma/client"
import { LoadedService, GraphQLSchemaVersion } from "@/lib/services/types"
import { generateGraphQLResponse } from "@/lib/ai/generate-graphql-response"
import { findCachedResponse, cacheResponse } from "@/lib/response-cache"
import { prisma } from "@/lib/prisma"

interface GraphQLRequest {
  query: string
  operationName?: string
  variables?: Record<string, unknown>
}

interface GraphQLResponse {
  statusCode: number
  body: {
    data?: unknown
    errors?: Array<{
      message: string
      locations?: Array<{ line: number; column: number }>
      path?: Array<string | number>
    }>
  }
  headers?: Record<string, string>
}

interface ParsedOperation {
  type: "query" | "mutation" | "subscription"
  name: string | null
  selections: string[]
  variables: Record<string, unknown>
}

export class GraphQLEngine {
  private service: LoadedService
  private schemaVersion: GraphQLSchemaVersion
  private schema: GraphQLSchema
  private mockServerId: string
  private customContext?: string

  constructor(
    service: LoadedService,
    schemaVersion: GraphQLSchemaVersion,
    mockServerId: string,
    customContext?: string
  ) {
    this.service = service
    this.schemaVersion = schemaVersion
    this.mockServerId = mockServerId
    this.customContext = customContext

    // Build the GraphQL schema - detect JSON introspection vs SDL
    this.schema = this.buildSchemaFromSource(schemaVersion.schema)
  }

  private buildSchemaFromSource(schemaSource: string): GraphQLSchema {
    const trimmed = schemaSource.trim()

    // Check if it's JSON (introspection result)
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed)
        // Handle both { data: { __schema: ... } } and { __schema: ... } formats
        const introspection = parsed.data ? parsed.data : parsed
        return buildClientSchema(introspection as IntrospectionQuery)
      } catch (e) {
        throw new Error(`Failed to parse GraphQL introspection JSON: ${e instanceof Error ? e.message : "Unknown error"}`)
      }
    }

    // Otherwise treat as SDL
    return buildSchema(schemaSource)
  }

  async handleRequest(
    request: GraphQLRequest,
    headers: Record<string, string>
  ): Promise<GraphQLResponse> {
    const startTime = Date.now()

    // Extract custom instruction from header
    const customInstruction =
      headers["x-custom-instruction"] ||
      headers["X-Custom-Instruction"] ||
      headers["x-mock-instruction"] ||
      headers["X-Mock-Instruction"]

    // Step 1: Parse the GraphQL query
    let document: DocumentNode
    try {
      document = parse(request.query)
    } catch (parseError) {
      return this.logAndReturn(request, startTime, {
        statusCode: 400,
        body: {
          errors: [{ message: `GraphQL syntax error: ${parseError instanceof Error ? parseError.message : "Invalid query"}` }],
        },
      })
    }

    // Step 2: Validate against schema using graphql-js validate function
    // This catches invalid fields, wrong types, missing required args, etc.
    const validationErrors = validate(this.schema, document)
    if (validationErrors.length > 0) {
      return this.logAndReturn(request, startTime, {
        statusCode: 400,
        body: {
          errors: validationErrors.map((err) => ({
            message: err.message,
            locations: err.locations ? [...err.locations] : undefined,
            path: err.path ? [...err.path] : undefined,
          })),
        },
      })
    }

    // Step 3: Extract operation details
    const operation = this.extractOperation(document, request.operationName)

    if (!operation) {
      return this.logAndReturn(request, startTime, {
        statusCode: 400,
        body: {
          errors: [{ message: "No valid operation found in query" }],
        },
      })
    }

    // Step 4: Get the return type from schema (needed for response generation)
    const returnTypeInfo = this.getOperationReturnType(operation)

    // Step 5: Build cache key using hash of entire query + variables
    // This ensures ANY change to the query (including inline args like first: 3 vs first: 5)
    // results in a different cache key
    const queryHash = this.simpleHash(request.query)
    const variablesHash = this.hashVariables(request.variables || {})
    const cacheKey = `graphql:${queryHash}:${variablesHash}`

    // Step 6: Check cache (only after validation passes)
    try {
      const cached = await findCachedResponse(
        this.mockServerId,
        this.service.slug,
        "POST",
        cacheKey,
        customInstruction
      )

      if (cached) {
        return this.logAndReturn(request, startTime, {
          statusCode: cached.response.statusCode,
          body: cached.response.body as GraphQLResponse["body"],
          headers: {
            ...cached.response.headers,
            "X-Cache": "HIT",
            ...(cached.similarity
              ? { "X-Cache-Similarity": cached.similarity.toFixed(3) }
              : {}),
          },
        })
      }
    } catch (error) {
      console.error("Cache lookup error:", error)
    }

    try {
      // Generate response using AI
      const response = await generateGraphQLResponse({
        service: this.service,
        schema: this.schemaVersion.schema,
        operation,
        variables: request.variables || {},
        returnTypeInfo,
        rawQuery: request.query,
        customInstruction,
        customContext: this.customContext,
      })

      // Cache the response
      cacheResponse(
        this.mockServerId,
        this.service.slug,
        "POST",
        cacheKey,
        {
          statusCode: 200,
          body: response,
        },
        customInstruction
      ).catch((error) => console.error("Error caching response:", error))

      return this.logAndReturn(request, startTime, {
        statusCode: 200,
        body: response,
        headers: { "X-Cache": "MISS" },
      })
    } catch (error) {
      console.error("GraphQL error:", error)

      if (error instanceof Error && error.message.includes("Syntax Error")) {
        return this.logAndReturn(request, startTime, {
          statusCode: 400,
          body: {
            errors: [{ message: `GraphQL syntax error: ${error.message}` }],
          },
        })
      }

      return this.logAndReturn(request, startTime, {
        statusCode: 500,
        body: {
          errors: [{ message: "Internal server error processing GraphQL request" }],
        },
      })
    }
  }

  private extractOperation(
    document: DocumentNode,
    operationName?: string
  ): ParsedOperation | null {
    const operations = document.definitions.filter(
      (def): def is OperationDefinitionNode =>
        def.kind === "OperationDefinition"
    )

    if (operations.length === 0) {
      return null
    }

    // Find the right operation
    let operation: OperationDefinitionNode | undefined

    if (operationName) {
      operation = operations.find((op) => op.name?.value === operationName)
    } else if (operations.length === 1) {
      operation = operations[0]
    }

    if (!operation) {
      return null
    }

    // Extract selections
    const selections = this.extractSelections(operation.selectionSet)

    return {
      type: operation.operation,
      name: operation.name?.value || null,
      selections,
      variables: {},
    }
  }

  private extractSelections(selectionSet: SelectionSetNode): string[] {
    const selections: string[] = []

    for (const selection of selectionSet.selections) {
      if (selection.kind === "Field") {
        const field = selection as FieldNode
        const fieldName = field.name.value

        if (field.selectionSet) {
          const nested = this.extractSelections(field.selectionSet)
          selections.push(`${fieldName} { ${nested.join(", ")} }`)
        } else {
          selections.push(fieldName)
        }
      }
    }

    return selections
  }

  private getOperationReturnType(operation: ParsedOperation): string {
    try {
      let rootType: GraphQLObjectType | null | undefined

      if (operation.type === "query") {
        rootType = this.schema.getQueryType()
      } else if (operation.type === "mutation") {
        rootType = this.schema.getMutationType()
      } else if (operation.type === "subscription") {
        rootType = this.schema.getSubscriptionType()
      }

      if (!rootType) {
        return "Unknown"
      }

      // Get the first field's return type
      const firstSelection = operation.selections[0]
      if (!firstSelection) return "Unknown"

      const fieldName = firstSelection.split(" ")[0].split("{")[0].trim()
      const field = rootType.getFields()[fieldName]

      if (!field) return "Unknown"

      return this.typeToString(field.type)
    } catch {
      return "Unknown"
    }
  }

  private typeToString(type: GraphQLOutputType): string {
    if (type instanceof GraphQLNonNull) {
      return `${this.typeToString(type.ofType)}!`
    }
    if (type instanceof GraphQLList) {
      return `[${this.typeToString(type.ofType)}]`
    }
    if (type instanceof GraphQLObjectType) {
      return type.name
    }
    if (type instanceof GraphQLScalarType) {
      return type.name
    }
    if (type instanceof GraphQLEnumType) {
      return type.name
    }
    return "Unknown"
  }

  private hashVariables(variables: Record<string, unknown>): string {
    // Create a deterministic hash of the variables
    // Sort keys to ensure consistent ordering
    const sortedKeys = Object.keys(variables).sort()
    const variablesStr = sortedKeys
      .map((key) => `${key}:${JSON.stringify(variables[key])}`)
      .join("|")
    return this.simpleHash(variablesStr)
  }

  private simpleHash(str: string): string {
    // Simple hash function for cache key generation
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private async logAndReturn(
    request: GraphQLRequest,
    startTime: number,
    response: GraphQLResponse
  ): Promise<GraphQLResponse> {
    const duration = Date.now() - startTime

    // Log the request
    await prisma.requestLog.create({
      data: {
        mockServerId: this.mockServerId,
        method: "POST",
        path: "/graphql",
        statusCode: response.statusCode,
        request: JSON.parse(JSON.stringify({
          query: request.query,
          operationName: request.operationName,
          variables: request.variables,
        })) as Prisma.InputJsonValue,
        response: JSON.parse(JSON.stringify(response.body)) as Prisma.InputJsonValue,
        duration,
      },
    })

    return response
  }
}
