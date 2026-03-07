"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import {
  ChevronRightIcon,
  SearchIcon,
  Plus,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Server,
} from "lucide-react"
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
import { MockworldTestSummary, TestRunStatus } from "@/lib/mockworld-tests/types"

function getStatusIcon(status?: TestRunStatus) {
  switch (status) {
    case "passed":
      return <CheckCircle2 className="size-4 text-green-500" />
    case "failed":
      return <XCircle className="size-4 text-red-500" />
    case "running":
      return <Activity className="size-4 animate-pulse text-blue-500" />
    case "pending":
    default:
      return <Clock className="size-4 text-gray-400" />
  }
}

function getStatusBadge(status?: TestRunStatus) {
  const styles = {
    passed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    running: "bg-blue-100 text-blue-700",
    pending: "bg-gray-100 text-gray-600",
  }
  const style = status ? styles[status] : styles.pending
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Never run"

  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {getStatusIcon(status)}
      {label}
    </span>
  )
}

export default function MockworldTestsPage() {
  const [tests, setTests] = useState<MockworldTestSummary[]>([])
  const [filteredTests, setFilteredTests] = useState<MockworldTestSummary[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadTests = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/tests")
      if (!response.ok) {
        throw new Error("Failed to fetch tests")
      }
      const data = await response.json()
      setTests(data.tests || [])
      setFilteredTests(data.tests || [])
    } catch (error) {
      console.error("Error fetching tests:", error)
      toast.error("Failed to load tests")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const applyFilters = useCallback(
    (search: string, status: string | null) => {
      let filtered = [...tests]

      if (search) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter(
          (t) =>
            t.name.toLowerCase().includes(searchLower) ||
            t.description?.toLowerCase().includes(searchLower)
        )
      }

      if (status) {
        filtered = filtered.filter((t) => t.lastRunStatus === status)
      }

      setFilteredTests(filtered)
    },
    [tests]
  )

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedSearch = useCallback(
    (value: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        applyFilters(value, selectedStatus)
      }, 300)
    },
    [applyFilters, selectedStatus]
  )

  useEffect(() => {
    loadTests()
  }, [loadTests])

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
    applyFilters(searchTerm, status)
  }

  const stats = useMemo(() => {
    const passed = tests.filter((t) => t.lastRunStatus === "passed").length
    const failed = tests.filter((t) => t.lastRunStatus === "failed").length
    return { passed, failed }
  }, [tests])

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col">
          <Heading>Mockworld Tests</Heading>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Simulate real-world scenarios with AI agents to validate their behaviour.
          </p>
          <span className="mt-2 text-sm text-gray-500">
            {filteredTests.length} test{filteredTests.length !== 1 ? "s" : ""}
            {stats.passed > 0 && (
              <span className="ml-2 text-green-600">{stats.passed} passed</span>
            )}
            {stats.failed > 0 && (
              <span className="ml-2 text-red-600">{stats.failed} failed</span>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tests..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm transition-all
                duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-blue-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <Select value={selectedStatus || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full bg-white sm:w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Link href="/dashboard/tests/new">
            <Button className="w-full sm:w-auto">
              <Plus className="size-4" />
              New Test
            </Button>
          </Link>
        </div>
      </div>

      <Divider className="my-6" />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
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
      ) : filteredTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <FlaskConical className="mb-4 size-12 text-gray-300" />
          <p className="text-lg">No tests found</p>
          <p className="text-sm">Create a test to validate your mock API responses</p>
          <Link href="/dashboard/tests/new" className="mt-4">
            <Button>
              <Plus className="size-4" />
              Create your first test
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTests.map((test) => (
            <Link
              key={test.id}
              href={`/dashboard/tests/${test.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gray-100">
                  <FlaskConical className="size-5 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="truncate font-medium text-gray-800">{test.name}</p>
                    {getStatusBadge(test.lastRunStatus)}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                    {/* Service Logos - Overlapping Circles */}
                    {test.services.length > 0 && (
                      <div className="flex items-center">
                        <div className="flex -space-x-2">
                          {test.services.slice(0, 4).map((service, index) => (
                            <div
                              key={service.serviceSlug}
                              className="relative size-7 rounded-full border-2 border-white bg-gray-100 shadow-sm"
                              style={{ zIndex: test.services.length - index }}
                              title={service.serviceName}
                            >
                              {service.logoUrl ? (
                                <img
                                  src={service.logoUrl}
                                  alt={service.serviceName}
                                  className="size-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center rounded-full bg-gray-200">
                                  <Server className="size-3 text-gray-500" />
                                </div>
                              )}
                            </div>
                          ))}
                          {test.services.length > 4 && (
                            <div
                              className="relative flex size-7 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600 shadow-sm"
                              style={{ zIndex: 0 }}
                            >
                              +{test.services.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="ml-2 text-gray-500">
                          {test.services.length === 1
                            ? test.services[0].serviceName
                            : `${test.services.length} services`}
                        </span>
                      </div>
                    )}
                    {test.lastRunAt && (
                      <span className="text-gray-400">
                        Last run {new Date(test.lastRunAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Bars (like Atlassian uptime) */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1" title="Recent runs">
                  {/* Show up to 10 recent runs as bars */}
                  {Array.from({ length: 10 }).map((_, index) => {
                    const runStatus = test.recentRuns[index]
                    const statusColors: Record<string, string> = {
                      passed: "bg-green-500",
                      failed: "bg-red-500",
                      running: "bg-yellow-500",
                      pending: "bg-gray-300",
                    }
                    const color = runStatus ? statusColors[runStatus] : "bg-gray-200"
                    const tooltip = runStatus
                      ? `Run ${index + 1}: ${runStatus}`
                      : "No run"

                    return (
                      <div
                        key={index}
                        className={`h-5 w-1.5 rounded-sm ${color} transition-all hover:scale-110`}
                        title={tooltip}
                      />
                    )
                  })}
                </div>

                <ChevronRightIcon className="size-4 shrink-0 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
