"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Sparkles, Loader2 } from "lucide-react"
import { SchemaField } from "./schema-builder"

interface AIGenerateSchemaModalProps {
  onGenerate: (fields: SchemaField[]) => void
  context: "request body" | "query parameters"
}

export function AIGenerateSchemaModal({
  onGenerate,
  context,
}: AIGenerateSchemaModalProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!input.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "schema",
          input,
          context,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate")
      }

      // Convert schema object to SchemaField array
      const fields: SchemaField[] = Object.entries(data.schema).map(
        ([key, type]) => ({
          key,
          type: String(type),
        })
      )

      onGenerate(fields)
      setOpen(false)
      setInput("")
      toast({
        title: "Generated",
        description: `Generated ${fields.length} fields`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate {context} with AI</DialogTitle>
          <DialogDescription>
            Paste API documentation, example JSON, field descriptions, or any
            text describing the parameters. AI will extract the field names and
            types.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder={`Example inputs:\n\n• API docs: "email (string, required), age (number), active (boolean)"\n• JSON: {"name": "John", "age": 30}\n• Description: "User's name, email address, and list of tags"`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getPlaceholderForStatus(statusCode: string): string {
  const code = parseInt(statusCode)
  if (code >= 200 && code < 300) {
    return `Example inputs:\n\n• "Returns a user object with id, name, email, and creation date"\n• "List of products with name, price, and inventory count"\n• Existing schema or field descriptions`
  }
  if (code === 400) {
    return `Example inputs:\n\n• "Invalid request with missing required fields"\n• "Error response with field-level validation messages"\n• "Bad request with details about what went wrong"`
  }
  if (code === 401) {
    return `Example inputs:\n\n• "Unauthorized - missing or invalid token"\n• "Authentication required error"\n• "Invalid credentials response"`
  }
  if (code === 403) {
    return `Example inputs:\n\n• "Forbidden - user lacks permission"\n• "Access denied for this resource"\n• "Insufficient privileges error"`
  }
  if (code === 404) {
    return `Example inputs:\n\n• "Resource not found error"\n• "User with given ID doesn't exist"\n• "Endpoint or item not found"`
  }
  if (code === 422) {
    return `Example inputs:\n\n• "Validation failed with specific field errors"\n• "Invalid email format, password too short"\n• "Business logic validation errors"`
  }
  if (code === 429) {
    return `Example inputs:\n\n• "Rate limit exceeded, try again later"\n• "Too many requests with retry-after header"\n• "Quota exceeded error"`
  }
  if (code >= 500) {
    return `Example inputs:\n\n• "Internal server error occurred"\n• "Service temporarily unavailable"\n• "Unexpected error with error code"`
  }
  return `Describe what this ${statusCode} response should contain`
}

interface AIGenerateResponseModalProps {
  onGenerate: (response: string | { headers: string; body: string }) => void
  statusCode?: string
}

export function AIGenerateResponseModal({
  onGenerate,
  statusCode = "200",
}: AIGenerateResponseModalProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const getStatusDescription = (code: string) => {
    const descriptions: Record<string, string> = {
      "200": "successful response",
      "201": "resource created response",
      "400": "bad request error",
      "401": "unauthorized error",
      "403": "forbidden error",
      "404": "not found error",
      "422": "validation error",
      "429": "rate limit error",
      "500": "server error",
    }
    return descriptions[code] || `${code} response`
  }

  const handleGenerate = async () => {
    if (!input.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "response",
          input,
          statusCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate")
      }

      // Return both headers and body
      onGenerate({
        headers: data.headers ? JSON.stringify(data.headers, null, 2) : "",
        body: JSON.stringify(data.body, null, 2),
      })
      setOpen(false)
      setInput("")
      toast({
        title: "Generated",
        description: "Sample response with headers generated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Generate {statusCode} Response with AI
          </DialogTitle>
          <DialogDescription>
            Paste API documentation or describe what a {getStatusDescription(statusCode)} should look like.
            AI will generate a realistic sample JSON response.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder={getPlaceholderForStatus(statusCode)}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
