import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"

export type AIProvider = "anthropic" | "groq"

export interface AIMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface AICompletionOptions {
  messages: AIMessage[]
  system?: string
  maxTokens?: number
}

export interface AICompletionResult {
  content: string
  provider: AIProvider
  model: string
}

// Default provider from environment, fallback to groq
export function getDefaultProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase()
  if (provider === "anthropic" || provider === "groq") {
    return provider
  }
  // Default to groq if GROQ_API_KEY is set, otherwise anthropic
  if (process.env.GROQ_API_KEY) {
    return "groq"
  }
  return "anthropic"
}

// Anthropic client singleton
let anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicClient
}

// Groq client singleton
let groqClient: Groq | null = null
function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groqClient
}

// Models
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
const GROQ_MODEL = "llama-3.1-8b-instant" // 8B model, 560 t/s, up to 131k output tokens

export async function generateCompletion(
  options: AICompletionOptions,
  provider?: AIProvider
): Promise<AICompletionResult> {
  const selectedProvider = provider || getDefaultProvider()

  if (selectedProvider === "groq") {
    return generateGroqCompletion(options)
  } else {
    return generateAnthropicCompletion(options)
  }
}

async function generateAnthropicCompletion(
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const client = getAnthropicClient()

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: options.maxTokens || 4096,
    system: options.system,
    messages: options.messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
  })

  const content = response.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Anthropic")
  }

  return {
    content: content.text,
    provider: "anthropic",
    model: ANTHROPIC_MODEL,
  }
}

// Max output tokens for Groq models (llama-3.1-8b-instant supports up to 131k)
const GROQ_MAX_TOKENS = 131072

async function generateGroqCompletion(
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const client = getGroqClient()

  // Build messages array with system message first if provided
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  if (options.system) {
    messages.push({
      role: "system",
      content: options.system,
    })
  }

  for (const msg of options.messages) {
    messages.push({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    })
  }

  // Cap max_tokens at Groq's limit
  const maxTokens = Math.max(options.maxTokens || GROQ_MAX_TOKENS, GROQ_MAX_TOKENS)

  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: maxTokens,
    messages,
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("No content in Groq response")
  }

  return {
    content,
    provider: "groq",
    model: GROQ_MODEL,
  }
}
