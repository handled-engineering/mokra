/**
 * File-based service and endpoint type definitions
 */

// ============================================================================
// Service Types
// ============================================================================

export interface ServiceConfig {
  name: string
  slug: string
  description?: string
  version: string
  type?: "rest" | "graphql" // Defaults to "rest"
  baseUrl?: string
  documentationUrl?: string
  defaultHeaders?: Record<string, string>
  authentication?: {
    type: "api_key" | "bearer" | "basic" | "oauth2" | "none"
    headerName?: string // Custom header name for api_key type (default: "X-API-Key")
    required?: boolean // If true, returns 401 when auth header missing (default: true)
    validateFormat?: boolean // If true, validates auth format (e.g., Bearer token format)
  }
  // Rate limiting configuration
  rateLimit?: {
    enabled?: boolean
    requestsPerMinute?: number
    burstLimit?: number
  }
  // GraphQL-specific configuration
  graphql?: {
    versionHeader?: string // Header to determine version (default: "X-API-Version")
    versionPath?: boolean // If true, version is in the path (e.g., /v1/graphql)
    defaultVersion?: string // Default version if not specified
  }
  isActive: boolean
}

export interface LoadedService extends ServiceConfig {
  endpoints: LoadedEndpoint[]
  graphqlSchemas?: GraphQLSchemaVersion[] // For GraphQL services
  paginationConfig?: PaginationConfig // Pagination rules from pagination.json
  rateLimitConfig?: RateLimitConfig // Rate limit rules from rate-limit.json
  readme?: string
}

// ============================================================================
// Pagination Config Types
// ============================================================================

export interface PaginationConfig {
  type: "cursor" | "offset" | "page"
  defaultPageSize: number
  maxPageSize: number
  cursorField?: string // For cursor-based pagination
  connectionPattern?: {
    edgesField: string
    nodeField: string
    pageInfoField: string
    pageInfoFields: {
      hasNextPage: string
      hasPreviousPage: string
      startCursor?: string
      endCursor?: string
      totalCount?: string
    }
  }
  offsetPattern?: {
    offsetParam: string
    limitParam: string
  }
  pagePattern?: {
    pageParam: string
    perPageParam: string
  }
  notes?: string
}

// ============================================================================
// Rate Limit Config Types
// ============================================================================

export interface RateLimitConfig {
  type: "fixed-window" | "sliding-window" | "leaky-bucket" | "token-bucket"
  costBased?: boolean
  bucket?: {
    maxCapacity: number
    restoreRate: number
    restoreRateUnit: "per_second" | "per_minute" | "per_hour"
  }
  fixedWindow?: {
    requestsPerWindow: number
    windowSizeSeconds: number
  }
  queryCosts?: {
    default: number
    mutations?: number
    connections?: {
      base: number
      perItem: number
    }
  }
  headers?: {
    limit?: string
    remaining?: string
    reset?: string
    available?: string
    format?: string
  }
  notes?: string
}

// ============================================================================
// GraphQL Types
// ============================================================================

export interface GraphQLSchemaVersion {
  version: string // e.g., "v1", "2024-01-15"
  schema: string // Raw GraphQL schema string
  schemaPath: string // Path to schema file
}

export interface GraphQLOperation {
  type: "query" | "mutation" | "subscription"
  name: string
  variables?: Record<string, unknown>
  selectionSet: string[] // Fields being requested
}

// ============================================================================
// Endpoint Types
// ============================================================================

export interface ParameterDefinition {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object"
  description?: string
  required?: boolean
  default?: unknown
  enum?: unknown[]
  pattern?: string
  example?: unknown
}

export interface EndpointConfig {
  path: string
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  description?: string
  summary?: string
  tags?: string[]
  pathParameters?: Record<string, ParameterDefinition>
  queryParameters?: Record<string, ParameterDefinition>
  constraints?: string
  defaultStatusCode?: number
  isStateful?: boolean // Defaults to false - set to true for CRUD state persistence
}

export interface ResponseDefinition {
  body: unknown
  headers?: Record<string, string>
}

export interface LoadedEndpoint extends EndpointConfig {
  requestSchema?: Record<string, unknown>
  responses: Record<number, ResponseDefinition>
  notes?: string
  graphqlSchema?: string // For GraphQL endpoints
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  type: "missing_file" | "invalid_json" | "schema_violation" | "duplicate_endpoint" | "invalid_structure"
  path: string
  message: string
}

export interface ValidationWarning {
  type: "missing_response" | "no_notes" | "empty_constraints" | "no_200_response"
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

// ============================================================================
// Loader Types
// ============================================================================

export interface ServiceLoaderOptions {
  cacheTTL?: number // milliseconds, 0 = no cache
  servicesPath?: string
}

export interface EndpointFolder {
  servicePath: string
  relativePath: string
  method: string
  fullPath: string
}

// ============================================================================
// Adapter Types (for compatibility with existing MockEngine)
// ============================================================================

export interface MockEndpointCompat {
  id: string
  serviceId: string
  method: string
  path: string
  description: string | null
  requestSchema: Record<string, unknown> | null
  responseSchema: Record<string, unknown> | null
  constraints: string | null
  createdAt: Date
  updatedAt: Date
}

export interface MockServiceCompat {
  id: string
  name: string
  slug: string
  description: string | null
  documentation: string
  parsedSpec: unknown
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  endpoints: MockEndpointCompat[]
}
