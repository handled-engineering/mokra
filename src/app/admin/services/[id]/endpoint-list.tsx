"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MockEndpoint } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Trash2, Pencil, Plus } from "lucide-react"

interface Props {
  endpoints: MockEndpoint[]
  serviceId: string
}

const methodColors: Record<string, string> = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-yellow-100 text-yellow-800",
  PATCH: "bg-orange-100 text-orange-800",
  DELETE: "bg-red-100 text-red-800",
}

export function EndpointList({ endpoints, serviceId }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const deleteEndpoint = async (id: string) => {
    if (!confirm("Are you sure you want to delete this endpoint?")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/endpoints/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete endpoint")
      }

      toast({
        title: "Success",
        description: "Endpoint deleted",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete endpoint",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/admin/services/${serviceId}/endpoints/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Endpoint
          </Link>
        </Button>
      </div>
      {endpoints.map((endpoint) => (
        <div
          key={endpoint.id}
          className="flex items-start gap-4 p-4 rounded-lg border hover:bg-gray-50"
        >
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              methodColors[endpoint.method] || "bg-gray-100"
            }`}
          >
            {endpoint.method}
          </span>
          <div className="flex-1">
            <code className="text-sm font-mono">{endpoint.path}</code>
            {endpoint.description && (
              <p className="text-sm text-gray-600 mt-1">
                {endpoint.description}
              </p>
            )}
            {endpoint.constraints && (
              <p className="text-xs text-gray-500 mt-1">
                Constraints: {endpoint.constraints}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-gray-600 hover:text-gray-900"
            >
              <Link href={`/admin/services/${serviceId}/endpoints/${endpoint.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteEndpoint(endpoint.id)}
              disabled={deletingId === endpoint.id}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {endpoints.length === 0 && (
        <p className="text-gray-500 text-center py-4">No endpoints found</p>
      )}
    </div>
  )
}
