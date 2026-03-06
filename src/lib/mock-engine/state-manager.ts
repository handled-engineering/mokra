import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const MAX_RECORDS_PER_RESOURCE_TYPE = 50

export interface StateEntry {
  resourceType: string
  resourceId: string
  data: Record<string, unknown>
  endpointId?: string
}

export class StateManager {
  private projectId: string

  constructor(projectId: string) {
    this.projectId = projectId
  }

  /**
   * Get a resource by type and ID.
   * Does NOT filter by endpointId - allows GET to find records created by POST.
   */
  async getResource(
    resourceType: string,
    resourceId: string
  ): Promise<Record<string, unknown> | null> {
    const state = await prisma.mockState.findFirst({
      where: {
        projectId: this.projectId,
        resourceType,
        resourceId,
      },
    })

    return state?.data as Record<string, unknown> | null
  }

  /**
   * Get a resource with its full state entry including endpointId.
   */
  async getResourceEntry(
    resourceType: string,
    resourceId: string
  ): Promise<StateEntry | null> {
    const state = await prisma.mockState.findFirst({
      where: {
        projectId: this.projectId,
        resourceType,
        resourceId,
      },
    })

    if (!state) return null

    return {
      resourceType: state.resourceType,
      resourceId: state.resourceId,
      data: state.data as Record<string, unknown>,
      endpointId: state.endpointId,
    }
  }

  /**
   * List all resources of a given type.
   */
  async listResources(resourceType: string): Promise<StateEntry[]> {
    const states = await prisma.mockState.findMany({
      where: {
        projectId: this.projectId,
        resourceType,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_RECORDS_PER_RESOURCE_TYPE,
    })

    return states.map((s) => ({
      resourceType: s.resourceType,
      resourceId: s.resourceId,
      data: s.data as Record<string, unknown>,
      endpointId: s.endpointId,
    }))
  }

  /**
   * Count records for a resource type (for enforcing limits).
   */
  async getRecordCount(resourceType: string): Promise<number> {
    return prisma.mockState.count({
      where: {
        projectId: this.projectId,
        resourceType,
      },
    })
  }

  /**
   * Check if we can create another record for this resource type.
   */
  async canCreateRecord(resourceType: string): Promise<boolean> {
    const count = await this.getRecordCount(resourceType)
    return count < MAX_RECORDS_PER_RESOURCE_TYPE
  }

  /**
   * Create a new resource.
   */
  async createResource(
    resourceType: string,
    resourceId: string,
    data: Record<string, unknown>,
    endpointId: string
  ): Promise<StateEntry | null> {
    // Check record limit per resource type
    const canCreate = await this.canCreateRecord(resourceType)
    if (!canCreate) {
      return null // Limit reached
    }

    // Check if record already exists
    const existing = await this.getResource(resourceType, resourceId)
    if (existing) {
      // Update instead of create
      return this.updateResource(resourceType, resourceId, data, endpointId)
    }

    const state = await prisma.mockState.create({
      data: {
        projectId: this.projectId,
        endpointId,
        resourceType,
        resourceId,
        data: data as Prisma.InputJsonValue,
      },
    })

    return {
      resourceType: state.resourceType,
      resourceId: state.resourceId,
      data: state.data as Record<string, unknown>,
      endpointId: state.endpointId,
    }
  }

  /**
   * Update an existing resource.
   * Finds by resourceType + resourceId regardless of which endpoint created it.
   */
  async updateResource(
    resourceType: string,
    resourceId: string,
    data: Record<string, unknown>,
    endpointId?: string
  ): Promise<StateEntry | null> {
    // Find the existing record
    const existingState = await prisma.mockState.findFirst({
      where: {
        projectId: this.projectId,
        resourceType,
        resourceId,
      },
    })

    if (!existingState) return null

    const existing = existingState.data as Record<string, unknown>
    const merged = { ...existing, ...data }

    const state = await prisma.mockState.update({
      where: { id: existingState.id },
      data: {
        data: merged as Prisma.InputJsonValue,
        // Optionally update endpointId to track which endpoint last modified it
        ...(endpointId && { endpointId }),
      },
    })

    return {
      resourceType: state.resourceType,
      resourceId: state.resourceId,
      data: state.data as Record<string, unknown>,
      endpointId: state.endpointId,
    }
  }

  /**
   * Upsert a resource (create if not exists, update if exists).
   */
  async upsertResource(
    resourceType: string,
    resourceId: string,
    data: Record<string, unknown>,
    endpointId: string
  ): Promise<StateEntry | null> {
    const existing = await this.getResource(resourceType, resourceId)

    if (existing) {
      return this.updateResource(resourceType, resourceId, data, endpointId)
    } else {
      return this.createResource(resourceType, resourceId, data, endpointId)
    }
  }

  /**
   * Delete a resource.
   * Finds by resourceType + resourceId regardless of which endpoint created it.
   */
  async deleteResource(
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const existingState = await prisma.mockState.findFirst({
      where: {
        projectId: this.projectId,
        resourceType,
        resourceId,
      },
    })

    if (!existingState) return false

    await prisma.mockState.delete({
      where: { id: existingState.id },
    })

    return true
  }

  /**
   * Get all state for the project.
   */
  async getAllState(): Promise<StateEntry[]> {
    const states = await prisma.mockState.findMany({
      where: {
        projectId: this.projectId,
      },
      orderBy: { updatedAt: "desc" },
    })

    return states.map((s) => ({
      resourceType: s.resourceType,
      resourceId: s.resourceId,
      data: s.data as Record<string, unknown>,
      endpointId: s.endpointId,
    }))
  }

  /**
   * Get all records for a specific resource type.
   */
  async getStateForResourceType(resourceType: string): Promise<StateEntry[]> {
    const states = await prisma.mockState.findMany({
      where: {
        projectId: this.projectId,
        resourceType,
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_RECORDS_PER_RESOURCE_TYPE,
    })

    return states.map((s) => ({
      resourceType: s.resourceType,
      resourceId: s.resourceId,
      data: s.data as Record<string, unknown>,
      endpointId: s.endpointId,
    }))
  }
}
