import { MockService, Prisma } from "@prisma/client"

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
import { StateManager } from "./state-manager"
import {
  matchPath,
  extractResourceType,
  extractResourceId,
  extractLeafResourceId,
  isCollectionEndpoint,
} from "./path-matcher"
import { generateMockResponse } from "@/lib/ai/generate-response"
import {
  validateRequestBody,
  generateStatefulResponse,
  generateNotFoundResponse,
  generateValidationErrorResponse,
  generateLimitExceededResponse,
  generateStateWriteResponse,
  generateDeleteResponse,
} from "@/lib/ai/generate-stateful-response"
import { prisma } from "@/lib/prisma"
import { findCachedResponse, cacheResponse } from "@/lib/response-cache"
import { PaginationConfig, RateLimitConfig } from "@/lib/services/types"

interface MockRequest {
  method: string
  path: string
  query: Record<string, string>
  body?: unknown
  headers: Record<string, string>
}

interface MockResponse {
  statusCode: number
  body: unknown
  headers?: Record<string, string>
}

interface EndpointContextMap {
  [path: string]: string // Keyed by endpoint path pattern (e.g., "/v1/books/:id")
}

interface EndpointNotesMap {
  [endpointKey: string]: string // Keyed by "serviceSlug:METHOD:path"
}

export class MockEngine {
  private service: MockService & { endpoints: MockEndpoint[] }
  private stateManager: StateManager
  private mockServerId: string
  private serviceSlug: string
  private serviceContext?: string
  private endpointContexts: EndpointContextMap
  private endpointNotes: EndpointNotesMap
  private paginationConfig?: PaginationConfig
  private rateLimitConfig?: RateLimitConfig

  constructor(
    service: MockService & { endpoints: MockEndpoint[] },
    mockServerId: string,
    serviceContext?: string,
    endpointContexts: EndpointContextMap = {},
    endpointNotes: EndpointNotesMap = {},
    paginationConfig?: PaginationConfig,
    rateLimitConfig?: RateLimitConfig
  ) {
    this.service = service
    this.mockServerId = mockServerId
    this.serviceSlug = service.slug
    this.stateManager = new StateManager(mockServerId)
    this.serviceContext = serviceContext
    this.endpointContexts = endpointContexts
    this.endpointNotes = endpointNotes
    this.paginationConfig = paginationConfig
    this.rateLimitConfig = rateLimitConfig
  }

  private isStatefulRequest(headers: Record<string, string>): boolean {
    const statefulHeader =
      headers["x-stateful"] ||
      headers["X-Stateful"] ||
      headers["x-Stateful"] ||
      headers["X-stateful"]
    return statefulHeader?.toLowerCase() === "true"
  }

  async handleRequest(request: MockRequest): Promise<MockResponse> {
    const startTime = Date.now()
    const isStateful = this.isStatefulRequest(request.headers)

    // Match the request to an endpoint
    const match = matchPath(request.path, request.method, this.service.endpoints)

    if (!match) {
      return this.logAndReturn(request, startTime, {
        statusCode: 404,
        body: {
          error: {
            message: "No matching endpoint found",
            type: "invalid_request_error",
          },
        },
      })
    }

    const { endpoint, params } = match

    // If stateful mode is enabled, use the stateful flow
    if (isStateful) {
      return this.handleStatefulRequest(request, endpoint, params, startTime)
    }

    // Otherwise, use the original AI-powered flow
    return this.handleAIRequest(request, endpoint, params, startTime)
  }

  private async handleStatefulRequest(
    request: MockRequest,
    endpoint: MockEndpoint,
    params: Record<string, string>,
    startTime: number
  ): Promise<MockResponse> {
    const resourceType = extractResourceType(endpoint.path)
    const resourceId = extractResourceId(params)

    // Extract custom instruction from header (case-insensitive)
    const customInstruction =
      request.headers["x-custom-instruction"] ||
      request.headers["X-Custom-Instruction"] ||
      request.headers["x-mock-instruction"] ||
      request.headers["X-Mock-Instruction"]

    // Step 1: Validation (for POST/PUT/PATCH with body)
    if (["POST", "PUT", "PATCH"].includes(request.method) && request.body) {
      const validationRules = endpoint.constraints
      if (validationRules) {
        const validationResult = await validateRequestBody(
          validationRules,
          request.body,
          endpoint
        )

        if (!validationResult.valid) {
          const errorResponse = await generateValidationErrorResponse(validationResult.errors)
          return this.logAndReturn(request, startTime, errorResponse)
        }
      }
    }

    // Step 2: Handle based on HTTP method
    switch (request.method) {
      case "GET":
        return this.handleStatefulGet(request, endpoint, params, resourceType, resourceId, startTime, customInstruction)

      case "POST":
        return this.handleStatefulPost(request, endpoint, params, resourceType, startTime, customInstruction)

      case "PUT":
      case "PATCH":
        return this.handleStatefulUpdate(request, endpoint, params, resourceType, resourceId, startTime, customInstruction)

      case "DELETE":
        return this.handleStatefulDelete(request, endpoint, params, resourceType, resourceId, startTime)

      default:
        return this.handleAIRequest(request, endpoint, params, startTime)
    }
  }

  private async handleStatefulGet(
    request: MockRequest,
    endpoint: MockEndpoint,
    params: Record<string, string>,
    resourceType: string,
    resourceId: string | null,
    startTime: number,
    customInstruction?: string
  ): Promise<MockResponse> {
    // Check Redis cache first for GET requests with custom instructions
    if (customInstruction) {
      try {
        const cached = await findCachedResponse(
          this.mockServerId,
          this.serviceSlug,
          request.method,
          endpoint.path,
          customInstruction
        )

        if (cached) {
          const response: MockResponse = {
            statusCode: cached.response.statusCode,
            body: cached.response.body,
            headers: {
              ...cached.response.headers,
              "X-Cache": "HIT",
              ...(cached.similarity ? { "X-Cache-Similarity": cached.similarity.toFixed(3) } : {}),
            },
          }
          return this.logAndReturn(request, startTime, response)
        }
      } catch (error) {
        console.error("Cache lookup error:", error)
      }
    }

    const isCollection = isCollectionEndpoint(endpoint.path)

    // If it's a collection endpoint (e.g., /orders or /orders/:orderId/items), list resources
    if (isCollection) {
      // Get all records for this resource type (regardless of which endpoint created them)
      const records = await this.stateManager.getStateForResourceType(resourceType)

      // Filter records that match the parent hierarchy if we have parent params
      const filteredRecords = Object.keys(params).length > 0
        ? records.filter((r) => {
            // Check if the record's parent path matches our params
            const recordData = r.data as Record<string, unknown>
            return Object.entries(params).every(([key, value]) => {
              // Check if the record has this parent ID stored
              return recordData[key] === value || recordData[`${key}`] === value
            })
          })
        : records

      const responseSchema = endpoint.responseSchema as Record<string, unknown> | null
      const sampleResponse = responseSchema?.["200"] || responseSchema || {}

      const response = await generateStatefulResponse({
        endpoint,
        method: request.method,
        path: request.path,
        pathParams: params,
        queryParams: request.query,
        dbRecord: { data: filteredRecords.map((r) => r.data), total: filteredRecords.length },
        sampleResponse,
        statusCode: 200,
        customInstruction,
      })

      // Cache the response
      cacheResponse(
        this.mockServerId,
        this.serviceSlug,
        request.method,
        endpoint.path,
        { statusCode: response.statusCode, body: response.body },
        customInstruction
      ).catch((error) => console.error("Error caching response:", error))

      return this.logAndReturn(request, startTime, {
        ...response,
        headers: { ...response.headers, "X-Cache": "MISS" },
      })
    }

    // Single resource endpoint - fetch specific record by composite ID
    if (resourceId) {
      // Query by resourceType + resourceId only (not endpointId)
      const record = await this.stateManager.getResource(resourceType, resourceId)

      if (!record) {
        // Use the leaf ID for the error message (last segment)
        const leafId = extractLeafResourceId(params) || resourceId
        const notFoundResponse = await generateNotFoundResponse(endpoint, leafId)
        return this.logAndReturn(request, startTime, notFoundResponse)
      }

      // Generate response by merging sample with actual record
      const responseSchema = endpoint.responseSchema as Record<string, unknown> | null
      const sampleResponse = responseSchema?.["200"] || responseSchema || {}

      const response = await generateStatefulResponse({
        endpoint,
        method: request.method,
        path: request.path,
        pathParams: params,
        queryParams: request.query,
        dbRecord: record,
        sampleResponse,
        statusCode: 200,
        customInstruction,
      })

      // Cache the response
      cacheResponse(
        this.mockServerId,
        this.serviceSlug,
        request.method,
        endpoint.path,
        { statusCode: response.statusCode, body: response.body },
        customInstruction
      ).catch((error) => console.error("Error caching response:", error))

      return this.logAndReturn(request, startTime, {
        ...response,
        headers: { ...response.headers, "X-Cache": "MISS" },
      })
    }

    // No resource ID and not a collection - this shouldn't happen normally
    return this.logAndReturn(request, startTime, {
      statusCode: 400,
      body: {
        error: {
          message: "Unable to determine resource",
          type: "invalid_request_error",
        },
      },
    })
  }

  private async handleStatefulPost(
    request: MockRequest,
    endpoint: MockEndpoint,
    params: Record<string, string>,
    resourceType: string,
    startTime: number,
    customInstruction?: string
  ): Promise<MockResponse> {
    // Check record limit (now by resourceType, not endpointId)
    const canCreate = await this.stateManager.canCreateRecord(resourceType)
    if (!canCreate) {
      const limitResponse = await generateLimitExceededResponse()
      return this.logAndReturn(request, startTime, limitResponse)
    }

    // Generate a new ID for the resource
    const body = request.body as Record<string, unknown> | undefined
    const newId = (body?.id as string) || this.generateId()

    // For nested resources, create composite resource ID including parent IDs
    // e.g., for POST /shipments/24/drafts/45/discounts, store as "24/45/newId"
    const parentIds = Object.values(params)
    const compositeId = parentIds.length > 0 ? [...parentIds, newId].join("/") : newId

    // Create the record with parent hierarchy stored for filtering
    const recordData = {
      id: newId,
      ...params, // Include parent IDs (e.g., shipmentId, draftId) for filtering
      ...(body || {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const savedRecord = await this.stateManager.createResource(
      resourceType,
      compositeId,
      recordData
    )

    if (!savedRecord) {
      const limitResponse = await generateLimitExceededResponse()
      return this.logAndReturn(request, startTime, limitResponse)
    }

    // Generate response
    const response = await generateStateWriteResponse(
      endpoint,
      request.method,
      savedRecord.data,
      params,
      customInstruction
    )

    return this.logAndReturn(request, startTime, response)
  }

  private async handleStatefulUpdate(
    request: MockRequest,
    endpoint: MockEndpoint,
    params: Record<string, string>,
    resourceType: string,
    resourceId: string | null,
    startTime: number,
    customInstruction?: string
  ): Promise<MockResponse> {
    if (!resourceId) {
      return this.logAndReturn(request, startTime, {
        statusCode: 400,
        body: {
          error: {
            message: "Resource ID is required for update operations",
            type: "invalid_request_error",
          },
        },
      })
    }

    // Check if resource exists (by resourceType + resourceId, not endpointId)
    const existingRecord = await this.stateManager.getResource(resourceType, resourceId)

    if (!existingRecord) {
      // Use leaf ID for error message
      const leafId = extractLeafResourceId(params) || resourceId
      const notFoundResponse = await generateNotFoundResponse(endpoint, leafId)
      return this.logAndReturn(request, startTime, notFoundResponse)
    }

    // Update the record, preserving parent hierarchy
    const body = request.body as Record<string, unknown> | undefined
    const updateData = {
      ...params, // Preserve parent IDs
      ...(body || {}),
      updatedAt: new Date().toISOString(),
    }

    const updatedRecord = await this.stateManager.updateResource(
      resourceType,
      resourceId,
      updateData
    )

    if (!updatedRecord) {
      return this.logAndReturn(request, startTime, {
        statusCode: 500,
        body: { error: { message: "Failed to update resource" } },
      })
    }

    // Generate response
    const response = await generateStateWriteResponse(
      endpoint,
      request.method,
      updatedRecord.data,
      params,
      customInstruction
    )

    return this.logAndReturn(request, startTime, response)
  }

  private async handleStatefulDelete(
    request: MockRequest,
    endpoint: MockEndpoint,
    params: Record<string, string>,
    resourceType: string,
    resourceId: string | null,
    startTime: number
  ): Promise<MockResponse> {
    if (!resourceId) {
      return this.logAndReturn(request, startTime, {
        statusCode: 400,
        body: {
          error: {
            message: "Resource ID is required for delete operations",
            type: "invalid_request_error",
          },
        },
      })
    }

    // Check if resource exists (by resourceType + resourceId, not endpointId)
    const existingRecord = await this.stateManager.getResource(resourceType, resourceId)

    if (!existingRecord) {
      // Use leaf ID for error message
      const leafId = extractLeafResourceId(params) || resourceId
      const notFoundResponse = await generateNotFoundResponse(endpoint, leafId)
      return this.logAndReturn(request, startTime, notFoundResponse)
    }

    // Delete the record (by resourceType + resourceId)
    const deleted = await this.stateManager.deleteResource(resourceType, resourceId)

    if (!deleted) {
      return this.logAndReturn(request, startTime, {
        statusCode: 500,
        body: { error: { message: "Failed to delete resource" } },
      })
    }

    // Generate response with leaf ID
    const leafId = extractLeafResourceId(params) || resourceId
    const response = await generateDeleteResponse(endpoint, leafId)
    return this.logAndReturn(request, startTime, response)
  }

  private async handleAIRequest(
    request: MockRequest,
    endpoint: MockEndpoint,
    params: Record<string, string>,
    startTime: number
  ): Promise<MockResponse> {
    // Extract custom instruction from header (case-insensitive)
    const customInstruction =
      request.headers["x-custom-instruction"] ||
      request.headers["X-Custom-Instruction"] ||
      request.headers["x-mock-instruction"] ||
      request.headers["X-Mock-Instruction"]

    // Check Redis cache first before making LLM call
    try {
      const cached = await findCachedResponse(
        this.mockServerId,
        this.serviceSlug,
        request.method,
        endpoint.path,
        customInstruction
      )

      if (cached) {
        // Return cached response with cache hit header
        const response: MockResponse = {
          statusCode: cached.response.statusCode,
          body: cached.response.body,
          headers: {
            ...cached.response.headers,
            "X-Cache": "HIT",
            ...(cached.similarity ? { "X-Cache-Similarity": cached.similarity.toFixed(3) } : {}),
          },
        }
        return this.logAndReturn(request, startTime, response)
      }
    } catch (error) {
      // Cache lookup failed, continue with LLM call
      console.error("Cache lookup error:", error)
    }

    // Get existing state for context
    const existingState = await this.stateManager.getAllState()

    // Look up endpoint context by path pattern
    const endpointContext = this.endpointContexts[endpoint.path]
    // Look up endpoint notes by the full key (serviceSlug:METHOD:path)
    const endpointNotesKey = `${this.serviceSlug}:${endpoint.method}:${endpoint.path}`
    const endpointNotes = this.endpointNotes[endpointNotesKey]

    // Generate response using AI
    const aiResponse = await generateMockResponse({
      endpoint,
      method: request.method,
      path: request.path,
      pathParams: params,
      queryParams: request.query,
      body: request.body,
      existingState: existingState.map((s) => ({
        resourceType: s.resourceType,
        resourceId: s.resourceId,
        data: s.data,
      })),
      documentation: this.service.documentation,
      serviceContext: this.serviceContext,
      endpointContext,
      customInstruction,
      endpointNotes,
      paginationConfig: this.paginationConfig,
      rateLimitConfig: this.rateLimitConfig,
    })

    // Handle state updates from AI (for backwards compatibility)
    if (aiResponse.stateUpdate) {
      const {
        action,
        resourceType: stateResourceType,
        resourceId: stateResourceId,
        data,
      } = aiResponse.stateUpdate

      switch (action) {
        case "create":
          await this.stateManager.createResource(
            stateResourceType,
            stateResourceId,
            data as Record<string, unknown>
          )
          break
        case "update":
          await this.stateManager.updateResource(
            stateResourceType,
            stateResourceId,
            data as Record<string, unknown>
          )
          break
        case "delete":
          await this.stateManager.deleteResource(stateResourceType, stateResourceId)
          break
      }
    }

    const response: MockResponse = {
      statusCode: aiResponse.statusCode,
      body: aiResponse.body,
      headers: {
        "X-Cache": "MISS",
      },
    }

    // Cache the response in Redis (async, don't wait)
    cacheResponse(
      this.mockServerId,
      this.serviceSlug,
      request.method,
      endpoint.path,
      {
        statusCode: aiResponse.statusCode,
        body: aiResponse.body,
      },
      customInstruction
    ).catch((error) => {
      console.error("Error caching response:", error)
    })

    return this.logAndReturn(request, startTime, response)
  }

  private generateId(): string {
    // Generate a unique ID similar to common API patterns
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    let id = ""
    for (let i = 0; i < 24; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return id
  }

  private async logAndReturn(
    request: MockRequest,
    startTime: number,
    response: MockResponse
  ): Promise<MockResponse> {
    const duration = Date.now() - startTime

    // Log the request
    await prisma.requestLog.create({
      data: {
        mockServerId: this.mockServerId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        request: (request.body || Prisma.JsonNull) as Prisma.InputJsonValue,
        response: (response.body || Prisma.JsonNull) as Prisma.InputJsonValue,
        duration,
      },
    })

    return response
  }
}
