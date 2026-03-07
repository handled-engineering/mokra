import OpenAI from "openai"

const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIMENSIONS = 1536

// Lazy-loaded OpenAI client
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

export interface EmbeddingResult {
  embedding: number[]
  text: string
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI()
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })

  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const openai = getOpenAI()
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })

  return response.data.map((d) => d.embedding)
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)

  if (magnitude === 0) return 0

  return dotProduct / magnitude
}

/**
 * Find the most similar embedding from a list
 */
export function findMostSimilar(
  queryEmbedding: number[],
  embeddings: { embedding: number[]; data: unknown }[],
  threshold: number = 0.85
): { similarity: number; data: unknown } | null {
  let bestMatch: { similarity: number; data: unknown } | null = null

  for (const item of embeddings) {
    const similarity = cosineSimilarity(queryEmbedding, item.embedding)

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { similarity, data: item.data }
      }
    }
  }

  return bestMatch
}

export { EMBEDDING_DIMENSIONS }
