"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TestStatusIndicator } from "@/components/tests/test-status-indicator"
import { TestRunStatus } from "@/lib/mockworld-tests/types"
import {
  ArrowLeft,
  Loader2,
  Play,
  Pencil,
  Trash2,
  FlaskConical,
  Layers,
  Plus,
  ExternalLink,
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface TestDetail {
  id: string
  name: string
  description?: string
  setup: {
    services: { serviceSlug: string; serviceName: string; mockServerId: string; logoUrl?: string | null }[]
    stateRequirements: {
      id: string
      mockServerId: string
      resourceType: string
      resourcePath: string
      initialState: unknown
      description?: string
    }[]
    customInstructions: string
  }
  asserts: {
    id: string
    name: string
    description?: string
    sonataExpression: string
    mockServerId: string
    targetResourcePath?: string
    expectedResult?: unknown
  }[]
  runs: {
    id: string
    testId: string
    status: string
    startedAt: string
    completedAt?: string
    duration?: number
    assertResults: {
      assertId: string
      assertName: string
      passed: boolean
      actualValue?: unknown
      expectedValue?: unknown
      error?: string
    }[]
    logs?: string[]
    error?: string
  }[]
  createdAt: string
  updatedAt: string
  isActive: boolean
}

type Tab = "setup" | "asserts" | "history"

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-600",
  POST: "text-blue-600",
  PUT: "text-amber-600",
  PATCH: "text-orange-600",
  DELETE: "text-red-600",
}

export default function TestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [test, setTest] = useState<TestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("setup")
  const [editingCustomInstructions, setEditingCustomInstructions] = useState(false)
  const [customInstructionsValue, setCustomInstructionsValue] = useState("")
  const [editingAssertId, setEditingAssertId] = useState<string | null>(null)
  const [editingAssertData, setEditingAssertData] = useState<{
    name: string
    description: string
    sonataExpression: string
  } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "mockServer" | "assertion" | "test"
    id: string
    name: string
  } | null>(null)
  const [addMockServerOpen, setAddMockServerOpen] = useState(false)
  const [availableMockServers, setAvailableMockServers] = useState<{
    id: string
    name: string
    service: { name: string; logoUrl: string | null }
  }[]>([])
  const [selectedMockServerId, setSelectedMockServerId] = useState<string>("")
  const [loadingMockServers, setLoadingMockServers] = useState(false)
  const [addingMockServer, setAddingMockServer] = useState(false)

  useEffect(() => {
    async function fetchTest() {
      try {
        const response = await fetch(`/api/tests/${params.id}`)
        if (!response.ok) {
          setTest(null)
          return
        }
        const data = await response.json()
        setTest(data.test)
      } catch (error) {
        console.error("Error fetching test:", error)
        setTest(null)
      } finally {
        setLoading(false)
      }
    }
    fetchTest()
  }, [params.id])

  const handleRunTest = () => {
    if (test) {
      toast.info(`Running test: ${test.name}`)
      // TODO: Implement actual test running
    }
  }

  const handleDeleteTest = () => {
    if (test) {
      setDeleteTarget({
        type: "test",
        id: test.id,
        name: test.name
      })
      setDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !test) return

    try {
      if (deleteTarget.type === "mockServer") {
        // Remove mock server from test
        const updatedMockServerIds = test.setup.services
          .filter(s => s.mockServerId !== deleteTarget.id)
          .map(s => s.mockServerId)

        const response = await fetch(`/api/tests/${params.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mockServerIds: updatedMockServerIds }),
        })

        if (!response.ok) {
          throw new Error("Failed to remove mock server")
        }

        // Update local state
        setTest({
          ...test,
          setup: {
            ...test.setup,
            services: test.setup.services.filter(s => s.mockServerId !== deleteTarget.id),
          },
        })
        toast.success("Mock server removed from test")
      } else if (deleteTarget.type === "assertion") {
        // Remove assertion from test
        const updatedAsserts = test.asserts
          .filter(a => a.id !== deleteTarget.id)
          .map(a => ({
            name: a.name,
            description: a.description,
            sonataExpression: a.sonataExpression,
            mockServerId: a.mockServerId,
            targetResourcePath: a.targetResourcePath,
            expectedResult: a.expectedResult,
          }))

        const response = await fetch(`/api/tests/${params.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asserts: updatedAsserts }),
        })

        if (!response.ok) {
          throw new Error("Failed to delete assertion")
        }

        // Update local state
        setTest({
          ...test,
          asserts: test.asserts.filter(a => a.id !== deleteTarget.id),
        })
        toast.success("Assertion deleted")
      } else if (deleteTarget.type === "test") {
        // Delete the entire test
        const response = await fetch(`/api/tests/${params.id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error("Failed to delete test")
        }

        toast.success("Test deleted")
        router.push("/dashboard/tests")
        return
      }
    } catch (error) {
      console.error("Error deleting:", error)
      const typeLabels = {
        mockServer: "mock server",
        assertion: "assertion",
        test: "test"
      }
      toast.error(`Failed to delete ${typeLabels[deleteTarget.type]}`)
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  const fetchAvailableMockServers = async () => {
    if (!test) return

    setLoadingMockServers(true)
    try {
      const response = await fetch("/api/mock-servers")
      if (!response.ok) {
        throw new Error("Failed to fetch mock servers")
      }
      const data = await response.json()

      // Filter out mock servers already in the test
      const existingIds = new Set(test.setup.services.map(s => s.mockServerId))
      const available = data.mockServers.filter(
        (ms: { id: string }) => !existingIds.has(ms.id)
      )
      setAvailableMockServers(available)
    } catch (error) {
      console.error("Error fetching mock servers:", error)
      toast.error("Failed to load mock servers")
    } finally {
      setLoadingMockServers(false)
    }
  }

  const handleOpenAddMockServer = () => {
    setSelectedMockServerId("")
    setAddMockServerOpen(true)
    fetchAvailableMockServers()
  }

  const handleAddMockServer = async () => {
    if (!selectedMockServerId || !test) return

    setAddingMockServer(true)
    try {
      const updatedMockServerIds = [
        ...test.setup.services.map(s => s.mockServerId),
        selectedMockServerId
      ]

      const response = await fetch(`/api/tests/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mockServerIds: updatedMockServerIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to add mock server")
      }

      // Find the added mock server details
      const addedServer = availableMockServers.find(ms => ms.id === selectedMockServerId)
      if (addedServer) {
        setTest({
          ...test,
          setup: {
            ...test.setup,
            services: [
              ...test.setup.services,
              {
                serviceSlug: addedServer.service.name.toLowerCase().replace(/\s+/g, "-"),
                serviceName: addedServer.service.name,
                mockServerId: addedServer.id,
                logoUrl: addedServer.service.logoUrl,
              },
            ],
          },
        })
      }

      toast.success("Mock server added to test")
      setAddMockServerOpen(false)
      setSelectedMockServerId("")
    } catch (error) {
      console.error("Error adding mock server:", error)
      toast.error("Failed to add mock server")
    } finally {
      setAddingMockServer(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "setup", label: "Setup" },
    { id: "asserts", label: "Asserts" },
    { id: "history", label: "Run History" },
  ]

  // Calculate stats
  const totalRuns = test?.runs.length ?? 0
  const passedRuns = test?.runs.filter(r => r.status === "passed").length ?? 0
  const failedRuns = test?.runs.filter(r => r.status === "failed").length ?? 0
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
        <p className="text-gray-500">Loading test...</p>
      </div>
    )
  }

  if (!test) {
    return (
      <div>
        <Link
          href="/dashboard/tests"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Back to Tests
        </Link>
        <div className="border border-gray-200 rounded-lg p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FlaskConical className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Test not found</h3>
          <p className="text-sm text-gray-500 mb-6">
            The test you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/dashboard/tests">
            <Button>Back to tests</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Back Link */}
        <Link
          href="/dashboard/tests"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
          Back to Tests
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-gray-900">{test.name}</h1>
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`h-1.5 w-1.5 rounded-full ${test.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
              {test.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {test.description || `${test.asserts.length} assertions · ${test.setup.services.length} mock servers`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-6">
          <Button onClick={handleRunTest} size="sm">
            <Play className="h-4 w-4 mr-1" />
            Run Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteTest}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "setup" && (
          <div className="space-y-6">
            {/* Mock Servers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Mock Servers</h3>
                <Button variant="outline" size="sm" onClick={handleOpenAddMockServer}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Mock Server
                </Button>
              </div>
              {test.setup.services.length === 0 ? (
                <div className="border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-500 text-sm">No mock servers configured</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Service</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Name</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Server ID</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {test.setup.services.map((service) => (
                        <tr key={service.serviceSlug} className="hover:bg-gray-50 group">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg shrink-0">
                                {service.logoUrl ? (
                                  <Image
                                    src={service.logoUrl}
                                    alt={service.serviceName}
                                    width={32}
                                    height={32}
                                    className="size-8 object-contain"
                                  />
                                ) : (
                                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100">
                                    <Layers className="size-4 text-blue-600" />
                                  </div>
                                )}
                              </div>
                              <span className="text-gray-900">{service.serviceName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {service.serviceName} Server
                          </td>
                          <td className="px-4 py-3">
                            <code className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {service.mockServerId}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link
                                href={`/dashboard/mock-servers/${service.mockServerId}`}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <ExternalLink className="h-4 w-4 text-gray-500" />
                              </Link>
                              <button
                                onClick={() => {
                                  setDeleteTarget({
                                    type: "mockServer",
                                    id: service.mockServerId,
                                    name: service.serviceName
                                  })
                                  setDeleteDialogOpen(true)
                                }}
                                className="p-1 hover:bg-gray-100 rounded text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* State Requirements */}
            {test.setup.stateRequirements.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">State Requirements</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Resource Type</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Path</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {test.setup.stateRequirements.map((req, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{req.resourceType}</td>
                          <td className="px-4 py-3">
                            <code className="font-mono text-gray-600">{req.resourcePath}</code>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{req.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Custom Instructions */}
            {(test.setup.customInstructions || editingCustomInstructions) && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Custom Instructions</h3>
                {editingCustomInstructions ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <textarea
                      value={customInstructionsValue}
                      onChange={(e) => setCustomInstructionsValue(e.target.value)}
                      className="w-full min-h-[100px] text-sm text-gray-600 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter custom instructions..."
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCustomInstructions(false)
                          setCustomInstructionsValue("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          // TODO: Save custom instructions
                          toast.success("Custom instructions updated")
                          setEditingCustomInstructions(false)
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border border-gray-200 rounded-lg p-4 group relative cursor-pointer hover:border-gray-300"
                    onClick={() => {
                      setCustomInstructionsValue(test.setup.customInstructions || "")
                      setEditingCustomInstructions(true)
                    }}
                  >
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{test.setup.customInstructions}</p>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-1 hover:bg-gray-100 rounded">
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "asserts" && (
          <div>
            {test.asserts.length === 0 ? (
              <div className="border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500 font-medium">No assertions configured</p>
                <p className="text-sm text-gray-400 mt-1">Add assertions to validate test behavior.</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Name</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Expression</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Target</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {test.asserts.map((assertion) => (
                      editingAssertId === assertion.id ? (
                        <tr key={assertion.id} className="bg-gray-50">
                          <td className="px-4 py-3" colSpan={4}>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                <input
                                  type="text"
                                  value={editingAssertData?.name || ""}
                                  onChange={(e) => setEditingAssertData(prev => prev ? {...prev, name: e.target.value} : null)}
                                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                <input
                                  type="text"
                                  value={editingAssertData?.description || ""}
                                  onChange={(e) => setEditingAssertData(prev => prev ? {...prev, description: e.target.value} : null)}
                                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Expression</label>
                                <input
                                  type="text"
                                  value={editingAssertData?.sonataExpression || ""}
                                  onChange={(e) => setEditingAssertData(prev => prev ? {...prev, sonataExpression: e.target.value} : null)}
                                  className="w-full text-sm font-mono border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingAssertId(null)
                                    setEditingAssertData(null)
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // TODO: Save assertion changes
                                    toast.success("Assertion updated")
                                    setEditingAssertId(null)
                                    setEditingAssertData(null)
                                  }}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={assertion.id} className="hover:bg-gray-50 group">
                          <td className="px-4 py-3">
                            <div className="text-gray-900 font-medium">{assertion.name}</div>
                            {assertion.description && (
                              <div className="text-gray-500 text-xs mt-0.5">{assertion.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <code className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {assertion.sonataExpression}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {test.setup.services.find(s => s.mockServerId === assertion.mockServerId)?.serviceName || assertion.mockServerId}
                            {assertion.targetResourcePath && (
                              <span className="text-gray-400 ml-1">({assertion.targetResourcePath})</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingAssertId(assertion.id)
                                  setEditingAssertData({
                                    name: assertion.name,
                                    description: assertion.description || "",
                                    sonataExpression: assertion.sonataExpression
                                  })
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Pencil className="h-4 w-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteTarget({
                                    type: "assertion",
                                    id: assertion.id,
                                    name: assertion.name
                                  })
                                  setDeleteDialogOpen(true)
                                }}
                                className="p-1 hover:bg-gray-100 rounded text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div>
            {test.runs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="font-medium">No runs yet</p>
                <p className="text-sm mt-1">Click &quot;Run Test&quot; to execute this test.</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Started</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Duration</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Results</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {test.runs.map((run) => (
                      <tr key={run.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <TestStatusIndicator status={run.status as TestRunStatus} size="lg" showIcon />
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(run.startedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {run.duration ? `${(run.duration / 1000).toFixed(1)}s` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-emerald-600">
                              {run.assertResults.filter(r => r.passed).length} passed
                            </span>
                            <span className="text-red-600">
                              {run.assertResults.filter(r => !r.passed).length} failed
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar - Stats Dashboard */}
      <div className="w-72 shrink-0 space-y-4">
        <h2 className="text-sm font-medium text-gray-900">Overview</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Runs */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Total Runs</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{totalRuns}</p>
          </div>

          {/* Pass Rate */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Pass Rate</p>
            <p className="text-2xl font-semibold text-emerald-600 mt-1">
              {totalRuns > 0 ? `${passRate}%` : "—"}
            </p>
          </div>

          {/* Assertions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Assertions</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{test.asserts.length}</p>
          </div>

          {/* Mock Servers */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Mock Servers</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{test.setup.services.length}</p>
          </div>
        </div>

        {/* Run Breakdown */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Run Results</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600">Passed</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{passedRuns}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">Failed</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{failedRuns}</span>
            </div>
          </div>
          {totalRuns > 0 && (
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${passRate}%` }}
              />
            </div>
          )}
        </div>

        {/* Test Info */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Created</span>
              <span className="text-gray-900">{new Date(test.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Updated</span>
              <span className="text-gray-900">{new Date(test.updatedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status</span>
              <span className={test.isActive ? "text-emerald-600" : "text-gray-500"}>
                {test.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTarget?.type === "mockServer" ? "Mock Server" : deleteTarget?.type === "test" ? "Test" : "Assertion"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {deleteTarget?.type === "mockServer" ? "remove" : "delete"}{" "}
              <span className="font-medium">{deleteTarget?.name}</span>
              {deleteTarget?.type === "mockServer" ? " from this test" : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteTarget(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Mock Server Dialog */}
      <Dialog open={addMockServerOpen} onOpenChange={setAddMockServerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Mock Server</DialogTitle>
            <DialogDescription>
              Select a mock server to add to this test.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingMockServers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : availableMockServers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No available mock servers to add.</p>
                <p className="text-gray-400 text-xs mt-1">All your mock servers are already in this test or you haven&apos;t created any.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mock Server
                </label>
                <select
                  value={selectedMockServerId}
                  onChange={(e) => setSelectedMockServerId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a mock server...</option>
                  {availableMockServers.map((ms) => (
                    <option key={ms.id} value={ms.id}>
                      {ms.name} ({ms.service.name})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddMockServerOpen(false)
                setSelectedMockServerId("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMockServer}
              disabled={!selectedMockServerId || addingMockServer}
            >
              {addingMockServer && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add Mock Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
