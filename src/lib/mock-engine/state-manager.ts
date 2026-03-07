import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const MAX_RECORDS_PER_RESOURCE_TYPE = 50

export interface StateEntry {
  resourceType: string
  resourceId: string
  data: Record<string, unknown>
}

export class StateManager {
  private mockServerId: string

  constructor(mockServerId: string) {
    this.mockServerId = mockServerId
  }

  /**
   * Get a resource by type and ID.
   */
  async getResource(
    resourceType: string,
    resourceId: string
  ): Promise<Record<string, unknown> | null> {
    const state = await prisma.mockState.findFirst({
      where: {
        mockServerId: this.mockServerId,
        resourceType,
        resourceId,
      },
    })

    return state?.data as Record<string, unknown> | null
  }

  /**
   * Get a resource with its full state entry.
   */
  async getResourceEntry(
    resourceType: string,
    resourceId: string
  ): Promise<StateEntry | null> {
    const state = await prisma.mockState.findFirst({
      where: {
        mockServerId: this.mockServerId,
        resourceType,
        resourceId,
      },
    })

    if (!state) return null

    return {
      resourceType: state.resourceType,
      resourceId: state.resourceId,
      data: state.data as Record<string, unknown>,
    }
  }

  /**
   * List all resources of a given type.
   */
  async listResources(resourceType: string): Promise<StateEntry[]> {
    const states = await prisma.mockState.findMany({
      where: {
        mockServerId: this.mockServerId,
        resourceType,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_RECORDS_PER_RESOURCE_TYPE,
    })

    return states.map((s) => ({
      resourceType: s.resourceType,
      resourceId: s.resourceId,
      data: s.data as Record<string, unknown>,
    }))
  }

  /**
   * Count records for a resource type (for enforcing limits).
   */
  async getRecordCount(resourceType: string): Promise<number> {
    return prisma.mockState.count({
      where: {
        mockServerId: this.mockServerId,
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
    data: Record<string, unknown>
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
      return this.updateResource(resourceType, resourceId, data)
    }

    const state = await prisma.mockState.create({
      data: {
        mockServerId: this.mockServerId,
        resourceType,
        resourceId,
        data: data as Prisma.InputJsonValue,
      },
    })

    return {
      resourceType: state.resourceType,
      resourceId: state.resourceId,
      data: state.data as Record<string, unknown>,
    }
  }

  /**
   * Update an existing resource.
   */
  async updateResource(
    resourceType: string,
    resourceId: string,
    data: Record<string, unknown>
  ): Promise<StateEntry | null> {
    // Find the existing record
    const existingState = await prisma.mockState.findFirst({
      where: {
        mockServerId: this.mockServerId,
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
      },
    })

    return {
      resourceType: state.resourceType,
      resourceId: state.resourceId,
      data: state.data as Record<string, unknown>,
    }
  }

  /**
   * Upsert a resource (create if not exists, update if exists).
   */
  async upsertResource(
    resourceType: string,
    resourceId: string,
    data: Record<string, unknown>
  ): Promise<StateEntry | null> {
    const existing = await this.getResource(resourceType, resourceId)

    if (existing) {
      return this.updateResource(resourceType, resourceId, data)
    } else {
      return this.createResource(resourceType, resourceId, data)
    }
  }

  /**
   * Delete a resource.
   */
  async deleteResource(
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const existingState = await prisma.mockState.findFirst({
      where: {
        mockServerId: this.mockServerId,
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
   * Get all state for the mock server.
   */
  async getAllState(): Promise<StateEntry[]> {
    const states = await prisma.mockState.findMany({
      where: {
        mockServerId: this.mockServerId,
      },
      orderBy: { updatedAt: "desc" },
    })

    return states.map((s) => ({
      resourceType: s.resourceType,
      resourceId: s.resourceId,
      data: s.data as Record<string, unknown>,
    }))
  }

  /**
   * Get all records for a specific resource type.
   */
  async getStateForResourceType(resourceType: string): Promise<StateEntry[]> {
    const states = await prisma.mockState.findMany({
      where: {
        mockServerId: this.mockServerId,
        resourceType,
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_RECORDS_PER_RESOURCE_TYPE,
    })

    return states.map((s) => ({
      resourceType: s.resourceType,
      resourceId: s.resourceId,
      data: s.data as Record<string, unknown>,
    }))
  }
}
