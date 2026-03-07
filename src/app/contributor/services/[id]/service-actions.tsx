"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MockService } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { RefreshCw } from "lucide-react"

interface Props {
  service: MockService
}

export function ServiceActions({ service }: Props) {
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const toggleActive = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contributor/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      })

      if (!res.ok) {
        throw new Error("Failed to update service")
      }

      toast({
        title: "Success",
        description: `Service ${service.isActive ? "deactivated" : "activated"}`,
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteService = async () => {
    if (!confirm("Are you sure you want to delete this service?")) return

    setLoading(true)
    try {
      const res = await fetch(`/api/contributor/services/${service.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete service")
      }

      toast({
        title: "Success",
        description: "Service deleted",
      })
      router.push("/contributor/services")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const regenerateDocumentation = async () => {
    if (!confirm("This will re-parse the documentation and regenerate all endpoints. Continue?")) return

    setRegenerating(true)
    try {
      const res = await fetch(`/api/contributor/services/${service.id}/regenerate`, {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error("Failed to regenerate")
      }

      const data = await res.json()
      toast({
        title: "Success",
        description: `Regenerated ${data.endpointsCount} endpoints (was ${data.previousCount})`,
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate documentation",
        variant: "destructive",
      })
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={regenerateDocumentation}
        disabled={loading || regenerating}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? "animate-spin" : ""}`} />
        {regenerating ? "Regenerating..." : "Regenerate"}
      </Button>
      <Button variant="outline" onClick={toggleActive} disabled={loading || regenerating}>
        {service.isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button variant="destructive" onClick={deleteService} disabled={loading || regenerating}>
        Delete
      </Button>
    </div>
  )
}
