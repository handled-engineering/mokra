"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronDown, ChevronRight, Trash2, Eye, RefreshCw, Database } from "lucide-react"

interface StateRecord {
  id: string
  resourceId: string
  data: unknown
  createdAt: string
  updatedAt: string
}

interface ResourceGroup {
  endpointId: string
  endpointPath: string | null
  endpointMethod: string | null
  resourceType: string
  records: StateRecord[]
}

interface SavedResourcesProps {
  projectId: string
  initialData?: {
    total: number
    groups: ResourceGroup[]
  }
}

const methodColors: Record<string, string> = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-yellow-100 text-yellow-800",
  PATCH: "bg-orange-100 text-orange-800",
  DELETE: "bg-red-100 text-red-800",
}

export function SavedResources({ projectId, initialData }: SavedResourcesProps) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedRecord, setSelectedRecord] = useState<StateRecord | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "record" | "group" | "all"; id?: string; groupKey?: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/state`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error("Failed to fetch state:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialData) {
      fetchData()
    }
  }, [projectId])

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedGroups(newExpanded)
  }

  const handleDeleteRecord = async (stateId: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/state`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateId }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error("Failed to delete record:", error)
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleClearGroup = async (endpointId: string, resourceType: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/state/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointId, resourceType }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error("Failed to clear group:", error)
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleClearAll = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/state/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error("Failed to clear all:", error)
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const groups = data?.groups || []
  const total = data?.total || 0

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Saved Resources
              </CardTitle>
              <CardDescription>
                Stateful data created via X-Stateful: true header ({total} records)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {total > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteConfirm({ type: "all" })}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No saved resources yet</p>
              <p className="text-sm mt-1">
                Use the <code className="bg-gray-100 px-1 rounded">X-Stateful: true</code> header to enable stateful responses
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const groupKey = `${group.endpointId}:${group.resourceType}`
                const isExpanded = expandedGroups.has(groupKey)

                return (
                  <div key={groupKey} className="border rounded-lg overflow-hidden">
                    {/* Group Header */}
                    <div
                      className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleGroup(groupKey)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        {group.endpointMethod && (
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              methodColors[group.endpointMethod] || "bg-gray-100"
                            }`}
                          >
                            {group.endpointMethod}
                          </span>
                        )}
                        <div>
                          <code className="text-sm font-mono">
                            {group.endpointPath || group.resourceType}
                          </code>
                          <span className="text-xs text-gray-500 ml-2">
                            ({group.records.length} records)
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm({
                            type: "group",
                            groupKey,
                            id: group.endpointId,
                          })
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Records List */}
                    {isExpanded && (
                      <div className="divide-y">
                        {group.records.map((record) => (
                          <div
                            key={record.id}
                            className="p-3 hover:bg-gray-50 flex items-start gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                                  {record.resourceId}
                                </code>
                                <span className="text-xs text-gray-400">
                                  Updated {new Date(record.updatedAt).toLocaleString()}
                                </span>
                              </div>
                              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-20 text-gray-600">
                                {JSON.stringify(record.data, null, 2).slice(0, 200)}
                                {JSON.stringify(record.data, null, 2).length > 200 && "..."}
                              </pre>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRecord(record)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  setDeleteConfirm({ type: "record", id: record.id })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Record Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Record Details</DialogTitle>
            <DialogDescription>
              Resource ID: <code className="bg-gray-100 px-1 rounded">{selectedRecord?.resourceId}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
              {selectedRecord && JSON.stringify(selectedRecord.data, null, 2)}
            </pre>
          </div>
          <DialogFooter className="text-xs text-gray-500">
            <div className="flex-1">
              Created: {selectedRecord && new Date(selectedRecord.createdAt).toLocaleString()}
              {" | "}
              Updated: {selectedRecord && new Date(selectedRecord.updatedAt).toLocaleString()}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              {deleteConfirm?.type === "all" &&
                "Are you sure you want to delete ALL saved resources? This action cannot be undone."}
              {deleteConfirm?.type === "group" &&
                "Are you sure you want to delete all records in this group? This action cannot be undone."}
              {deleteConfirm?.type === "record" &&
                "Are you sure you want to delete this record? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                if (deleteConfirm?.type === "all") {
                  handleClearAll()
                } else if (deleteConfirm?.type === "group" && deleteConfirm.id) {
                  const group = groups.find(
                    (g) => `${g.endpointId}:${g.resourceType}` === deleteConfirm.groupKey
                  )
                  if (group) {
                    handleClearGroup(group.endpointId, group.resourceType)
                  }
                } else if (deleteConfirm?.type === "record" && deleteConfirm.id) {
                  handleDeleteRecord(deleteConfirm.id)
                }
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
