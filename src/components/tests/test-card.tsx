"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TestStatusIndicator } from "./test-status-indicator"
import { MockworldTestSummary } from "@/lib/mockworld-tests/types"
import { FlaskConical, Play, ArrowRight, Clock } from "lucide-react"

interface TestCardProps {
  test: MockworldTestSummary
  onRun?: (testId: string) => void
}

export function TestCard({ test, onRun }: TestCardProps) {
  return (
    <Link href={`/dashboard/tests/${test.id}`}>
      <Card hover className="h-full group">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg leading-tight">{test.name}</CardTitle>
                {test.description && (
                  <CardDescription className="mt-0.5 line-clamp-1">
                    {test.description}
                  </CardDescription>
                )}
              </div>
            </div>
            <Badge variant={test.isActive ? "success" : "secondary"}>
              {test.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Recent Runs Status Dots */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">Recent runs:</span>
            <div className="flex items-center gap-1.5">
              {test.runCount === 0 ? (
                <span className="text-xs text-muted-foreground italic">No runs yet</span>
              ) : (
                test.recentRuns.map((status, index) => (
                  <TestStatusIndicator key={index} status={status} size="sm" />
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total runs</span>
              <span className="font-medium">{test.runCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pass rate</span>
              <span className="font-medium">
                {test.runCount > 0
                  ? `${Math.round((test.passedCount / test.runCount) * 100)}%`
                  : "N/A"}
              </span>
            </div>
            {test.lastRunAt && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last run
                </span>
                <span className="font-medium">
                  {new Date(test.lastRunAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRun?.(test.id)
              }}
            >
              <Play className="h-4 w-4 mr-1" />
              Run
            </Button>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
