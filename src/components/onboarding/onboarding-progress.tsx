"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Server,
  Key,
  Zap,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Rocket,
  BookOpen,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { OnboardingStep, type StepStatus } from "./onboarding-step"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { analytics } from "@/lib/mixpanel"

export interface OnboardingProgress {
  step1: boolean
  step2: boolean
  step3: boolean
  step4: boolean
  dismissed: boolean
}

interface OnboardingProgressProps {
  initialProgress: OnboardingProgress
  mockServerEndpoint?: string
  firstMockServerId?: string
}

export function OnboardingProgressCard({
  initialProgress,
  mockServerEndpoint,
  firstMockServerId,
}: OnboardingProgressProps) {
  const [isOpen, setIsOpen] = useState(!initialProgress.dismissed)
  const [isDismissing, setIsDismissing] = useState(false)

  const completedCount = [
    initialProgress.step1,
    initialProgress.step2,
    initialProgress.step3,
    initialProgress.step4,
  ].filter(Boolean).length

  const allComplete = completedCount === 4

  const getStepStatus = (stepNumber: number): StepStatus => {
    const stepComplete = initialProgress[`step${stepNumber}` as keyof OnboardingProgress] as boolean
    if (stepComplete) return "completed"

    // Find first incomplete step
    for (let i = 1; i <= 4; i++) {
      if (!initialProgress[`step${i}` as keyof OnboardingProgress]) {
        return i === stepNumber ? "current" : "pending"
      }
    }
    return "pending"
  }

  const handleDismiss = async () => {
    setIsDismissing(true)
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      })

      // Track onboarding dismissed or completed
      if (allComplete) {
        analytics.onboardingCompleted()
      } else {
        analytics.onboardingDismissed({
          completedSteps: completedCount,
          totalSteps: 4,
        })
      }

      setIsOpen(false)
    } catch (error) {
      console.error("Failed to dismiss onboarding:", error)
    } finally {
      setIsDismissing(false)
    }
  }

  // Determine current step for sidebar content
  const currentStep = !initialProgress.step1
    ? 1
    : !initialProgress.step2
      ? 2
      : !initialProgress.step3
        ? 3
        : !initialProgress.step4
          ? 4
          : null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-gray-200 rounded-xl bg-white mb-8 overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center",
                  allComplete ? "bg-green-100" : "bg-blue-100"
                )}
              >
                <Rocket
                  className={cn(
                    "h-5 w-5",
                    allComplete ? "text-green-600" : "text-blue-600"
                  )}
                />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">
                  {allComplete ? "Setup Complete!" : "Get Started with Mokra"}
                </h3>
                <p className="text-sm text-gray-500">
                  {allComplete
                    ? "You're all set to build and test AI agents"
                    : `${completedCount} of 4 steps complete`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Progress bar */}
              <div className="hidden sm:block w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    allComplete ? "bg-green-500" : "bg-blue-500"
                  )}
                  style={{ width: `${(completedCount / 4) * 100}%` }}
                />
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-gray-100">
            {/* Two Column Layout */}
            <div className="flex gap-6 p-4">
              {/* Left Column - Steps */}
              <div className="flex-1 min-w-0">
                <div className="divide-y divide-gray-100">
                  <OnboardingStep
                    stepNumber={1}
                    title="Create a Mock Server"
                    description="Choose a service and create your first mock API server"
                    icon={Server}
                    status={getStepStatus(1)}
                    actionHref="/dashboard/services"
                    actionLabel="Browse Services"
                  />

                  <OnboardingStep
                    stepNumber={2}
                    title="Generate an API Key"
                    description="Create an API key to authenticate your requests"
                    icon={Key}
                    status={getStepStatus(2)}
                    actionHref="/dashboard/api-keys"
                    actionLabel="Create Key"
                  />

                  <OnboardingStep
                    stepNumber={3}
                    title="Make Your First API Call"
                    description="Send a request to your mock server to see it in action"
                    icon={Zap}
                    status={getStepStatus(3)}
                    actionHref={
                      firstMockServerId
                        ? `/dashboard/mock-servers/${firstMockServerId}?tab=usage`
                        : "/dashboard/mock-servers"
                    }
                    actionLabel={firstMockServerId ? "View Usage" : "View Servers"}
                  />

                  <OnboardingStep
                    stepNumber={4}
                    title="Create a Mockworld Test"
                    description="Set up tests to validate your AI agent's behavior"
                    icon={FlaskConical}
                    status={getStepStatus(4)}
                    actionHref="/dashboard/tests/new"
                    actionLabel="Create Test"
                  />
                </div>

                {/* Footer actions */}
                {allComplete && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Keep this guide as a reference or minimize it.
                    </p>
                    <button
                      onClick={handleDismiss}
                      disabled={isDismissing}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      {isDismissing ? "Saving..." : "Minimize"}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column - Contextual Sidebar */}
              <div className="hidden lg:block w-72 shrink-0">
                <div className="space-y-4">
                  {/* Current Step Info */}
                  {currentStep === 1 && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Available Services
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Choose from 50+ pre-built API mocks including Stripe, GitHub, Twilio, and more.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {["Stripe", "GitHub", "Twilio", "Slack", "OpenAI"].map((service) => (
                          <span
                            key={service}
                            className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600"
                          >
                            {service}
                          </span>
                        ))}
                        <span className="px-2 py-0.5 text-xs text-gray-400">+45 more</span>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        About API Keys
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        API keys authenticate your requests to mock servers. You can create multiple keys for different environments.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          Set expiration dates for security
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          Exclude specific servers per key
                        </li>
                      </ul>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Example Request
                      </h4>
                      <div className="bg-gray-900 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                        <div className="text-gray-400 mb-1"># Try this command</div>
                        <div className="text-emerald-400">
                          curl {mockServerEndpoint || "https://api.mokra.ai/mock/..."} \
                        </div>
                        <div className="text-blue-400 pl-2">
                          -H &quot;X-API-Key: YOUR_KEY&quot;
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        This step auto-completes when we detect your first request.
                      </p>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        Mockworld Tests
                      </h4>
                      <p className="text-sm text-blue-800 mb-3">
                        Create tests to validate how your AI agents interact with APIs.
                      </p>
                      <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                        <li>Add your mock server to the test</li>
                        <li>Define assertions with Sonata expressions</li>
                        <li>Run tests in the harness to validate behavior</li>
                      </ol>
                    </div>
                  )}

                  {allComplete && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-green-600" />
                        <h4 className="text-sm font-medium text-green-900">
                          You&apos;re Ready!
                        </h4>
                      </div>
                      <p className="text-sm text-green-800">
                        You&apos;ve completed the setup. Start building and testing your AI agents with confidence.
                      </p>
                    </div>
                  )}

                  {/* Resources */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Resources
                    </h4>
                    <div className="space-y-2">
                      <a
                        href="https://docs.mokra.ai/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <BookOpen className="h-4 w-4" />
                        Documentation
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                      <Link
                        href="/dashboard/services"
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <Server className="h-4 w-4" />
                        Browse Services
                      </Link>
                      <Link
                        href="/dashboard/tests"
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <FlaskConical className="h-4 w-4" />
                        View Tests
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
