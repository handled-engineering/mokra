"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Layers,
  LogOut,
  ChevronLeft,
  PenTool,
} from "lucide-react"
import { Logo } from "./logo"

interface ContributorSidebarProps {
  user: {
    email?: string | null
    name?: string | null
  }
}

const navigation = [
  { name: "Dashboard", href: "/contributor", icon: LayoutDashboard },
  { name: "Services", href: "/contributor/services", icon: Layers },
]

export function ContributorSidebar({ user }: ContributorSidebarProps) {
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
        <Link href="/contributor" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
            <PenTool className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight">Contributor</span>
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
          const isActive = pathname === item.href || (item.href !== "/contributor" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        <div className={cn("my-4 border-t border-sidebar-muted", collapsed && "mx-1")} />

        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
          )}
          title={collapsed ? "Back to Dashboard" : undefined}
        >
          <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Back to Dashboard</span>}
        </Link>
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-muted p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium uppercase">
            {user.email?.[0] || "C"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-sidebar-foreground/60">Contributor</p>
            </div>
          )}
        </div>
        <div className={cn("mt-3", collapsed && "flex justify-center")}>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors",
              collapsed ? "w-full" : "w-full"
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
