"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Server,
  Activity,
  Plus,
  ArrowRight,
  Layers,
  Key,
  TestTube,
  ChevronRight,
  Sparkles,
  Zap,
  Code2,
  GitBranch,
  Shield,
  BookOpen,
} from "lucide-react"
import {
  OnboardingProgressCard,
  type OnboardingProgress,
} from "@/components/onboarding/onboarding-progress"
import { analytics } from "@/lib/mixpanel"

interface MockServer {
  id: string
  name: string
  serviceName: string
  serviceLogoUrl: string | null
  requestCount: number
}

interface RequestLog {
  id: string
  method: string
  path: string
  statusCode: number
  duration: number
  createdAt: Date
  serviceName: string
  serviceLogoUrl: string | null
}

interface Stats {
  totalServers: number
  totalRequests: number
  requestsToday: number
  uniqueServices: number
  successRate: number
  avgResponseTime: number
  successfulRequests: number
  failedRequests: number
  totalLogged: number
}

interface DashboardContentProps {
  mockServers: MockServer[]
  recentRequests: RequestLog[]
  stats: Stats
  onboardingProgress: OnboardingProgress
  mockServerEndpoint?: string
  firstMockServerId?: string
}

type Tab = "servers" | "activity"

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-600",
  POST: "text-blue-600",
  PUT: "text-amber-600",
  PATCH: "text-orange-600",
  DELETE: "text-red-600",
}

export function DashboardContent({
  mockServers,
  recentRequests,
  stats,
  onboardingProgress,
  mockServerEndpoint,
  firstMockServerId,
}: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("servers")

  // Track dashboard view on mount
  useEffect(() => {
    analytics.dashboardViewed({
      mockServerCount: stats.totalServers,
      totalRequests: stats.totalRequests,
    })
  }, [stats.totalServers, stats.totalRequests])

  // Check if onboarding should be shown
  const allStepsComplete =
    onboardingProgress.step1 &&
    onboardingProgress.step2 &&
    onboardingProgress.step3 &&
    onboardingProgress.step4
  const showOnboarding = !allStepsComplete || !onboardingProgress.dismissed

  const tabs: { id: Tab; label: string }[] = [
    { id: "servers", label: "Mock Servers" },
    { id: "activity", label: "Recent Activity" },
  ]

  // Full welcome state when no servers exist
  if (stats.totalServers === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Onboarding Progress */}
        {showOnboarding && (
          <OnboardingProgressCard
            initialProgress={onboardingProgress}
            mockServerEndpoint={mockServerEndpoint}
            firstMockServerId={firstMockServerId}
          />
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Welcome to Mokra
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">
            Create your first mock server
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Build and test your AI Agents with AI-powered mock servers.
            Get realistic responses without hitting production services.
          </p>
        </div>

        {/* Visual Element */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl" />
          <div className="relative border border-gray-200 rounded-2xl p-8 bg-white/50 backdrop-blur-sm">
            {/* Mock Terminal */}
            <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-gray-400 text-xs font-mono ml-2">terminal</span>
              </div>
              <div className="p-4 font-mono text-sm">
                <div className="text-gray-400 mb-2"># Make a request to your mock Stripe API</div>
                <div className="text-emerald-400 mb-3">
                  <span className="text-gray-500">$</span> curl https://api.mokra.ai/api/mock/stripe/v1/customers \
                </div>
                <div className="text-blue-400 pl-4 mb-4">
                  -H &quot;X-API-Key: mk_test_xxx&quot;
                </div>
                <div className="text-gray-400 mb-2"># Get instant, realistic responses</div>
                <div className="text-amber-300">
                  {`{`}<br />
                  <span className="pl-4">&quot;id&quot;: &quot;cus_NffrFeUfNV2Hib&quot;,</span><br />
                  <span className="pl-4">&quot;email&quot;: &quot;jenny@example.com&quot;,</span><br />
                  <span className="pl-4">&quot;name&quot;: &quot;Jenny Rosen&quot;</span><br />
                  {`}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Instant Setup</h3>
            <p className="text-sm text-gray-500">
              Choose from 50+ pre-built service mocks. No configuration needed.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Code2 className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">AI-Powered</h3>
            <p className="text-sm text-gray-500">
              Get contextually accurate responses that match real API behavior.
            </p>
          </div>
          <div className="border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Stateful Mode</h3>
            <p className="text-sm text-gray-500">
              Enable persistence for CRUD operations. Test complete workflows.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/dashboard/services"
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Create Your First Mock Server
          </Link>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/dashboard/api-keys" className="hover:text-gray-700 flex items-center gap-1.5">
              <Key className="h-4 w-4" />
              Get API Key
            </Link>
            <a href="https://docs.mokra.ai/" className="hover:text-gray-700 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Read Docs
            </a>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-16 border-t border-gray-200 pt-12">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide text-center mb-8">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex h-10 w-10 rounded-full bg-gray-100 items-center justify-center text-gray-900 font-semibold mb-4">
                1
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Choose a Service</h3>
              <p className="text-sm text-gray-500">
                Browse our catalog of APIs like Stripe, GitHub, Twilio, and more.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-10 w-10 rounded-full bg-gray-100 items-center justify-center text-gray-900 font-semibold mb-4">
                2
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Get Your Endpoint</h3>
              <p className="text-sm text-gray-500">
                Receive a unique mock URL and API key for your integration.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-10 w-10 rounded-full bg-gray-100 items-center justify-center text-gray-900 font-semibold mb-4">
                3
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Start Testing</h3>
              <p className="text-sm text-gray-500">
                Make requests and get intelligent, realistic mock responses.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Onboarding Progress */}
        {showOnboarding && (
          <OnboardingProgressCard
            initialProgress={onboardingProgress}
            mockServerEndpoint={mockServerEndpoint}
            firstMockServerId={firstMockServerId}
          />
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Overview of your mock API servers and activity
              </p>
            </div>
            <Link
              href="/dashboard/services"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Server
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "servers" && (
          <div>
            {mockServers.length === 0 ? (
              <div className="border border-gray-200 rounded-xl p-12 text-center bg-gradient-to-b from-gray-50/50 to-white">
                <div className="relative w-16 h-16 mx-auto mb-5">
                  <div className="absolute inset-0 bg-blue-100 rounded-xl rotate-6" />
                  <div className="absolute inset-0 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
                    <Server className="h-7 w-7 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mock servers yet</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Create a mock server to start testing your integrations with realistic API responses.
                </p>
                <Link
                  href="/dashboard/services"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Mock Server
                </Link>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Server</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Service</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Requests</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mockServers.map((server) => (
                      <tr key={server.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 overflow-hidden">
                              {server.serviceLogoUrl ? (
                                <Image
                                  src={server.serviceLogoUrl}
                                  alt={server.serviceName}
                                  width={20}
                                  height={20}
                                  className="object-contain"
                                />
                              ) : (
                                <Layers className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{server.name}</p>
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {server.serviceName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-900 font-medium">{server.requestCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/mock-servers/${server.id}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                  <Link
                    href="/dashboard/mock-servers"
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1"
                  >
                    View all servers
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div>
            {recentRequests.length === 0 ? (
              <div className="border border-gray-200 rounded-xl p-12 bg-gradient-to-b from-gray-50/50 to-white">
                <div className="max-w-md mx-auto text-center">
                  <div className="relative w-16 h-16 mx-auto mb-5">
                    <div className="absolute inset-0 bg-emerald-100 rounded-xl -rotate-6" />
                    <div className="absolute inset-0 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
                      <Activity className="h-7 w-7 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                  <p className="text-gray-500 mb-6">
                    Start making API calls to your mock servers. All requests will be logged here with status, timing, and details.
                  </p>

                  {/* Example request hint */}
                  <div className="bg-gray-900 rounded-lg p-4 text-left mb-6">
                    <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                      <Code2 className="h-3.5 w-3.5" />
                      Try making a request
                    </div>
                    <code className="text-sm text-emerald-400 font-mono">
                      curl https://api.mokra.ai/mock/stripe/v1/customers \<br />
                      <span className="text-blue-400 pl-4">-H &quot;X-API-Key: YOUR_KEY&quot;</span>
                    </code>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-sm">
                    <Link
                      href="/dashboard/mock-servers"
                      className="text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
                    >
                      <Server className="h-4 w-4" />
                      View Servers
                    </Link>
                    <Link
                      href="/dashboard/api-keys"
                      className="text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
                    >
                      <Key className="h-4 w-4" />
                      Get API Key
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Method</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Path</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Duration</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentRequests.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`font-mono font-medium ${log.statusCode < 400 ? "text-emerald-600" : "text-red-600"}`}>
                            {log.statusCode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono font-medium ${METHOD_COLORS[log.method] || "text-gray-600"}`}>
                            {log.method}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="font-mono text-gray-900 text-xs">{log.path}</code>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {log.duration}ms
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/dashboard/services"
              className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="h-9 w-9 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">New Server</p>
                <p className="text-xs text-gray-500 truncate">Create a mock</p>
              </div>
            </Link>
            <Link
              href="/dashboard/mock-servers"
              className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="h-9 w-9 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
                <Server className="h-4 w-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">All Servers</p>
                <p className="text-xs text-gray-500 truncate">Manage mocks</p>
              </div>
            </Link>
            <Link
              href="/dashboard/tests"
              className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="h-9 w-9 rounded-md bg-green-100 flex items-center justify-center shrink-0">
                <TestTube className="h-4 w-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">Run Tests</p>
                <p className="text-xs text-gray-500 truncate">Test your APIs</p>
              </div>
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="h-9 w-9 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                <Key className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">API Keys</p>
                <p className="text-xs text-gray-500 truncate">Manage access</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Stats */}
      <div className="w-72 shrink-0 space-y-4">
        <h2 className="text-sm font-medium text-gray-900">Overview</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Servers</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.totalServers}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Services</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.uniqueServices}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Total Requests</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.totalRequests.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium">Today</p>
            <p className="text-2xl font-semibold text-blue-600 mt-1">{stats.requestsToday.toLocaleString()}</p>
          </div>
        </div>

        {/* Performance */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="text-sm font-medium text-emerald-600">{stats.successRate}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${stats.successRate}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Response</span>
              <span className="text-sm font-medium text-gray-900">{stats.avgResponseTime}<span className="text-gray-500">ms</span></span>
            </div>
          </div>
        </div>

        {/* Request Status */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Request Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600">Successful</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.successfulRequests}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">Failed</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.failedRequests}</span>
            </div>
          </div>
          {stats.totalLogged > 0 && (
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(stats.successfulRequests / stats.totalLogged) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Pro Tips */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Pro Tips</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <GitBranch className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span className="text-gray-600">Use different servers per environment</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Zap className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span className="text-gray-600">Enable stateful mode for CRUD testing</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Code2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span className="text-gray-600">Add custom context for tailored responses</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
