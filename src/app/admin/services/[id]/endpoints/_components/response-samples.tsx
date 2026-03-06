"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react"
import { AIGenerateResponseModal } from "./ai-generate-modal"

export interface ResponseSample {
  statusCode: string
  headers: string
  body: string
}

const COMMON_STATUS_CODES = [
  { code: "200", label: "200 - OK" },
  { code: "201", label: "201 - Created" },
  { code: "400", label: "400 - Bad Request" },
  { code: "401", label: "401 - Unauthorized" },
  { code: "403", label: "403 - Forbidden" },
  { code: "404", label: "404 - Not Found" },
  { code: "422", label: "422 - Validation Error" },
  { code: "429", label: "429 - Too Many Requests" },
  { code: "500", label: "500 - Server Error" },
]

interface ResponseSamplesProps {
  value: ResponseSample[]
  onChange: (samples: ResponseSample[]) => void
}

export function ResponseSamples({ value, onChange }: ResponseSamplesProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    value.length > 0 ? 0 : null
  )

  const addSample = () => {
    // Find first unused status code
    const usedCodes = new Set(value.map((s) => s.statusCode))
    const nextCode =
      COMMON_STATUS_CODES.find((c) => !usedCodes.has(c.code))?.code || "200"
    const newSamples = [...value, { statusCode: nextCode, headers: "", body: "" }]
    onChange(newSamples)
    setExpandedIndex(newSamples.length - 1)
  }

  const removeSample = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  const updateSample = (index: number, updates: Partial<ResponseSample>) => {
    const newSamples = [...value]
    newSamples[index] = { ...newSamples[index], ...updates }
    onChange(newSamples)
  }

  const getStatusColor = (code: string) => {
    const num = parseInt(code)
    if (num >= 200 && num < 300) return "bg-green-100 text-green-800"
    if (num >= 400 && num < 500) return "bg-yellow-100 text-yellow-800"
    if (num >= 500) return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Sample Responses</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSample}>
          <Plus className="h-4 w-4 mr-2" />
          Add Response
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4 border rounded-md">
          No sample responses yet. Click &quot;Add Response&quot; to add one.
        </p>
      )}

      <div className="space-y-2">
        {value.map((sample, index) => (
          <div key={index} className="border rounded-md">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                    sample.statusCode
                  )}`}
                >
                  {sample.statusCode}
                </span>
                <span className="text-sm text-gray-600">
                  {sample.body
                    ? `${sample.body.slice(0, 50)}${
                        sample.body.length > 50 ? "..." : ""
                      }`
                    : "Empty response"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSample(index)
                  }}
                  className="h-8 w-8 text-gray-500 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
                {expandedIndex === index ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>

            {expandedIndex === index && (
              <div className="p-3 pt-0 border-t space-y-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Status Code</Label>
                    <select
                      value={sample.statusCode}
                      onChange={(e) =>
                        updateSample(index, { statusCode: e.target.value })
                      }
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {COMMON_STATUS_CODES.map((sc) => (
                        <option key={sc.code} value={sc.code}>
                          {sc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1" />
                  <AIGenerateResponseModal
                    statusCode={sample.statusCode}
                    onGenerate={(response) => {
                      if (typeof response === "object" && response !== null && "headers" in response && "body" in response) {
                        updateSample(index, {
                          headers: (response as { headers: string }).headers,
                          body: (response as { body: string }).body,
                        })
                      } else {
                        updateSample(index, { body: response as string })
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Response Headers (JSON)</Label>
                  <Textarea
                    placeholder={getHeadersPlaceholder(sample.statusCode)}
                    value={sample.headers}
                    onChange={(e) =>
                      updateSample(index, { headers: e.target.value })
                    }
                    rows={3}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Optional. Example: {`{"Content-Type": "application/json"}`}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Response Body (JSON)</Label>
                  <Textarea
                    placeholder={getPlaceholder(sample.statusCode)}
                    value={sample.body}
                    onChange={(e) =>
                      updateSample(index, { body: e.target.value })
                    }
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function getHeadersPlaceholder(statusCode: string): string {
  const code = parseInt(statusCode)
  if (code === 201) {
    return `{
  "Location": "/users/new-123"
}`
  }
  if (code === 429) {
    return `{
  "Retry-After": "60",
  "X-RateLimit-Remaining": "0"
}`
  }
  return `{
  "Content-Type": "application/json"
}`
}

function getPlaceholder(statusCode: string): string {
  const code = parseInt(statusCode)
  if (code === 200) {
    return `{
  "id": "123",
  "name": "Example",
  "createdAt": "2024-01-01T00:00:00Z"
}`
  }
  if (code === 201) {
    return `{
  "id": "new-123",
  "message": "Resource created successfully"
}`
  }
  if (code === 400) {
    return `{
  "error": "Bad Request",
  "message": "Invalid input data",
  "details": [{ "field": "email", "message": "Invalid email format" }]
}`
  }
  if (code === 401) {
    return `{
  "error": "Unauthorized",
  "message": "Authentication required"
}`
  }
  if (code === 403) {
    return `{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}`
  }
  if (code === 404) {
    return `{
  "error": "Not Found",
  "message": "Resource not found"
}`
  }
  if (code === 422) {
    return `{
  "error": "Validation Error",
  "errors": [
    { "field": "email", "message": "Email is required" }
  ]
}`
  }
  if (code === 429) {
    return `{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retryAfter": 60
}`
  }
  if (code >= 500) {
    return `{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}`
  }
  return `{}`
}

export function responseSamplesToObject(
  samples: ResponseSample[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const sample of samples) {
    const entry: { headers?: unknown; body?: unknown } = {}

    // Parse headers if present
    if (sample.headers.trim()) {
      try {
        entry.headers = JSON.parse(sample.headers)
      } catch {
        // Skip invalid JSON
      }
    }

    // Parse body if present
    if (sample.body.trim()) {
      try {
        entry.body = JSON.parse(sample.body)
      } catch {
        // Skip invalid JSON
      }
    }

    // Only add if we have at least body or headers
    if (entry.body !== undefined || entry.headers !== undefined) {
      result[sample.statusCode] = entry
    }
  }
  return result
}

export function objectToResponseSamples(
  obj: Record<string, unknown> | unknown
): ResponseSample[] {
  if (!obj || typeof obj !== "object") return []

  const objRecord = obj as Record<string, unknown>
  const keys = Object.keys(objRecord)

  // Check if it's the old format (single response without status codes)
  const isOldFormat = keys.length > 0 && !keys.some((k) => /^\d{3}$/.test(k))

  if (isOldFormat) {
    // Convert old format to new format with 200 status
    return [
      {
        statusCode: "200",
        headers: "",
        body: JSON.stringify(obj, null, 2),
      },
    ]
  }

  // New format with status codes as keys
  return Object.entries(objRecord).map(([statusCode, value]) => {
    // Check if value has the new { headers, body } format
    if (
      value &&
      typeof value === "object" &&
      ("headers" in value || "body" in value)
    ) {
      const entry = value as { headers?: unknown; body?: unknown }
      return {
        statusCode,
        headers: entry.headers
          ? JSON.stringify(entry.headers, null, 2)
          : "",
        body: entry.body
          ? JSON.stringify(entry.body, null, 2)
          : "",
      }
    }

    // Old format - value is the body directly
    return {
      statusCode,
      headers: "",
      body: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    }
  })
}
