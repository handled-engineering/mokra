import { getRedisClient } from "./redis"
import {
  generateEmbedding,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
} from "./embeddings"

const CACHE_TTL = 60 * 60 * 24 * 7 // 7 days in seconds
const SIMILARITY_THRESHOLD = 0.95 // Cosine similarity threshold for matching

interface CachedResponse {
  statusCode: number
  body: unknown
  headers?: Record<string, string>
}

interface CacheEntry {
  instruction: string
  embedding: number[]
  response: CachedResponse
  createdAt: number
}

/**
 * Generate a cache key for an endpoint
 */
function getCacheKey(
  mockServerId: string,
  serviceSlug: string,
  method: string,
  path: string
): string {
  return `mokra:cache:${mockServerId}:${serviceSlug}:${method}:${path}`
}

/**
 * Get the instruction entries key (stores list of instruction hashes)
 */
function getInstructionEntriesKey(
  mockServerId: string,
  serviceSlug: string,
  method: string,
  path: string
): string {
  return `mokra:instructions:${mockServerId}:${serviceSlug}:${method}:${path}`
}

/**
 * Store a response in the cache
 * - If customInstruction is provided, stores with embedding for semantic search
 * - If no customInstruction, stores as default response for endpoint
 */
export async function cacheResponse(
  mockServerId: string,
  serviceSlug: string,
  method: string,
  path: string,
  response: CachedResponse,
  customInstruction?: string
): Promise<void> {
  const redis = getRedisClient()

  try {
    if (customInstruction) {
      // Generate embedding for the custom instruction
      const embedding = await generateEmbedding(customInstruction)

      const entry: CacheEntry = {
        instruction: customInstruction,
        embedding,
        response,
        createdAt: Date.now(),
      }

      // Store in Redis hash with instruction hash as field
      const entriesKey = getInstructionEntriesKey(mockServerId, serviceSlug, method, path)
      const instructionHash = hashInstruction(customInstruction)

      await redis.hset(entriesKey, instructionHash, JSON.stringify(entry))
      await redis.expire(entriesKey, CACHE_TTL)
    } else {
      // Store as default response (no custom instruction)
      const cacheKey = getCacheKey(mockServerId, serviceSlug, method, path)
      const entry = {
        response,
        createdAt: Date.now(),
      }

      await redis.set(cacheKey, JSON.stringify(entry), "EX", CACHE_TTL)
    }
  } catch (error) {
    console.error("Error caching response:", error)
    // Don't throw - caching failures shouldn't break the request
  }
}

/**
 * Find a cached response
 * - If customInstruction is provided, uses semantic search to find similar instructions
 * - If no customInstruction, returns the default cached response
 */
export async function findCachedResponse(
  mockServerId: string,
  serviceSlug: string,
  method: string,
  path: string,
  customInstruction?: string
): Promise<{ response: CachedResponse; similarity?: number } | null> {
  const redis = getRedisClient()

  try {
    if (customInstruction) {
      // Semantic search for similar instructions
      const entriesKey = getInstructionEntriesKey(mockServerId, serviceSlug, method, path)
      const entries = await redis.hgetall(entriesKey)

      if (!entries || Object.keys(entries).length === 0) {
        return null
      }

      // Generate embedding for the query instruction
      const queryEmbedding = await generateEmbedding(customInstruction)

      // Find the most similar cached instruction
      let bestMatch: { entry: CacheEntry; similarity: number } | null = null

      for (const entryJson of Object.values(entries)) {
        const entry: CacheEntry = JSON.parse(entryJson)

        const similarity = cosineSimilarity(queryEmbedding, entry.embedding)

        if (similarity >= SIMILARITY_THRESHOLD) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { entry, similarity }
          }
        }
      }

      if (bestMatch) {
        return {
          response: bestMatch.entry.response,
          similarity: bestMatch.similarity,
        }
      }

      return null
    } else {
      // Look for default response (no custom instruction)
      const cacheKey = getCacheKey(mockServerId, serviceSlug, method, path)
      const cached = await redis.get(cacheKey)

      if (cached) {
        const entry = JSON.parse(cached)
        return { response: entry.response }
      }

      return null
    }
  } catch (error) {
    console.error("Error finding cached response:", error)
    return null
  }
}

/**
 * Clear cache for a specific endpoint
 */
export async function clearEndpointCache(
  mockServerId: string,
  serviceSlug: string,
  method: string,
  path: string
): Promise<void> {
  const redis = getRedisClient()

  try {
    const cacheKey = getCacheKey(mockServerId, serviceSlug, method, path)
    const entriesKey = getInstructionEntriesKey(mockServerId, serviceSlug, method, path)

    await redis.del(cacheKey, entriesKey)
  } catch (error) {
    console.error("Error clearing cache:", error)
  }
}

/**
 * Clear all cache for a mock server
 */
export async function clearMockServerCache(mockServerId: string): Promise<void> {
  const redis = getRedisClient()

  try {
    const pattern = `mokra:*:${mockServerId}:*`
    const keys = await redis.keys(pattern)

    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error("Error clearing mock server cache:", error)
  }
}

/**
 * Get cache statistics for a mock server
 */
export async function getCacheStats(mockServerId: string): Promise<{
  totalKeys: number
  instructionKeys: number
  defaultKeys: number
}> {
  const redis = getRedisClient()

  try {
    const instructionPattern = `mokra:instructions:${mockServerId}:*`
    const defaultPattern = `mokra:cache:${mockServerId}:*`

    const instructionKeys = await redis.keys(instructionPattern)
    const defaultKeys = await redis.keys(defaultPattern)

    return {
      totalKeys: instructionKeys.length + defaultKeys.length,
      instructionKeys: instructionKeys.length,
      defaultKeys: defaultKeys.length,
    }
  } catch (error) {
    console.error("Error getting cache stats:", error)
    return { totalKeys: 0, instructionKeys: 0, defaultKeys: 0 }
  }
}

/**
 * Simple hash function for instruction strings
 */
function hashInstruction(instruction: string): string {
  let hash = 0
  for (let i = 0; i < instruction.length; i++) {
    const char = instruction.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}
