"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Divider } from "@/components/ui/divider"
import { Heading } from "@/components/ui/heading"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Shadcn/dialog"
import {
  Layers,
  Code2,
  Loader2,
  ArrowRight,
  SearchIcon,
  Plus,
  Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { analytics } from "@/lib/mixpanel"

interface Category {
  id: string
  name: string
  description?: string
}

interface MockService {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  category: string | null
  type: "rest" | "graphql"
  _count: {
    endpoints: number
  }
}

export default function ServicesPage() {
  const [services, setServices] = useState<MockService[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<MockService | null>(null)
  const [serverName, setServerName] = useState("")
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([
      fetch("/api/services").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
    ])
      .then(([servicesData, categoriesData]) => {
        setServices(servicesData.services || [])
        setCategories(categoriesData.categories || [])
        setLoading(false)

        // Track service list viewed
        analytics.serviceListViewed()
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const filteredServices = useMemo(() => {
    let filtered = services

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((s) => s.category === selectedCategory)
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.slug.toLowerCase().includes(searchLower) ||
          s.description?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [services, searchTerm, selectedCategory])

  // Track search with debounce
  useEffect(() => {
    if (searchTerm) {
      const timer = setTimeout(() => {
        analytics.serviceSearched({
          searchTerm,
          resultsCount: filteredServices.length,
        })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [searchTerm, filteredServices.length])

  // Track category filter
  useEffect(() => {
    if (selectedCategory) {
      analytics.serviceCategoryFiltered({ category: selectedCategory })
    }
  }, [selectedCategory])

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null
    const category = categories.find((c) => c.id === categoryId)
    return category?.name ?? categoryId
  }

  const openCreateDialog = (service: MockService) => {
    setSelectedService(service)
    setServerName("")
    setDialogOpen(true)

    // Track service viewed when opening create dialog
    analytics.serviceViewed({
      serviceSlug: service.slug,
      serviceName: service.name,
      serviceType: service.type,
    })
  }

  const createMockServer = async () => {
    if (!selectedService || !serverName) return

    setCreating(true)
    try {
      const res = await fetch("/api/mock-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          name: serverName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create mock server")
      }

      toast({
        title: "Success",
        description: "Mock server created! Your API key is ready.",
      })
      setDialogOpen(false)
      router.push(`/dashboard/mock-servers/${data.mockServer.id}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading services...</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col">
          <Heading>Available Services</Heading>
          <span className="text-sm text-gray-500">
            {filteredServices.length} service{filteredServices.length !== 1 ? "s" : ""} available
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-all
              duration-200 hover:border-gray-300 focus:border-blue-500 focus:outline-none
              focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search services..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm transition-all
                duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-blue-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Divider className="my-6" />

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Layers className="mb-4 size-12 text-gray-300" />
          <p className="text-lg">No services available</p>
          <p className="text-sm">Check back later for available mock services.</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <SearchIcon className="mb-4 size-12 text-gray-300" />
          <p className="text-lg">No services found</p>
          <p className="text-sm">Try adjusting your search term.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {filteredServices.map((service, index) => (
            <div
              key={service.id}
              className={cn(
                "flex w-full items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50",
                index !== filteredServices.length - 1 && "border-b border-gray-100"
              )}
            >
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg">
                  {service.logoUrl ? (
                    <Image
                      src={service.logoUrl}
                      alt={service.name}
                      width={40}
                      height={40}
                      className="size-10 object-contain"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
                      <Layers className="size-5 text-blue-600" />
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-gray-900">{service.name}</p>
                  <code className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    /{service.slug}
                  </code>
                </div>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {service.description || "No description available"}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Code2 className="size-3" />
                    {service._count.endpoints} endpoint{service._count.endpoints !== 1 ? "s" : ""}
                  </span>
                  {service.category && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                      <Tag className="size-3" />
                      {getCategoryName(service.category)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/dashboard/services/${service.slug}`}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  View Docs
                </Link>
                <Button
                  size="sm"
                  onClick={() => openCreateDialog(service)}
                >
                  <Plus className="size-4" />
                  Create Mock Server
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Mock Server Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedService?.logoUrl ? (
                <Image
                  src={selectedService.logoUrl}
                  alt={selectedService.name}
                  width={40}
                  height={40}
                  className="size-10 object-contain"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
                  <Layers className="size-5 text-blue-600" />
                </div>
              )}
              <div>
                <DialogTitle>Create Mock Server</DialogTitle>
                <DialogDescription>
                  {selectedService?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serverName">Mock Server Name</Label>
              <Input
                id="serverName"
                placeholder="My Test Server"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && serverName && !creating) {
                    createMockServer()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={createMockServer}
              disabled={!serverName || creating}
              loading={creating}
            >
              Create
              <ArrowRight className="size-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
