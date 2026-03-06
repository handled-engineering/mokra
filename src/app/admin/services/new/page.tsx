"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function NewServicePage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [documentation, setDocumentation] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, documentation }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create service")
      }

      toast({
        title: "Success",
        description: `Service created with ${data.endpointsCount} endpoints`,
      })
      router.push(`/admin/services/${data.service.id}`)
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
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create Mock Service</h1>

      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>
            Paste your API documentation and we&apos;ll automatically extract endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                placeholder="e.g., Stripe API"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of this API"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentation">API Documentation</Label>
              <Textarea
                id="documentation"
                placeholder="Paste your API documentation here. Can be OpenAPI/Swagger JSON, Postman collection, or plain text describing the endpoints..."
                value={documentation}
                onChange={(e) => setDocumentation(e.target.value)}
                rows={15}
                required
              />
              <p className="text-sm text-gray-500">
                Supports any format: OpenAPI, Swagger, Postman, or plain text descriptions
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating & Parsing..." : "Create Service"}
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Example Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
{`# Stripe Customers API

## Endpoints

### Create Customer
POST /v1/customers
Creates a new customer with the given details.

Request body:
- email (string, required): Customer's email
- name (string): Customer's name
- phone (string): Customer's phone
- metadata (object): Key-value pairs

Response:
- id (string): Unique customer ID (cus_xxx)
- email (string)
- name (string)
- created (timestamp)

### Get Customer
GET /v1/customers/:id
Retrieves a customer by ID.

### Update Customer
POST /v1/customers/:id
Updates an existing customer.

### Delete Customer
DELETE /v1/customers/:id
Deletes a customer.

### List Customers
GET /v1/customers
Lists all customers. Supports pagination.

Query params:
- limit (number): Max 100
- starting_after (string): Cursor`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
