"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Key,
  Plus,
  Copy,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Server,
  AlertTriangle,
  Check,
} from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Divider } from "@/components/ui/divider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MockServer {
  id: string
  name: string
}

interface ApiKeyExclusion {
  id: string
  mockServerId: string
  mockServer: MockServer
}

interface ApiKey {
  id: string
  key: string
  name: string
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
  exclusions: ApiKeyExclusion[]
}

async function fetchApiKeys(): Promise<ApiKey[]> {
  const response = await fetch("/api/api-keys")
  if (!response.ok) {
    throw new Error("Failed to fetch API keys")
  }
  const data = await response.json()
  return data.apiKeys
}

async function fetchMockServers(): Promise<MockServer[]> {
  const response = await fetch("/api/mock-servers")
  if (!response.ok) {
    throw new Error("Failed to fetch mock servers")
  }
  const data = await response.json()
  return data.mockServers.map((s: { id: string; name: string }) => ({
    id: s.id,
    name: s.name,
  }))
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [mockServers, setMockServers] = useState<MockServer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false)

  // Form states
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [newKeyValue, setNewKeyValue] = useState("")
  const [formName, setFormName] = useState("")
  const [formExpiration, setFormExpiration] = useState<string>("never")
  const [formExcludedServers, setFormExcludedServers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [keysData, serversData] = await Promise.all([
        fetchApiKeys(),
        fetchMockServers(),
      ])
      setApiKeys(keysData)
      setMockServers(serversData)
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load API keys")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateKey = async () => {
    console.log("handleCreateKey called", { formName, formExpiration, formExcludedServers })

    if (!formName.trim()) {
      toast.error("Name is required")
      return
    }

    setIsSubmitting(true)
    try {
      let expiresAt: string | null = null
      if (formExpiration !== "never") {
        const days = parseInt(formExpiration)
        const date = new Date()
        date.setDate(date.getDate() + days)
        expiresAt = date.toISOString()
      }

      console.log("Sending request to /api/api-keys", { name: formName.trim(), expiresAt, excludedMockServerIds: formExcludedServers })

      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          expiresAt,
          excludedMockServerIds: formExcludedServers,
        }),
      })

      console.log("Response status:", response.status)

      const data = await response.json()
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to create API key")
      }

      setNewKeyValue(data.apiKey.key)
      setCreateDialogOpen(false)
      setNewKeyDialogOpen(true)
      toast.success("API key created successfully")
      await loadData()

      // Reset form
      setFormName("")
      setFormExpiration("never")
      setFormExcludedServers([])
    } catch (error) {
      console.error("Error creating API key:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create API key")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteKey = async () => {
    if (!selectedKey) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/api-keys/${selectedKey.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete API key")
      }

      toast.success("API key deleted")
      setDeleteDialogOpen(false)
      setSelectedKey(null)
      await loadData()
    } catch (error) {
      toast.error("Failed to delete API key")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegenerateKey = async () => {
    if (!selectedKey) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/api-keys/${selectedKey.id}/regenerate`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to regenerate API key")
      }

      const data = await response.json()
      setNewKeyValue(data.apiKey.key)
      setRegenerateDialogOpen(false)
      setNewKeyDialogOpen(true)
      await loadData()
    } catch (error) {
      toast.error("Failed to regenerate API key")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Failed to copy")
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col">
          <Heading>API Keys</Heading>
          <span className="text-sm text-gray-500">
            Manage API keys for accessing your mock servers
          </span>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" />
          Create API Key
        </Button>
      </div>

      <Divider className="my-6" />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/4 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Key className="mb-4 size-12 text-gray-300" />
          <p className="text-lg">No API keys</p>
          <p className="text-sm">Create an API key to start using your mock servers</p>
          <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4" />
            Create your first API key
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => {
            const expired = isExpired(apiKey.expiresAt)
            return (
              <div
                key={apiKey.id}
                className={`rounded-xl border bg-white p-4 ${
                  expired ? "border-red-200 bg-red-50/50" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg ${
                        expired ? "bg-red-100" : "bg-blue-100"
                      }`}
                    >
                      <Key className={`size-5 ${expired ? "text-red-600" : "text-blue-600"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{apiKey.name}</h3>
                        {expired && (
                          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            <AlertTriangle className="size-3" />
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono text-gray-600">
                          {apiKey.key}
                        </code>
                        <button
                          onClick={() => copyToClipboard(apiKey.key)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Copy masked key"
                        >
                          <Copy className="size-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Expires: {formatDate(apiKey.expiresAt)}
                        </span>
                        {apiKey.lastUsedAt && (
                          <span>Last used: {formatDate(apiKey.lastUsedAt)}</span>
                        )}
                        {apiKey.exclusions.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Server className="size-3" />
                            {apiKey.exclusions.length} server{apiKey.exclusions.length !== 1 ? "s" : ""} excluded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedKey(apiKey)
                        setRegenerateDialogOpen(true)
                      }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Regenerate key"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedKey(apiKey)
                        setDeleteDialogOpen(true)
                      }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-100 hover:text-red-600"
                      title="Delete key"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key to access your mock servers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && formName.trim()) {
                    e.preventDefault()
                    handleCreateKey()
                  }
                }}
                placeholder="e.g., Development, Production"
                autoFocus
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Expiration</label>
              <select
                value={formExpiration}
                onChange={(e) => setFormExpiration(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="never">Never expires</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>
            {mockServers.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Excluded Mock Servers (optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select servers this key should NOT have access to
                </p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                  {mockServers.map((server) => (
                    <label
                      key={server.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formExcludedServers.includes(server.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormExcludedServers([...formExcludedServers, server.id])
                          } else {
                            setFormExcludedServers(formExcludedServers.filter((id) => id !== server.id))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{server.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateKey} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="size-5 text-green-500" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Make sure to copy your API key now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <code className="flex-1 break-all font-mono text-sm text-gray-800">
                  {newKeyValue}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeyValue)}
                  className="shrink-0 rounded-lg bg-amber-100 p-2 text-amber-700 hover:bg-amber-200"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Store this key securely. For security reasons, we only show it once.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKeyDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Delete API Key
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedKey?.name}&quot;? This action cannot be
              undone. Any applications using this key will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteKey} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <RefreshCw className="size-5" />
              Regenerate API Key
            </DialogTitle>
            <DialogDescription>
              This will generate a new key for &quot;{selectedKey?.name}&quot;. The current key will
              stop working immediately. Any applications using the old key will need to be updated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegenerateKey} disabled={isSubmitting}>
              {isSubmitting ? "Regenerating..." : "Regenerate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
