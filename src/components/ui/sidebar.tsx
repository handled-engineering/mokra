"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  Layers,
  Settings,
  LogOut,
  ChevronLeft,
  Zap,
  Crown,
  Shield,
} from "lucide-react"

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
  { name: "My Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Services", href: "/dashboard/services", icon: Layers },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar-background text-sidebar-foreground transition-all duration-300 ease-in-out flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-muted">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight">Mokra</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md hover:bg-sidebar-muted transition-colors",
            collapsed && "absolute -right-3 top-6 bg-sidebar-background border border-sidebar-muted shadow-lg"
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-white shadow-glow"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {user.role === "ADMIN" && (
          <>
            <div className={cn("my-4 border-t border-sidebar-muted", collapsed && "mx-1")} />
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                pathname.startsWith("/admin")
                  ? "bg-sidebar-accent text-white shadow-glow"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
              )}
              title={collapsed ? "Admin" : undefined}
            >
              <Shield className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Upgrade Banner */}
      {!collapsed && user.plan !== "PRO" && (
        <div className="mx-3 mb-4 rounded-lg bg-gradient-to-r from-primary/20 to-cyan-500/20 p-4 border border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-sidebar-foreground/60 mb-3">
            Unlock unlimited projects and advanced features
          </p>
          <Link
            href="/pricing"
            className="flex items-center justify-center w-full py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-sidebar-muted p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-muted text-sm font-medium uppercase">
            {user.email?.[0] || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user.plan?.toLowerCase()} plan</p>
            </div>
          )}
        </div>
        <div className={cn("mt-3 flex gap-2", collapsed && "flex-col")}>
          {!collapsed && (
            <Link
              href="/dashboard/settings"
              className="flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          )}
          <Link
            href="/api/auth/signout"
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors",
              collapsed ? "w-full" : "flex-1"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Sign out"}
          </Link>
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
