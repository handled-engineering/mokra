"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { getMockTestById } from "@/lib/mockworld-tests/mock-data"
import { MockworldTest } from "@/lib/mockworld-tests/types"
import {
  ArrowLeft,
  Settings2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  FlaskConical
} from "lucide-react"
import { toast } from "sonner"

interface ServiceRequirementInput {
  serviceSlug: string
  serviceName: string
}

interface StateRequirementInput {
  serviceSlug: string
  resourceType: string
  resourcePath: string
  description: string
}

interface AssertInput {
  id?: string
  name: string
  sonataExpression: string
  targetServiceSlug: string
  targetResourcePath: string
}

export default function EditTestPage() {
  const params = useParams()
  const router = useRouter()
  const [test, setTest] = useState<MockworldTest | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [setupOpen, setSetupOpen] = useState(true)
  const [assertsOpen, setAssertsOpen] = useState(true)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)

  // Setup state
  const [services, setServices] = useState<ServiceRequirementInput[]>([])
  const [stateRequirements, setStateRequirements] = useState<StateRequirementInput[]>([])
  const [customInstructions, setCustomInstructions] = useState("")

  // Asserts state
  const [asserts, setAsserts] = useState<AssertInput[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = getMockTestById(params.id as string)
      if (data) {
        setTest(data)
        setName(data.name)
        setDescription(data.description || "")
        setIsActive(data.isActive)
        setServices(data.setup.services.map(s => ({
          serviceSlug: s.serviceSlug,
          serviceName: s.serviceName
        })))
        setStateRequirements(data.setup.stateRequirements.map(r => ({
          serviceSlug: r.serviceSlug,
          resourceType: r.resourceType,
          resourcePath: r.resourcePath,
          description: r.description || ""
        })))
        setCustomInstructions(data.setup.customInstructions)
        setAsserts(data.asserts.map(a => ({
          id: a.id,
          name: a.name,
          sonataExpression: a.sonataExpression,
          targetServiceSlug: a.targetServiceSlug,
          targetResourcePath: a.targetResourcePath || ""
        })))
      }
      setPageLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [params.id])

  const handleAddService = () => {
    setServices([...services, { serviceSlug: "", serviceName: "" }])
  }

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index))
  }

  const handleServiceChange = (index: number, field: keyof ServiceRequirementInput, value: string) => {
    const updated = [...services]
    updated[index][field] = value
    setServices(updated)
  }

  const handleAddStateRequirement = () => {
    setStateRequirements([...stateRequirements, {
      serviceSlug: "",
      resourceType: "",
      resourcePath: "",
      description: ""
    }])
  }

  const handleRemoveStateRequirement = (index: number) => {
    setStateRequirements(stateRequirements.filter((_, i) => i !== index))
  }

  const handleStateRequirementChange = (index: number, field: keyof StateRequirementInput, value: string) => {
    const updated = [...stateRequirements]
    updated[index][field] = value
    setStateRequirements(updated)
  }

  const handleAddAssert = () => {
    setAsserts([...asserts, {
      name: "",
      sonataExpression: "",
      targetServiceSlug: "",
      targetResourcePath: ""
    }])
  }

  const handleRemoveAssert = (index: number) => {
    setAsserts(asserts.filter((_, i) => i !== index))
  }

  const handleAssertChange = (index: number, field: keyof AssertInput, value: string) => {
    const updated = [...asserts]
    updated[index][field] = value
    setAsserts(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Test name is required")
      return
    }

    if (asserts.every(a => !a.name.trim() || !a.sonataExpression.trim())) {
      toast.error("At least one assertion is required")
      return
    }

    setSaving(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    toast.success("Test updated successfully")
    router.push(`/dashboard/tests/${params.id}`)
  }

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading test...</p>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link href="/dashboard/tests" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to tests
        </Link>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <FlaskConical className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Test not found</h3>
            <p className="text-muted-foreground mb-6">
              The test you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link href="/dashboard/tests">
              <Button>Back to tests</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link href={`/dashboard/tests/${test.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to test
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Edit Test</h1>
        <p className="text-muted-foreground mt-1">
          Update setup requirements and assertions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update test name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Test Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Books API CRUD Flow"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this test validates..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="font-normal">Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Setup Section */}
        <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Setup</CardTitle>
                    <Badge variant="secondary" className="ml-2">Requirements</Badge>
                  </div>
                  {setupOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-6">
                {/* Services */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Required Services</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddService}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Service
                    </Button>
                  </div>
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No services added. Click &quot;Add Service&quot; to add one.
                    </p>
                  ) : (
                    services.map((service, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Input
                          value={service.serviceSlug}
                          onChange={(e) => handleServiceChange(index, "serviceSlug", e.target.value)}
                          placeholder="Service slug (e.g., example-api)"
                          className="flex-1"
                        />
                        <Input
                          value={service.serviceName}
                          onChange={(e) => handleServiceChange(index, "serviceName", e.target.value)}
                          placeholder="Display name"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveService(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* State Requirements */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>State Requirements</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddStateRequirement}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add State
                    </Button>
                  </div>
                  {stateRequirements.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No state requirements. Add one if your test needs services in a specific state.
                    </p>
                  ) : (
                    stateRequirements.map((req, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">State Requirement {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStateRequirement(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            value={req.serviceSlug}
                            onChange={(e) => handleStateRequirementChange(index, "serviceSlug", e.target.value)}
                            placeholder="Service slug"
                          />
                          <Input
                            value={req.resourceType}
                            onChange={(e) => handleStateRequirementChange(index, "resourceType", e.target.value)}
                            placeholder="Resource type (e.g., books)"
                          />
                        </div>
                        <Input
                          value={req.resourcePath}
                          onChange={(e) => handleStateRequirementChange(index, "resourcePath", e.target.value)}
                          placeholder="Resource path (e.g., /v1/books)"
                        />
                        <Input
                          value={req.description}
                          onChange={(e) => handleStateRequirementChange(index, "description", e.target.value)}
                          placeholder="Description (e.g., Start with empty collection)"
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Custom Instructions */}
                <div className="space-y-2">
                  <Label htmlFor="customInstructions">Custom Instructions</Label>
                  <Textarea
                    id="customInstructions"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Instructions for AI when generating responses..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    These instructions will be used by the mock service when generating responses.
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Asserts Section */}
        <Collapsible open={assertsOpen} onOpenChange={setAssertsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Asserts</CardTitle>
                    <Badge variant="secondary" className="ml-2">Evaluation</Badge>
                  </div>
                  {assertsOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Define Sonata expressions to evaluate JSON responses
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddAssert}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Assert
                  </Button>
                </div>

                {asserts.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">
                    No assertions. Click &quot;Add Assert&quot; to add one.
                  </p>
                ) : (
                  asserts.map((assertion, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Assertion {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAssert(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Assertion Name *</Label>
                        <Input
                          value={assertion.name}
                          onChange={(e) => handleAssertChange(index, "name", e.target.value)}
                          placeholder="e.g., Create returns 201"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sonata Expression *</Label>
                        <Textarea
                          value={assertion.sonataExpression}
                          onChange={(e) => handleAssertChange(index, "sonataExpression", e.target.value)}
                          placeholder="{{response.statusCode}} == 201"
                          rows={2}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Target Service</Label>
                          <Input
                            value={assertion.targetServiceSlug}
                            onChange={(e) => handleAssertChange(index, "targetServiceSlug", e.target.value)}
                            placeholder="Service slug"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Resource Path (optional)</Label>
                          <Input
                            value={assertion.targetResourcePath}
                            onChange={(e) => handleAssertChange(index, "targetResourcePath", e.target.value)}
                            placeholder="/v1/books/{id}"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href={`/dashboard/tests/${test.id}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
