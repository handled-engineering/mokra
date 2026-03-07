/**
 * Mockworld Test Types
 */

// Test Run Status
export type TestRunStatus = "pending" | "running" | "passed" | "failed"

// Service Requirement - which Mockra services the test needs
export interface ServiceRequirement {
  serviceSlug: string
  serviceName: string
  logoUrl?: string | null
}

// State Requirement - initial state for mock services
export interface StateRequirement {
  serviceSlug: string
  resourceType: string
  resourcePath: string
  initialState: unknown
  description?: string
}

// Test Setup - requirements for running a test
export interface TestSetup {
  services: ServiceRequirement[]
  stateRequirements: StateRequirement[]
  customInstructions: string
}

// Test Assert - Sonata expression to evaluate JSON responses
export interface TestAssert {
  id: string
  name: string
  description?: string
  sonataExpression: string
  targetServiceSlug: string
  targetResourcePath?: string
  expectedResult?: unknown
}

// Assert result from a test run
export interface TestRunAssertResult {
  assertId: string
  assertName: string
  passed: boolean
  actualValue?: unknown
  expectedValue?: unknown
  error?: string
}

// Individual test run
export interface TestRun {
  id: string
  testId: string
  status: TestRunStatus
  startedAt: Date
  completedAt?: Date
  duration?: number
  assertResults: TestRunAssertResult[]
  logs?: string[]
  error?: string
}

// Main Mockworld Test
export interface MockworldTest {
  id: string
  name: string
  description?: string
  setup: TestSetup
  asserts: TestAssert[]
  runs: TestRun[]
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

// Summary for list view
export interface MockworldTestSummary {
  id: string
  name: string
  description?: string
  runCount: number
  passedCount: number
  failedCount: number
  pendingCount: number
  runningCount: number
  expectedCount: number // Total number of assertions
  lastRunStatus?: TestRunStatus
  lastRunAt?: Date
  isActive: boolean
  recentRuns: TestRunStatus[]
  services: ServiceRequirement[] // Services used by this test
}
