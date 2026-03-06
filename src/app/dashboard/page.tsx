import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderKanban, Activity, Crown, Plus, ArrowRight, Clock, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const [projects, recentRequests] = await Promise.all([
    prisma.userProject.findMany({
      where: { userId: session.user.id },
      include: {
        service: true,
        _count: {
          select: { requestLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.requestLog.findMany({
      where: {
        project: {
          userId: session.user.id,
        },
      },
      include: {
        project: {
          include: { service: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  const totalRequests = await prisma.requestLog.count({
    where: {
      project: {
        userId: session.user.id,
      },
    },
  })

  const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    PUT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    PATCH: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s an overview of your mock APIs.
          </p>
        </div>
        <Link href="/dashboard/services">
          <Button>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Projects"
          value={projects.length}
          icon={<FolderKanban className="h-6 w-6" />}
        />
        <StatCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          icon={<Activity className="h-6 w-6" />}
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                <p className="text-3xl font-bold tracking-tight">{session.user.plan}</p>
                {session.user.plan !== "PRO" && (
                  <Link href="/pricing" className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline">
                    Upgrade now
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Crown className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
              Recent Projects
            </CardTitle>
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <FolderKanban className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Link href="/dashboard/services">
                  <Button variant="outline">
                    <Plus className="h-4 w-4" />
                    Create your first project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="block p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.service.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{project._count.requestLogs}</p>
                        <p className="text-xs text-muted-foreground">requests</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Recent Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No requests yet. Start making API calls!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRequests.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span
                      className={cn(
                        "px-2 py-1 rounded-md text-xs font-semibold border",
                        log.statusCode < 400
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {log.statusCode}
                    </span>
                    <span className={cn(
                      "px-2 py-1 rounded-md text-xs font-medium border",
                      methodColors[log.method] || "bg-muted text-muted-foreground"
                    )}>
                      {log.method}
                    </span>
                    <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                      {log.path}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Clock className="h-3 w-3" />
                      {log.duration}ms
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
