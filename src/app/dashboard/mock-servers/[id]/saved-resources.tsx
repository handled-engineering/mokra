"use client"

import { useState, useEffect } from "react"

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
  mockServerId: string
  initialData?: {
    total: number
    groups: ResourceGroup[]
  }
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-600",
  POST: "text-blue-600",
  PUT: "text-amber-600",
  PATCH: "text-orange-600",
  DELETE: "text-red-600",
}

export function SavedResources({ mockServerId, initialData }: SavedResourcesProps) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedRecord, setSelectedRecord] = useState<StateRecord | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "record" | "group" | "all"; id?: string; groupKey?: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mock-servers/${mockServerId}/state`)
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
  }, [mockServerId])

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
      const res = await fetch(`/api/mock-servers/${mockServerId}/state`, {
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
      const res = await fetch(`/api/mock-servers/${mockServerId}/state/clear`, {
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
      const res = await fetch(`/api/mock-servers/${mockServerId}/state/clear`, {
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Saved Resources</h3>
          <p className="text-sm text-gray-500">{total} records</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          {total > 0 && (
            <button
              onClick={() => setDeleteConfirm({ type: "all" })}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 border border-gray-200 rounded hover:bg-red-50"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-600">No saved resources</p>
          <p className="text-sm text-gray-500 mt-1">
            Use <code className="bg-gray-100 px-1 rounded">X-Stateful: true</code> header to enable.
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {groups.map((group) => {
            const groupKey = `${group.endpointId}:${group.resourceType}`
            const isExpanded = expandedGroups.has(groupKey)

            return (
              <div key={groupKey}>
                <div
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {group.endpointMethod && (
                      <span className={`text-sm font-mono font-medium ${METHOD_COLORS[group.endpointMethod] || "text-gray-600"}`}>
                        {group.endpointMethod}
                      </span>
                    )}
                    <code className="text-sm font-mono text-gray-700">
                      {group.endpointPath || group.resourceType}
                    </code>
                    <span className="text-xs text-gray-400">
                      {group.records.length} records
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm({ type: "group", groupKey, id: group.endpointId })
                    }}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Clear
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {group.records.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-start gap-4 px-4 py-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs font-mono text-gray-600">
                              {record.resourceId}
                            </code>
                            <span className="text-xs text-gray-400">
                              {new Date(record.updatedAt).toLocaleString()}
                            </span>
                          </div>
                          <pre className="text-xs font-mono text-gray-500 bg-white border border-gray-200 rounded p-2 overflow-x-auto max-h-16">
                            {JSON.stringify(record.data, null, 2).slice(0, 200)}
                            {JSON.stringify(record.data, null, 2).length > 200 && "..."}
                          </pre>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: "record", id: record.id })}
                            className="text-xs text-gray-400 hover:text-red-600 px-2 py-1"
                          >
                            Delete
                          </button>
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

      {/* View Record Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Record Details</h3>
              <p className="text-sm text-gray-500">
                <code className="bg-gray-100 px-1 rounded">{selectedRecord.resourceId}</code>
              </p>
            </div>
            <div className="p-4 overflow-auto max-h-96">
              <pre className="text-sm font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded p-4 overflow-x-auto">
                {JSON.stringify(selectedRecord.data, null, 2)}
              </pre>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Updated {new Date(selectedRecord.updatedAt).toLocaleString()}
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-2">Confirm Delete</h3>
              <p className="text-sm text-gray-500">
                {deleteConfirm.type === "all" && "Delete all saved resources? This cannot be undone."}
                {deleteConfirm.type === "group" && "Delete all records in this group? This cannot be undone."}
                {deleteConfirm.type === "record" && "Delete this record? This cannot be undone."}
              </p>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={() => {
                  if (deleteConfirm.type === "all") {
                    handleClearAll()
                  } else if (deleteConfirm.type === "group" && deleteConfirm.id) {
                    const group = groups.find(
                      (g) => `${g.endpointId}:${g.resourceType}` === deleteConfirm.groupKey
                    )
                    if (group) {
                      handleClearGroup(group.endpointId, group.resourceType)
                    }
                  } else if (deleteConfirm.type === "record" && deleteConfirm.id) {
                    handleDeleteRecord(deleteConfirm.id)
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
