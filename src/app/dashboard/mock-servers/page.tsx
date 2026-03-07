"use client"

import {
  ChevronDownIcon,
  ChevronRightIcon,
  Server,
  SearchIcon,
  Plus,
  Activity,
  Database,
  Layers,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Divider } from "@/components/ui/divider"
import { Heading } from "@/components/ui/heading"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Shadcn/select"

interface MockService {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
}

interface MockServer {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  service: MockService
  _count: {
    requestLogs: number
    mockStates: number
  }
}

interface GroupedMockServers {
  serviceName: string
  serviceSlug: string
  serviceLogoUrl: string | null
  mockServers: MockServer[]
}

interface ServiceOption {
  id: string
  name: string
  slug: string
  logoUrl: string | null
}

async function fetchMockServers(): Promise<MockServer[]> {
  const response = await fetch("/api/mock-servers")
  if (!response.ok) {
    throw new Error("Failed to fetch mock servers")
  }
  const data = await response.json()
  return data.mockServers
}

async function fetchServices(): Promise<ServiceOption[]> {
  const response = await fetch("/api/services")
  if (!response.ok) {
    throw new Error("Failed to fetch services")
  }
  const data = await response.json()
  return data.services
}

export default function MockServersPage() {
  const [mockServers, setMockServers] = useState<MockServer[]>([])
  const [filteredMockServers, setFilteredMockServers] = useState<MockServer[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const loadMockServers = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await fetchMockServers()
      setMockServers(data)
      setFilteredMockServers(data)

      // Expand all groups by default
      const allServiceNames = new Set<string>(data.map((s) => s.service.name))
      setExpandedGroups(allServiceNames)
    } catch (error) {
      console.error("Error fetching mock servers:", error)
      toast.error("Failed to load mock servers")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadServices = useCallback(async () => {
    try {
      const servicesData = await fetchServices()
      const sorted = servicesData.sort((a, b) => a.name.localeCompare(b.name))
      setServices(sorted)
    } catch (error) {
      console.error("Error fetching services:", error)
    }
  }, [])

  const applyFilters = useCallback(
    (search: string, status: string | null, serviceId: string | null) => {
      let filtered = [...mockServers]

      if (search) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(searchLower) ||
            s.service.name.toLowerCase().includes(searchLower)
        )
      }

      if (status) {
        const isActive = status === "active"
        filtered = filtered.filter((s) => s.isActive === isActive)
      }

      if (serviceId) {
        filtered = filtered.filter((s) => s.service.id === serviceId)
      }

      setFilteredMockServers(filtered)

      // Update expanded groups based on filtered results
      const filteredServiceNames = new Set<string>(filtered.map((s) => s.service.name))
      setExpandedGroups(filteredServiceNames)
    },
    [mockServers]
  )

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedSearch = useCallback(
    (value: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        applyFilters(value, selectedStatus, selectedServiceId)
      }, 300)
    },
    [applyFilters, selectedStatus, selectedServiceId]
  )

  useEffect(() => {
    loadMockServers()
    loadServices()
  }, [loadMockServers, loadServices])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    debouncedSearch(value)
  }

  const handleStatusChange = (value: string) => {
    const status = value === "all" ? null : value
    setSelectedStatus(status)
    applyFilters(searchTerm, status, selectedServiceId)
  }

  const handleServiceChange = (value: string) => {
    const serviceId = value === "all" ? null : value
    setSelectedServiceId(serviceId)
    applyFilters(searchTerm, selectedStatus, serviceId)
  }

  // Group mock servers by service name
  const groupedMockServers = useMemo(() => {
    const groups: Map<string, GroupedMockServers> = new Map()

    filteredMockServers.forEach((mockServer) => {
      const key = mockServer.service.name
      if (!groups.has(key)) {
        groups.set(key, {
          serviceName: mockServer.service.name,
          serviceSlug: mockServer.service.slug,
          serviceLogoUrl: mockServer.service.logoUrl,
          mockServers: [],
        })
      }
      groups.get(key)!.mockServers.push(mockServer)
    })

    // Sort groups alphabetically by service name
    return Array.from(groups.values()).sort((a, b) =>
      a.serviceName.localeCompare(b.serviceName)
    )
  }, [filteredMockServers])

  const toggleGroup = (serviceName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(serviceName)) {
        next.delete(serviceName)
      } else {
        next.add(serviceName)
      }
      return next
    })
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col">
          <Heading>Mock Servers</Heading>
          <span className="text-sm text-gray-500">
            {filteredMockServers.length} mock server{filteredMockServers.length !== 1 ? "s" : ""} across{" "}
            {groupedMockServers.length} service{groupedMockServers.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search mock servers..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm transition-all
                duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-blue-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <Select value={selectedServiceId || "all"} onValueChange={handleServiceChange}>
            <SelectTrigger className="w-full bg-white sm:w-[180px]">
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] bg-white">
              <SelectItem value="all">All services</SelectItem>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full bg-white sm:w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Link href="/dashboard/services">
            <Button className="w-full sm:w-auto">
              <Plus className="size-4" />
              New Server
            </Button>
          </Link>
        </div>
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
      ) : groupedMockServers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Server className="mb-4 size-12 text-gray-300" />
          <p className="text-lg">No mock servers found</p>
          <p className="text-sm">Create a mock server to start testing your integrations</p>
          <Link href="/dashboard/services" className="mt-4">
            <Button>
              <Plus className="size-4" />
              Create your first server
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedMockServers.map((group) => {
            const isExpanded = expandedGroups.has(group.serviceName)
            const activeCount = group.mockServers.filter((s) => s.isActive).length
            const inactiveCount = group.mockServers.filter((s) => !s.isActive).length
            const totalRequests = group.mockServers.reduce(
              (sum, s) => sum + s._count.requestLogs,
              0
            )

            return (
              <div
                key={group.serviceName}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                {/* Service Header */}
                <button
                  onClick={() => toggleGroup(group.serviceName)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg">
                      {group.serviceLogoUrl ? (
                        <Image
                          src={group.serviceLogoUrl}
                          alt={group.serviceName}
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
                    <h3 className="font-semibold text-gray-900">{group.serviceName}</h3>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-green-500" />
                        {activeCount} active
                      </span>
                      {inactiveCount > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-red-500" />
                          {inactiveCount} inactive
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-gray-400">
                        <Activity className="size-3" />
                        {totalRequests.toLocaleString()} requests
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDownIcon className="size-5 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="size-5 shrink-0 text-gray-400" />
                  )}
                </button>

                {/* Mock Servers List */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {group.mockServers.map((mockServer, index) => (
                      <Link
                        key={mockServer.id}
                        href={`/dashboard/mock-servers/${mockServer.id}`}
                        className={`flex items-center justify-between bg-white px-4 py-3 transition-colors hover:bg-gray-50 ${
                          index !== group.mockServers.length - 1 ? "border-b border-gray-100" : ""
                        }`}
                      >
                        <div className="ml-14 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-gray-800">{mockServer.name}</p>
                            <span
                              className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                mockServer.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  mockServer.isActive ? "bg-green-500" : "bg-red-500"
                                }`}
                              />
                              {mockServer.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Activity className="size-3" />
                              {mockServer._count.requestLogs.toLocaleString()} requests
                            </span>
                            <span>|</span>
                            <span className="flex items-center gap-1">
                              <Database className="size-3" />
                              {mockServer._count.mockStates} resources
                            </span>
                            <span>|</span>
                            <span>
                              Created {new Date(mockServer.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ChevronRightIcon className="size-4 shrink-0 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
