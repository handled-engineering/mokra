"use client"

import { cn } from "@/lib/utils"
import { TestRunStatus } from "@/lib/mockworld-tests/types"
import { Check, X, Circle, Loader2 } from "lucide-react"

interface TestStatusIndicatorProps {
  status: TestRunStatus
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

const sizeClasses = {
  sm: "h-2.5 w-2.5",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4"
}

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5"
}

const statusConfig: Record<TestRunStatus, {
  bgClass: string
  iconClass: string
  animate?: boolean
  Icon: React.ComponentType<{ className?: string }>
}> = {
  passed: {
    bgClass: "bg-green-500",
    iconClass: "text-green-500",
    Icon: Check
  },
  failed: {
    bgClass: "bg-red-500",
    iconClass: "text-red-500",
    Icon: X
  },
  pending: {
    bgClass: "bg-gray-400",
    iconClass: "text-gray-400",
    Icon: Circle
  },
  running: {
    bgClass: "bg-yellow-500",
    iconClass: "text-yellow-500",
    animate: true,
    Icon: Loader2
  }
}

export function TestStatusIndicator({
  status,
  size = "md",
  showIcon = false
}: TestStatusIndicatorProps) {
  const config = statusConfig[status]

  if (showIcon) {
    return (
      <config.Icon
        className={cn(
          iconSizeClasses[size],
          config.iconClass,
          config.animate && "animate-spin"
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        sizeClasses[size],
        config.bgClass,
        config.animate && "animate-pulse"
      )}
      title={status}
    />
  )
}
