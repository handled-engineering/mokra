"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import {
  SchemaBuilder,
  SchemaField,
  schemaFieldsToObject,
  objectToSchemaFields,
} from "./schema-builder"
import { AIGenerateSchemaModal } from "./ai-generate-modal"
import {
  ResponseSamples,
  ResponseSample,
  responseSamplesToObject,
  objectToResponseSamples,
} from "./response-samples"

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const

interface MockEndpoint {
  id: string
  method: string
  path: string
  description?: string | null
  requestSchema?: Record<string, string> | null
  responseSchema?: unknown
  constraints?: string | null
}

interface EndpointFormProps {
  serviceId: string
  endpoint?: MockEndpoint
}

export function EndpointForm({ serviceId, endpoint }: EndpointFormProps) {
  const isEditMode = !!endpoint
  const router = useRouter()
  const { toast } = useToast()

  const [method, setMethod] = useState(endpoint?.method || "GET")
  const [path, setPath] = useState(endpoint?.path || "/")
  const [description, setDescription] = useState(endpoint?.description || "")
  const [requestSchema, setRequestSchema] = useState<SchemaField[]>(
    objectToSchemaFields(endpoint?.requestSchema)
  )
  const [queryParams, setQueryParams] = useState<SchemaField[]>(
    method === "GET" ? objectToSchemaFields(endpoint?.requestSchema) : []
  )
  const [responseSamples, setResponseSamples] = useState<ResponseSample[]>(
    objectToResponseSamples(endpoint?.responseSchema)
  )
  const [constraints, setConstraints] = useState(endpoint?.constraints || "")
  const [loading, setLoading] = useState(false)

  const isGetMethod = method === "GET"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate all response sample JSONs
      for (const sample of responseSamples) {
        if (sample.body.trim()) {
          try {
            JSON.parse(sample.body)
          } catch {
            toast({
              title: "Invalid JSON",
              description: `Response for status ${sample.statusCode} must be valid JSON`,
              variant: "destructive",
            })
            setLoading(false)
            return
          }
        }
      }

      const responseSchema = responseSamplesToObject(responseSamples)

      const bodyData = {
        method,
        path,
        description: description || undefined,
        requestSchema: isGetMethod ? undefined : schemaFieldsToObject(requestSchema),
        queryParams: isGetMethod ? schemaFieldsToObject(queryParams) : undefined,
        responseSchema: Object.keys(responseSchema).length > 0 ? responseSchema : undefined,
        constraints: constraints || undefined,
      }

      const url = isEditMode
        ? `/api/contributor/endpoints/${endpoint.id}`
        : `/api/contributor/services/${serviceId}/endpoints`

      const res = await fetch(url, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to save endpoint")
      }

      toast({
        title: "Success",
        description: isEditMode ? "Endpoint updated" : "Endpoint created",
      })
      router.push(`/contributor/services/${serviceId}`)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit Endpoint" : "Create Endpoint"}</CardTitle>
        <CardDescription>
          {isEditMode
            ? "Modify the endpoint configuration"
            : "Define a new API endpoint for this service"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="method">HTTP Method</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="path">Path</Label>
              <Input
                id="path"
                placeholder="/users/{id}"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                Use {"{param}"} for path parameters
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this endpoint do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {isGetMethod ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Query Parameters</Label>
                <AIGenerateSchemaModal
                  context="query parameters"
                  onGenerate={(fields) => setQueryParams(fields)}
                />
              </div>
              <SchemaBuilder
                label=""
                value={queryParams}
                onChange={setQueryParams}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Request Body Schema</Label>
                <AIGenerateSchemaModal
                  context="request body"
                  onGenerate={(fields) => setRequestSchema(fields)}
                />
              </div>
              <SchemaBuilder
                label=""
                value={requestSchema}
                onChange={setRequestSchema}
              />
            </div>
          )}

          <ResponseSamples
            value={responseSamples}
            onChange={setResponseSamples}
          />

          <div className="space-y-2">
            <Label htmlFor="constraints">Validation Constraints</Label>
            <Textarea
              id="constraints"
              placeholder="e.g., email must be valid, age must be between 18-100, name is required"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Describe validation rules in plain text
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : isEditMode
                ? "Update Endpoint"
                : "Create Endpoint"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
