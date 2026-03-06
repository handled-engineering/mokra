"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Layers, Code2, Loader2, Check, ArrowRight, AlertCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface MockService {
  id: string
  name: string
  slug: string
  description: string | null
  _count: {
    endpoints: number
  }
}

export default function ServicesPage() {
  const [services, setServices] = useState<MockService[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [projectName, setProjectName] = useState("")
  const [creating, setCreating] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data.services || [])
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const createProject = async () => {
    if (!selectedService || !projectName) return

    setCreating(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService,
          name: projectName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create project")
      }

      toast({
        title: "Success",
        description: "Project created! Your API key is ready.",
      })
      router.push(`/dashboard/projects/${data.project.id}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong"

      if (errorMessage.toLowerCase().includes("limit")) {
        setLimitReached(true)
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const selectedServiceData = services.find(s => s.id === selectedService)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading services...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Available Services</h1>
        <p className="text-muted-foreground mt-1">
          Select a mock service to create a new project
        </p>
      </div>

      {services.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <Layers className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No services available</h3>
            <p className="text-muted-foreground">
              Check back later for available mock services.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Service Selection */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => {
                const isSelected = selectedService === service.id
                return (
                  <Card
                    key={service.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 group",
                      isSelected
                        ? "ring-2 ring-primary border-primary shadow-glow"
                        : "hover:border-primary/50 hover:shadow-soft"
                    )}
                    onClick={() => setSelectedService(service.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-primary/10 text-primary group-hover:bg-primary/20"
                          )}>
                            <Layers className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{service.name}</CardTitle>
                            <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              /{service.slug}
                            </code>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {service.description || "No description available"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Code2 className="h-3.5 w-3.5" />
                        <span>{service._count.endpoints} endpoints</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Create Project Panel */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Create Project</CardTitle>
                    <CardDescription>
                      {selectedServiceData ? `Using ${selectedServiceData.name}` : "Select a service first"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {limitReached ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                      <AlertCircle className="h-7 w-7 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-destructive">
                        Project limit reached
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upgrade your plan to create more projects.
                      </p>
                    </div>
                    <Button asChild className="w-full" variant="gradient">
                      <Link href="/pricing">
                        Upgrade Plan
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : selectedService ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        placeholder="My Test Project"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={createProject}
                      disabled={!projectName || creating}
                      loading={creating}
                    >
                      Create Project
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <Layers className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Select a service from the left to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
