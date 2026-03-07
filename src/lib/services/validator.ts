import * as fs from "fs/promises"
import * as path from "path"
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ServiceConfig,
  EndpointConfig,
} from "./types"

const DEFAULT_SERVICES_PATH = path.join(process.cwd(), "services")

export class ServiceValidator {
  private servicesPath: string

  constructor(servicesPath?: string) {
    this.servicesPath = servicesPath || DEFAULT_SERVICES_PATH
  }

  /**
   * Validate all services
   */
  async validateAll(): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>()

    try {
      const entries = await fs.readdir(this.servicesPath, { withFileTypes: true })
      const slugs = entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => entry.name)

      for (const slug of slugs) {
        const result = await this.validateService(slug)
        results.set(slug, result)
      }
    } catch (error) {
      console.error("Error reading services directory:", error)
    }

    return results
  }

  /**
   * Validate a single service
   */
  async validateService(slug: string): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const servicePath = path.join(this.servicesPath, slug)

    // Check service directory exists
    try {
      const stat = await fs.stat(servicePath)
      if (!stat.isDirectory()) {
        errors.push({
          type: "invalid_structure",
          path: servicePath,
          message: `${slug} is not a directory`,
        })
        return { valid: false, errors, warnings }
      }
    } catch {
      errors.push({
        type: "invalid_structure",
        path: servicePath,
        message: `Service directory does not exist: ${slug}`,
      })
      return { valid: false, errors, warnings }
    }

    // Validate service.json
    const serviceJsonPath = path.join(servicePath, "service.json")
    const serviceJsonResult = await this.validateServiceJson(serviceJsonPath, slug)
    errors.push(...serviceJsonResult.errors)
    warnings.push(...serviceJsonResult.warnings)

    // Validate endpoints
    const endpointsPath = path.join(servicePath, "endpoints")
    try {
      await fs.stat(endpointsPath)
      const endpointResults = await this.validateEndpoints(endpointsPath, slug)
      errors.push(...endpointResults.errors)
      warnings.push(...endpointResults.warnings)
    } catch {
      warnings.push({
        type: "missing_response",
        path: endpointsPath,
        message: "No endpoints directory found",
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate service.json
   */
  private async validateServiceJson(
    filePath: string,
    expectedSlug: string
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    try {
      const content = await fs.readFile(filePath, "utf-8")
      let config: ServiceConfig

      try {
        config = JSON.parse(content) as ServiceConfig
      } catch {
        errors.push({
          type: "invalid_json",
          path: filePath,
          message: "Invalid JSON in service.json",
        })
        return { errors, warnings }
      }

      // Required fields
      if (!config.name || typeof config.name !== "string") {
        errors.push({
          type: "schema_violation",
          path: filePath,
          message: "service.json must have a 'name' string field",
        })
      }

      if (!config.slug || typeof config.slug !== "string") {
        errors.push({
          type: "schema_violation",
          path: filePath,
          message: "service.json must have a 'slug' string field",
        })
      } else if (config.slug !== expectedSlug) {
        warnings.push({
          type: "empty_constraints",
          path: filePath,
          message: `Slug '${config.slug}' in service.json doesn't match folder name '${expectedSlug}'`,
        })
      }

      if (!config.version || typeof config.version !== "string") {
        errors.push({
          type: "schema_violation",
          path: filePath,
          message: "service.json must have a 'version' string field",
        })
      }

      if (config.isActive === undefined) {
        warnings.push({
          type: "empty_constraints",
          path: filePath,
          message: "service.json should have 'isActive' field (defaults to true)",
        })
      }
    } catch {
      errors.push({
        type: "missing_file",
        path: filePath,
        message: "Missing service.json file",
      })
    }

    return { errors, warnings }
  }

  /**
   * Validate all endpoints in a service
   */
  private async validateEndpoints(
    endpointsPath: string,
    serviceSlug: string
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const endpointPaths = new Set<string>()

    const folders = await this.scanEndpointFolders(endpointsPath, "")

    for (const folder of folders) {
      const result = await this.validateEndpointFolder(folder)
      errors.push(...result.errors)
      warnings.push(...result.warnings)

      // Check for duplicates
      const key = `${folder.method}:${folder.apiPath}`
      if (endpointPaths.has(key)) {
        errors.push({
          type: "duplicate_endpoint",
          path: folder.fullPath,
          message: `Duplicate endpoint: ${folder.method} ${folder.apiPath}`,
        })
      } else {
        endpointPaths.add(key)
      }
    }

    if (folders.length === 0) {
      warnings.push({
        type: "missing_response",
        path: endpointsPath,
        message: "No endpoints defined in service",
      })
    }

    return { errors, warnings }
  }

  /**
   * Scan for endpoint folders
   */
  private async scanEndpointFolders(
    basePath: string,
    relativePath: string
  ): Promise<Array<{ fullPath: string; method: string; apiPath: string }>> {
    const folders: Array<{ fullPath: string; method: string; apiPath: string }> = []
    const currentPath = path.join(basePath, relativePath)
    const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"]

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        if (httpMethods.includes(entry.name)) {
          const apiPath = this.folderPathToApiPath(relativePath)
          folders.push({
            fullPath: path.join(currentPath, entry.name),
            method: entry.name,
            apiPath,
          })
        } else {
          const subRelativePath = relativePath
            ? `${relativePath}/${entry.name}`
            : entry.name
          const subFolders = await this.scanEndpointFolders(basePath, subRelativePath)
          folders.push(...subFolders)
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return folders
  }

  /**
   * Validate a single endpoint folder
   */
  private async validateEndpointFolder(folder: {
    fullPath: string
    method: string
    apiPath: string
  }): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate endpoint.json
    const endpointJsonPath = path.join(folder.fullPath, "endpoint.json")
    try {
      const content = await fs.readFile(endpointJsonPath, "utf-8")
      try {
        const config = JSON.parse(content) as EndpointConfig

        if (!config.path || typeof config.path !== "string") {
          errors.push({
            type: "schema_violation",
            path: endpointJsonPath,
            message: "endpoint.json must have a 'path' string field",
          })
        }

        if (!config.method || typeof config.method !== "string") {
          errors.push({
            type: "schema_violation",
            path: endpointJsonPath,
            message: "endpoint.json must have a 'method' string field",
          })
        }

        if (!config.constraints) {
          warnings.push({
            type: "empty_constraints",
            path: endpointJsonPath,
            message: "No constraints defined for endpoint",
          })
        }
      } catch {
        errors.push({
          type: "invalid_json",
          path: endpointJsonPath,
          message: "Invalid JSON in endpoint.json",
        })
      }
    } catch {
      warnings.push({
        type: "missing_response",
        path: endpointJsonPath,
        message: "Missing endpoint.json (will use folder-derived config)",
      })
    }

    // Check for notes.md
    const notesPath = path.join(folder.fullPath, "notes.md")
    try {
      await fs.stat(notesPath)
    } catch {
      warnings.push({
        type: "no_notes",
        path: notesPath,
        message: "No notes.md file for AI context",
      })
    }

    // Check for responses
    const responsesPath = path.join(folder.fullPath, "responses")
    try {
      const entries = await fs.readdir(responsesPath, { withFileTypes: true })
      const statusCodes = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)

      if (statusCodes.length === 0) {
        warnings.push({
          type: "missing_response",
          path: responsesPath,
          message: "No response status codes defined",
        })
      } else if (!statusCodes.includes("200") && !statusCodes.includes("201")) {
        warnings.push({
          type: "no_200_response",
          path: responsesPath,
          message: "No 200 or 201 success response defined",
        })
      }

      // Validate each response folder
      for (const statusCode of statusCodes) {
        const statusPath = path.join(responsesPath, statusCode)
        const bodyPath = path.join(statusPath, "body.json")

        try {
          const bodyContent = await fs.readFile(bodyPath, "utf-8")
          try {
            JSON.parse(bodyContent)
          } catch {
            errors.push({
              type: "invalid_json",
              path: bodyPath,
              message: `Invalid JSON in response body for status ${statusCode}`,
            })
          }
        } catch {
          warnings.push({
            type: "missing_response",
            path: bodyPath,
            message: `Missing body.json for status ${statusCode}`,
          })
        }
      }
    } catch {
      warnings.push({
        type: "missing_response",
        path: responsesPath,
        message: "No responses directory",
      })
    }

    // Check for request schema (for POST/PUT/PATCH)
    if (["POST", "PUT", "PATCH"].includes(folder.method)) {
      const requestSchemaPath = path.join(folder.fullPath, "request", "schema.json")
      try {
        const content = await fs.readFile(requestSchemaPath, "utf-8")
        try {
          JSON.parse(content)
        } catch {
          errors.push({
            type: "invalid_json",
            path: requestSchemaPath,
            message: "Invalid JSON in request schema",
          })
        }
      } catch {
        warnings.push({
          type: "empty_constraints",
          path: requestSchemaPath,
          message: `No request schema for ${folder.method} endpoint`,
        })
      }
    }

    return { errors, warnings }
  }

  /**
   * Convert folder path to API path
   */
  private folderPathToApiPath(folderPath: string): string {
    if (!folderPath) return "/"

    const segments = folderPath.split("/").map((segment) => {
      if (segment.startsWith("{") && segment.endsWith("}")) {
        return ":" + segment.slice(1, -1)
      }
      return segment
    })

    return "/" + segments.join("/")
  }
}

/**
 * Format validation results for console output
 */
export function formatValidationResults(
  results: Map<string, ValidationResult>
): string {
  const lines: string[] = []

  results.forEach((result, slug) => {
    lines.push(`\n${result.valid ? "✓" : "✗"} ${slug}`)

    if (result.errors.length > 0) {
      lines.push("  Errors:")
      for (const error of result.errors) {
        lines.push(`    - [${error.type}] ${error.message}`)
        lines.push(`      at: ${error.path}`)
      }
    }

    if (result.warnings.length > 0) {
      lines.push("  Warnings:")
      for (const warning of result.warnings) {
        lines.push(`    - [${warning.type}] ${warning.message}`)
      }
    }
  })

  const totalServices = results.size
  const validServices = Array.from(results.values()).filter((r) => r.valid).length

  lines.push(`\n${validServices}/${totalServices} services valid`)

  return lines.join("\n")
}
