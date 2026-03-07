"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Server,
  Layers,
  Settings,
  LogOut,
  ChevronLeft,
  Crown,
  PenTool,
  FlaskConical,
  Key,
  MessageCircle,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { Logo } from "./logo"

interface SidebarProps {
  user: {
    email?: string | null
    name?: string | null
    plan?: string
    role?: string
  }
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Mock Servers", href: "/dashboard/mock-servers", icon: Server },
  { name: "Services", href: "/dashboard/services", icon: Layers },
  { name: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { name: "Tests", href: "/dashboard/tests", icon: FlaskConical },
]

const footerLinks = [
  { name: "Discord", href: "https://discord.gg/n74xZUf4", icon: MessageCircle },
  { name: "Documentation", href: "https://docs.mokra.ai/", icon: BookOpen },
  { name: "Feedback", href: "https://mokra.canny.io/", icon: MessageSquare },
]

type SystemStatus = {
  indicator: "none" | "minor" | "major" | "critical"
  description: string
}

function useSystemStatus() {
  const [status, setStatus] = React.useState<SystemStatus | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch("https://mokra1.statuspage.io/api/v2/status.json")
        const data = await response.json()
        setStatus({
          indicator: data.status.indicator,
          description: data.status.description,
        })
      } catch (error) {
        console.error("Failed to fetch system status:", error)
        setStatus(null)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    // Poll every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { status, loading }
}

function StatusIndicator({ status, loading, collapsed }: { status: SystemStatus | null; loading: boolean; collapsed: boolean }) {
  if (loading) {
    return (
      <a
        href="https://mokra1.statuspage.io/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        title={collapsed ? "Checking status..." : undefined}
      >
        <Loader2 className="h-4 w-4 animate-spin text-white/50" />
        {!collapsed && <span>Checking status...</span>}
      </a>
    )
  }

  const statusConfig = {
    none: { icon: CheckCircle2, color: "text-green-400", label: "All Systems Operational" },
    minor: { icon: AlertCircle, color: "text-yellow-400", label: "Minor Issues" },
    major: { icon: AlertCircle, color: "text-orange-400", label: "Major Outage" },
    critical: { icon: XCircle, color: "text-red-400", label: "Critical Outage" },
  }

  const config = status ? statusConfig[status.indicator] : statusConfig.none
  const Icon = config.icon
  const label = status?.description || config.label

  return (
    <a
      href="https://mokra1.statuspage.io/"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("h-4 w-4", config.color)} />
      {!collapsed && <span>{label}</span>}
    </a>
  )
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const { status, loading: statusLoading } = useSystemStatus()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-black text-white transition-all duration-300 ease-in-out flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="md" />
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight">Mokra</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10 transition-colors",
            collapsed && "absolute -right-3 top-6 bg-blue-950 border border-white/10 shadow-lg"
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          // Dashboard should only be active when exactly on /dashboard
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white/20 text-white shadow-lg"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade Banner */}
      {!collapsed && user.plan !== "PRO" && (
        <div className="mx-3 mb-4 rounded-lg bg-white/10 p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-white/60 mb-3">
            Unlock unlimited servers and advanced features
          </p>
          <Link
            href="/pricing"
            className="flex items-center justify-center w-full py-2 rounded-md bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Contributor Panel - at bottom before user section */}
      {(user.role === "CONTRIBUTOR" || user.role === "ADMIN") && (
        <div className={cn("px-3 pb-3", collapsed && "px-2")}>
          <Link
            href="/contributor"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              pathname.startsWith("/contributor")
                ? "bg-white/20 text-white shadow-lg"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
            title={collapsed ? "Contributor" : undefined}
          >
            <PenTool className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Contributor Panel</span>}
          </Link>
        </div>
      )}

      {/* Footer Links Section */}
      <div className={cn("px-3 pb-2 space-y-1", collapsed && "px-2")}>
        {footerLinks.map((item) => (
          <a
            key={item.name}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </a>
        ))}
        <StatusIndicator status={status} loading={statusLoading} collapsed={collapsed} />
      </div>

      {/* User Section */}
      <div className="border-t border-white/10 p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-medium uppercase text-white">
            {user.email?.[0] || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{user.email}</p>
              <p className="text-xs text-white/60 capitalize">{user.plan?.toLowerCase()} plan</p>
            </div>
          )}
        </div>
        <div className={cn("mt-3 flex gap-2", collapsed && "flex-col")}>
          {!collapsed && (
            <Link
              href="/dashboard/settings"
              className="flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors",
              collapsed ? "w-full" : "flex-1"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </div>
    </aside>
  )
}

export function SidebarInset({ children }: { children: React.ReactNode }) {
  return (
    <main className="pl-64 min-h-screen bg-background transition-all duration-300 ease-in-out peer-[[data-collapsed=true]]:pl-[72px]">
      {children}
    </main>
  )
}
