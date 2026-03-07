import * as fs from "fs/promises"
import * as path from "path"
import {
  LoadedService,
  LoadedEndpoint,
  ServiceConfig,
  EndpointConfig,
  ResponseDefinition,
  ServiceLoaderOptions,
  EndpointFolder,
  MockEndpointCompat,
  MockServiceCompat,
} from "./types"

const DEFAULT_SERVICES_PATH = path.join(process.cwd(), "services")
const DEFAULT_CACHE_TTL = process.env.NODE_ENV === "development" ? 0 : 300000 // 5 min in prod

export class ServiceLoader {
  private servicesPath: string
  private cache: Map<string, LoadedService> = new Map()
  private cacheTimestamps: Map<string, number> = new Map()
  private cacheTTL: number

  constructor(options: ServiceLoaderOptions = {}) {
    this.servicesPath = options.servicesPath || DEFAULT_SERVICES_PATH
    this.cacheTTL = options.cacheTTL ?? DEFAULT_CACHE_TTL
  }

  /**
   * Get all service slugs (fast directory scan)
   */
  async getServiceSlugs(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.servicesPath, { withFileTypes: true })
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => entry.name)
    } catch (error) {
      console.error("Error reading services directory:", error)
      return []
    }
  }

  /**
   * Load all services from filesystem
   */
  async loadAllServices(): Promise<LoadedService[]> {
    const slugs = await this.getServiceSlugs()
    const services: LoadedService[] = []

    for (const slug of slugs) {
      const service = await this.loadService(slug)
      if (service) {
        services.push(service)
      }
    }

    return services
  }

  /**
   * Load a single service by slug
   */
  async loadService(slug: string): Promise<LoadedService | null> {
    // Check cache
    if (this.cacheTTL > 0) {
      const cached = this.cache.get(slug)
      const timestamp = this.cacheTimestamps.get(slug)
      if (cached && timestamp && Date.now() - timestamp < this.cacheTTL) {
        return cached
      }
    }

    const servicePath = path.join(this.servicesPath, slug)

    try {
      // Check if directory exists
      const stat = await fs.stat(servicePath)
      if (!stat.isDirectory()) {
        return null
      }
    } catch {
      return null
    }

    try {
      // Load service.json
      const configPath = path.join(servicePath, "service.json")
      const config = await this.readJsonFile<ServiceConfig>(configPath)

      if (!config) {
        console.warn(`Missing service.json for service: ${slug}`)
        return null
      }

      // Load README.md
      const readmePath = path.join(servicePath, "README.md")
      const readme = await this.readTextFile(readmePath)

      // Load endpoints
      const endpoints = await this.loadEndpoints(servicePath)

      const service: LoadedService = {
        ...config,
        slug, // Ensure slug matches folder name
        endpoints,
        readme: readme || undefined,
      }

      // Cache the service
      if (this.cacheTTL > 0) {
        this.cache.set(slug, service)
        this.cacheTimestamps.set(slug, Date.now())
      }

      return service
    } catch (error) {
      console.error(`Error loading service ${slug}:`, error)
      return null
    }
  }

  /**
   * Load a specific endpoint
   */
  async loadEndpoint(
    slug: string,
    endpointPath: string,
    method: string
  ): Promise<LoadedEndpoint | null> {
    const service = await this.loadService(slug)
    if (!service) return null

    return (
      service.endpoints.find(
        (ep) =>
          ep.path === endpointPath && ep.method === method.toUpperCase()
      ) || null
    )
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear()
    this.cacheTimestamps.clear()
  }

  /**
   * Clear cache for a specific service
   */
  clearServiceCache(slug: string): void {
    this.cache.delete(slug)
    this.cacheTimestamps.delete(slug)
  }

  /**
   * Load all endpoints for a service
   */
  private async loadEndpoints(servicePath: string): Promise<LoadedEndpoint[]> {
    const endpointsPath = path.join(servicePath, "endpoints")

    try {
      await fs.stat(endpointsPath)
    } catch {
      // No endpoints directory
      return []
    }

    const folders = await this.scanEndpointFolders(endpointsPath, "")
    const endpoints: LoadedEndpoint[] = []

    for (const folder of folders) {
      const endpoint = await this.loadEndpointFromFolder(folder)
      if (endpoint) {
        endpoints.push(endpoint)
      }
    }

    return endpoints
  }

  /**
   * Recursively scan for endpoint folders (folders containing HTTP method subfolders)
   */
  private async scanEndpointFolders(
    basePath: string,
    relativePath: string
  ): Promise<EndpointFolder[]> {
    const folders: EndpointFolder[] = []
    const currentPath = path.join(basePath, relativePath)

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true })
      const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"]

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        if (httpMethods.includes(entry.name)) {
          // This is a method folder
          folders.push({
            servicePath: basePath,
            relativePath,
            method: entry.name,
            fullPath: path.join(currentPath, entry.name),
          })
        } else {
          // Recurse into path segment folder
          const subRelativePath = relativePath
            ? `${relativePath}/${entry.name}`
            : entry.name
          const subFolders = await this.scanEndpointFolders(basePath, subRelativePath)
          folders.push(...subFolders)
        }
      }
    } catch (error) {
      console.error(`Error scanning endpoint folders at ${currentPath}:`, error)
    }

    return folders
  }

  /**
   * Load an endpoint from its folder
   */
  private async loadEndpointFromFolder(
    folder: EndpointFolder
  ): Promise<LoadedEndpoint | null> {
    const endpointPath = folder.fullPath

    try {
      // Load endpoint.json
      const configPath = path.join(endpointPath, "endpoint.json")
      const config = await this.readJsonFile<EndpointConfig>(configPath)

      if (!config) {
        // Create minimal config from folder structure
        const apiPath = this.folderPathToApiPath(folder.relativePath)
        return {
          path: apiPath,
          method: folder.method as EndpointConfig["method"],
          isStateful: false,
          responses: {},
        }
      }

      // Load notes.md
      const notesPath = path.join(endpointPath, "notes.md")
      const notes = await this.readTextFile(notesPath)

      // Load request schema
      const requestSchemaPath = path.join(endpointPath, "request", "schema.json")
      const requestSchema = await this.readJsonFile<Record<string, unknown>>(requestSchemaPath)

      // Load responses
      const responses = await this.loadResponses(endpointPath)

      // Build the endpoint
      const endpoint: LoadedEndpoint = {
        ...config,
        path: config.path || this.folderPathToApiPath(folder.relativePath),
        method: (config.method || folder.method) as EndpointConfig["method"],
        isStateful: config.isStateful ?? false, // Default to false
        requestSchema: requestSchema || undefined,
        responses,
        notes: notes || undefined,
      }

      return endpoint
    } catch (error) {
      console.error(`Error loading endpoint from ${endpointPath}:`, error)
      return null
    }
  }

  /**
   * Load all responses for an endpoint
   */
  private async loadResponses(
    endpointPath: string
  ): Promise<Record<number, ResponseDefinition>> {
    const responsesPath = path.join(endpointPath, "responses")
    const responses: Record<number, ResponseDefinition> = {}

    try {
      const entries = await fs.readdir(responsesPath, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const statusCode = parseInt(entry.name, 10)
        if (isNaN(statusCode)) continue

        const statusPath = path.join(responsesPath, entry.name)

        // Load body.json
        const bodyPath = path.join(statusPath, "body.json")
        const body = await this.readJsonFile<unknown>(bodyPath)

        // Load headers.json
        const headersPath = path.join(statusPath, "headers.json")
        const headers = await this.readJsonFile<Record<string, string>>(headersPath)

        responses[statusCode] = {
          body: body ?? {},
          headers: headers || undefined,
        }
      }
    } catch {
      // No responses directory
    }

    return responses
  }

  /**
   * Convert folder path to API path
   * e.g., "v1/customers/{id}" -> "/v1/customers/:id"
   */
  private folderPathToApiPath(folderPath: string): string {
    if (!folderPath) return "/"

    const segments = folderPath.split("/").map((segment) => {
      // Convert {param} to :param
      if (segment.startsWith("{") && segment.endsWith("}")) {
        return ":" + segment.slice(1, -1)
      }
      return segment
    })

    return "/" + segments.join("/")
  }

  /**
   * Read and parse a JSON file
   */
  private async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8")
      return JSON.parse(content) as T
    } catch {
      return null
    }
  }

  /**
   * Read a text file
   */
  private async readTextFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, "utf-8")
    } catch {
      return null
    }
  }
}

// ============================================================================
// Adapter Functions for MockEngine Compatibility
// ============================================================================

/**
 * Convert LoadedEndpoint to MockEndpoint format for MockEngine compatibility
 */
export function toMockEndpoint(
  endpoint: LoadedEndpoint,
  serviceSlug: string
): MockEndpointCompat {
  return {
    id: `${serviceSlug}:${endpoint.method}:${endpoint.path}`,
    serviceId: serviceSlug,
    method: endpoint.method,
    path: endpoint.path,
    description: endpoint.description || null,
    requestSchema: endpoint.requestSchema || null,
    responseSchema: buildResponseSchema(endpoint.responses),
    constraints: endpoint.constraints || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Convert LoadedService to MockService format for MockEngine compatibility
 */
export function toMockService(service: LoadedService): MockServiceCompat {
  const endpoints = service.endpoints.map((ep) =>
    toMockEndpoint(ep, service.slug)
  )

  return {
    id: service.slug,
    name: service.name,
    slug: service.slug,
    description: service.description || null,
    documentation: service.readme || "",
    parsedSpec: null,
    isActive: service.isActive,
    createdAt: new Date(),
    updatedAt: new Date(),
    endpoints,
  }
}

/**
 * Build response schema map from responses (for MockEngine compatibility)
 */
function buildResponseSchema(
  responses: Record<number, ResponseDefinition>
): Record<string, unknown> | null {
  if (Object.keys(responses).length === 0) {
    return null
  }

  const schema: Record<string, unknown> = {}
  for (const [statusCode, response] of Object.entries(responses)) {
    schema[statusCode] = {
      body: response.body,
      headers: response.headers,
    }
  }
  return schema
}

/**
 * Build endpoint notes map from LoadedService
 */
export function buildEndpointNotesMap(
  service: LoadedService
): Map<string, string> {
  const notesMap = new Map<string, string>()

  for (const endpoint of service.endpoints) {
    if (endpoint.notes) {
      const key = `${service.slug}:${endpoint.method}:${endpoint.path}`
      notesMap.set(key, endpoint.notes)
    }
  }

  return notesMap
}

// Singleton instance for convenience
let defaultLoader: ServiceLoader | null = null

export function getServiceLoader(): ServiceLoader {
  if (!defaultLoader) {
    defaultLoader = new ServiceLoader()
  }
  return defaultLoader
}
