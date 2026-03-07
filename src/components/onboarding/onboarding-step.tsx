"use client"

import { type LucideIcon, Check } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type StepStatus = "completed" | "current" | "pending"

interface OnboardingStepProps {
  stepNumber: number
  title: string
  description: string
  icon: LucideIcon
  status: StepStatus
  actionHref?: string
  actionLabel?: string
  expandedContent?: React.ReactNode
}

export function OnboardingStep({
  stepNumber,
  title,
  description,
  icon: Icon,
  status,
  actionHref,
  actionLabel,
  expandedContent,
}: OnboardingStepProps) {
  return (
    <div
      className={cn(
        "relative flex gap-4 py-4",
        status === "pending" && "opacity-50"
      )}
    >
      {/* Step indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all",
            status === "completed" && "bg-green-100 text-green-600",
            status === "current" &&
              "bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-offset-2",
            status === "pending" && "bg-gray-100 text-gray-400"
          )}
        >
          {status === "completed" ? (
            <Check className="h-4 w-4" />
          ) : (
            stepNumber
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Icon
                className={cn(
                  "h-4 w-4",
                  status === "completed" && "text-green-600",
                  status === "current" && "text-blue-600",
                  status === "pending" && "text-gray-400"
                )}
              />
              <h4
                className={cn(
                  "font-medium",
                  status === "completed" && "text-gray-500",
                  status === "current" && "text-gray-900",
                  status === "pending" && "text-gray-400"
                )}
              >
                {title}
              </h4>
              {status === "completed" && (
                <span className="text-xs text-green-600 font-medium">
                  Complete
                </span>
              )}
            </div>
            <p
              className={cn(
                "text-sm",
                status === "completed" && "text-gray-400",
                status === "current" && "text-gray-500",
                status === "pending" && "text-gray-400"
              )}
            >
              {description}
            </p>
          </div>

          {/* Action button for current step */}
          {status === "current" && actionHref && actionLabel && (
            <Link
              href={actionHref}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {actionLabel}
            </Link>
          )}
        </div>

        {/* Expanded content for current step */}
        {status === "current" && expandedContent && (
          <div className="mt-4">{expandedContent}</div>
        )}
      </div>
    </div>
  )
}
