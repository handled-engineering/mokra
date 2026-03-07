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

interface MatchResult {
  endpoint: MockEndpoint
  params: Record<string, string>
}

export function matchPath(
  requestPath: string,
  method: string,
  endpoints: MockEndpoint[]
): MatchResult | null {
  // Normalize path
  const normalizedPath = requestPath.startsWith("/") ? requestPath : `/${requestPath}`

  for (const endpoint of endpoints) {
    if (endpoint.method !== method) continue

    const params = extractParams(normalizedPath, endpoint.path)
    if (params !== null) {
      return { endpoint, params }
    }
  }

  return null
}

function extractParams(
  requestPath: string,
  pattern: string
): Record<string, string> | null {
  // Convert pattern like /users/:id to regex
  // Also handle /users/{id} format
  const paramNames: string[] = []
  const regexPattern = pattern
    .replace(/\/:([^/]+)/g, (_, name) => {
      paramNames.push(name)
      return "/([^/]+)"
    })
    .replace(/\/\{([^}]+)\}/g, (_, name) => {
      paramNames.push(name)
      return "/([^/]+)"
    })

  const regex = new RegExp(`^${regexPattern}$`)
  const match = requestPath.match(regex)

  if (!match) return null

  const params: Record<string, string> = {}
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1]
  })

  return params
}

/**
 * Extract a composite resource type from a path pattern.
 * For nested paths, creates a hierarchical resource type.
 *
 * Examples:
 * - /v1/customers/:id -> "customers"
 * - /shipments/inboundShipments/:id/drafts/:draftId/discounts -> "inboundShipments.drafts.discounts"
 * - /orders/:orderId/items/:itemId -> "orders.items"
 */
export function extractResourceType(path: string): string {
  const parts = path.split("/").filter(Boolean)

  // Skip version prefixes like v1, v2
  const filtered = parts.filter((p) => !p.match(/^v\d+$/))

  // Collect all non-param segments to create a composite resource type
  const resourceParts: string[] = []

  for (const part of filtered) {
    if (!part.startsWith(":") && !part.startsWith("{")) {
      resourceParts.push(part)
    }
  }

  // Join with dots to create hierarchical resource type
  // e.g., "shipments.inboundShipments.drafts.discounts"
  return resourceParts.join(".") || "resource"
}

/**
 * Extract a composite resource ID from path parameters.
 * For nested paths, creates a composite ID that uniquely identifies the resource.
 *
 * Examples:
 * - { id: "123" } -> "123"
 * - { id: "24", draftId: "45" } -> "24/45"
 * - { shipmentId: "1", draftId: "2", discountId: "3" } -> "1/2/3"
 */
export function extractResourceId(params: Record<string, string>): string | null {
  const paramValues = Object.values(params)

  if (paramValues.length === 0) {
    return null
  }

  // For single ID, return it directly
  if (paramValues.length === 1) {
    return paramValues[0]
  }

  // For multiple IDs (nested resources), create a composite ID
  // Join all param values with "/" to maintain hierarchy
  return paramValues.join("/")
}

/**
 * Extract the leaf (final) resource ID from params.
 * Useful for getting just the last ID in nested resources.
 *
 * Example: { shipmentId: "1", draftId: "2" } -> "2"
 */
export function extractLeafResourceId(params: Record<string, string>): string | null {
  const paramValues = Object.values(params)
  return paramValues.length > 0 ? paramValues[paramValues.length - 1] : null
}

/**
 * Extract the parent resource path from params (excludes the leaf ID).
 * Useful for hierarchical queries.
 *
 * Example: { shipmentId: "1", draftId: "2", discountId: "3" } -> "1/2"
 */
export function extractParentPath(params: Record<string, string>): string | null {
  const paramValues = Object.values(params)

  if (paramValues.length <= 1) {
    return null
  }

  return paramValues.slice(0, -1).join("/")
}

/**
 * Check if a path pattern represents a collection (list) endpoint.
 * A collection endpoint is one that doesn't end with a parameter.
 *
 * Examples:
 * - /orders -> true (list orders)
 * - /orders/:id -> false (single order)
 * - /orders/:orderId/items -> true (list items)
 * - /orders/:orderId/items/:itemId -> false (single item)
 */
export function isCollectionEndpoint(path: string): boolean {
  const parts = path.split("/").filter(Boolean)
  if (parts.length === 0) return true

  const lastPart = parts[parts.length - 1]
  return !lastPart.startsWith(":") && !lastPart.startsWith("{")
}

/**
 * Get the leaf resource type (the last non-param segment).
 *
 * Examples:
 * - /orders/:id -> "orders"
 * - /shipments/:id/drafts/:draftId/discounts -> "discounts"
 */
export function extractLeafResourceType(path: string): string {
  const parts = path.split("/").filter(Boolean)

  // Skip version prefixes
  const filtered = parts.filter((p) => !p.match(/^v\d+$/))

  // Find the last non-param segment
  for (let i = filtered.length - 1; i >= 0; i--) {
    const part = filtered[i]
    if (!part.startsWith(":") && !part.startsWith("{")) {
      return part
    }
  }

  return filtered[0] || "resource"
}
