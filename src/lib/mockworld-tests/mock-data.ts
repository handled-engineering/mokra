import { MockworldTest, MockworldTestSummary, TestRunStatus } from "./types"

export const MOCK_TESTS: MockworldTest[] = [
  {
    id: "test-1",
    name: "Books API CRUD Flow",
    description: "Tests the complete create, read, update, delete flow for books",
    setup: {
      services: [
        { serviceSlug: "example-api", serviceName: "Example Books API" }
      ],
      stateRequirements: [
        {
          serviceSlug: "example-api",
          resourceType: "books",
          resourcePath: "/v1/books",
          initialState: [],
          description: "Start with empty books collection"
        }
      ],
      customInstructions: "Generate realistic book data with ISBNs and publication dates. Use well-known authors."
    },
    asserts: [
      {
        id: "assert-1",
        name: "Create returns 201",
        sonataExpression: "{{response.statusCode}} == 201",
        targetServiceSlug: "example-api",
        targetResourcePath: "/v1/books"
      },
      {
        id: "assert-2",
        name: "Created book has ID",
        sonataExpression: "{{response.body.id}} != null",
        targetServiceSlug: "example-api",
        targetResourcePath: "/v1/books"
      },
      {
        id: "assert-3",
        name: "Get returns created book",
        sonataExpression: "{{response.body.title}} == {{savedResource.title}}",
        targetServiceSlug: "example-api",
        targetResourcePath: "/v1/books/{bookId}"
      }
    ],
    runs: [
      {
        id: "run-1",
        testId: "test-1",
        status: "passed",
        startedAt: new Date("2024-01-15T10:00:00Z"),
        completedAt: new Date("2024-01-15T10:00:05Z"),
        duration: 5000,
        assertResults: [
          { assertId: "assert-1", assertName: "Create returns 201", passed: true },
          { assertId: "assert-2", assertName: "Created book has ID", passed: true },
          { assertId: "assert-3", assertName: "Get returns created book", passed: true }
        ]
      },
      {
        id: "run-2",
        testId: "test-1",
        status: "failed",
        startedAt: new Date("2024-01-14T15:30:00Z"),
        completedAt: new Date("2024-01-14T15:30:08Z"),
        duration: 8000,
        assertResults: [
          { assertId: "assert-1", assertName: "Create returns 201", passed: true },
          { assertId: "assert-2", assertName: "Created book has ID", passed: true },
          { assertId: "assert-3", assertName: "Get returns created book", passed: false, error: "Title mismatch" }
        ]
      },
      {
        id: "run-3",
        testId: "test-1",
        status: "passed",
        startedAt: new Date("2024-01-13T09:00:00Z"),
        completedAt: new Date("2024-01-13T09:00:04Z"),
        duration: 4000,
        assertResults: [
          { assertId: "assert-1", assertName: "Create returns 201", passed: true },
          { assertId: "assert-2", assertName: "Created book has ID", passed: true },
          { assertId: "assert-3", assertName: "Get returns created book", passed: true }
        ]
      },
      {
        id: "run-4",
        testId: "test-1",
        status: "passed",
        startedAt: new Date("2024-01-12T14:00:00Z"),
        completedAt: new Date("2024-01-12T14:00:06Z"),
        duration: 6000,
        assertResults: [
          { assertId: "assert-1", assertName: "Create returns 201", passed: true },
          { assertId: "assert-2", assertName: "Created book has ID", passed: true },
          { assertId: "assert-3", assertName: "Get returns created book", passed: true }
        ]
      },
      {
        id: "run-5",
        testId: "test-1",
        status: "failed",
        startedAt: new Date("2024-01-11T11:00:00Z"),
        completedAt: new Date("2024-01-11T11:00:10Z"),
        duration: 10000,
        assertResults: [
          { assertId: "assert-1", assertName: "Create returns 201", passed: false, error: "Got 500" },
          { assertId: "assert-2", assertName: "Created book has ID", passed: false },
          { assertId: "assert-3", assertName: "Get returns created book", passed: false }
        ]
      }
    ],
    createdAt: new Date("2024-01-10T08:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:05Z"),
    isActive: true
  },
  {
    id: "test-2",
    name: "Authentication Flow",
    description: "Validates authentication headers are properly handled",
    setup: {
      services: [
        { serviceSlug: "example-api", serviceName: "Example Books API" }
      ],
      stateRequirements: [],
      customInstructions: "Return proper 401 responses for missing or invalid auth tokens."
    },
    asserts: [
      {
        id: "assert-4",
        name: "Missing auth returns 401",
        sonataExpression: "{{response.statusCode}} == 401",
        targetServiceSlug: "example-api"
      },
      {
        id: "assert-5",
        name: "Invalid token returns 401",
        sonataExpression: "{{response.statusCode}} == 401",
        targetServiceSlug: "example-api"
      }
    ],
    runs: [],
    createdAt: new Date("2024-01-12T09:00:00Z"),
    updatedAt: new Date("2024-01-12T09:00:00Z"),
    isActive: true
  },
  {
    id: "test-3",
    name: "Rate Limiting Test",
    description: "Ensures rate limiting headers are properly returned",
    setup: {
      services: [
        { serviceSlug: "example-api", serviceName: "Example Books API" }
      ],
      stateRequirements: [],
      customInstructions: "Simulate rate limiting after 60 requests per minute."
    },
    asserts: [
      {
        id: "assert-6",
        name: "Rate limit headers present",
        sonataExpression: "{{response.headers['X-RateLimit-Remaining']}} != null",
        targetServiceSlug: "example-api"
      }
    ],
    runs: [
      {
        id: "run-6",
        testId: "test-3",
        status: "running",
        startedAt: new Date(),
        assertResults: []
      }
    ],
    createdAt: new Date("2024-01-13T11:00:00Z"),
    updatedAt: new Date("2024-01-16T08:00:00Z"),
    isActive: true
  },
  {
    id: "test-4",
    name: "Shopify Products Query",
    description: "Test GraphQL product queries against Shopify mock",
    setup: {
      services: [
        { serviceSlug: "shopify", serviceName: "Shopify Admin API" }
      ],
      stateRequirements: [
        {
          serviceSlug: "shopify",
          resourceType: "products",
          resourcePath: "/admin/api/2024-01/graphql.json",
          initialState: { products: { edges: [] } },
          description: "Empty product catalog"
        }
      ],
      customInstructions: "Generate realistic Shopify product data with variants and images."
    },
    asserts: [
      {
        id: "assert-7",
        name: "Query returns products",
        sonataExpression: "{{response.data.products}} != null",
        targetServiceSlug: "shopify"
      },
      {
        id: "assert-8",
        name: "Products have edges array",
        sonataExpression: "Array.isArray({{response.data.products.edges}})",
        targetServiceSlug: "shopify"
      }
    ],
    runs: [
      {
        id: "run-7",
        testId: "test-4",
        status: "pending",
        startedAt: new Date("2024-01-16T08:00:00Z"),
        assertResults: []
      },
      {
        id: "run-8",
        testId: "test-4",
        status: "passed",
        startedAt: new Date("2024-01-15T16:00:00Z"),
        completedAt: new Date("2024-01-15T16:00:03Z"),
        duration: 3000,
        assertResults: [
          { assertId: "assert-7", assertName: "Query returns products", passed: true },
          { assertId: "assert-8", assertName: "Products have edges array", passed: true }
        ]
      }
    ],
    createdAt: new Date("2024-01-14T10:00:00Z"),
    updatedAt: new Date("2024-01-16T08:00:00Z"),
    isActive: true
  },
  {
    id: "test-5",
    name: "Pagination Test",
    description: "Validates cursor-based pagination works correctly",
    setup: {
      services: [
        { serviceSlug: "example-api", serviceName: "Example Books API" }
      ],
      stateRequirements: [],
      customInstructions: "Return paginated results with proper cursor tokens and hasNextPage flags."
    },
    asserts: [
      {
        id: "assert-9",
        name: "First page has cursor",
        sonataExpression: "{{response.body.pageInfo.endCursor}} != null",
        targetServiceSlug: "example-api"
      },
      {
        id: "assert-10",
        name: "Has next page indicator",
        sonataExpression: "{{response.body.pageInfo.hasNextPage}} == true",
        targetServiceSlug: "example-api"
      }
    ],
    runs: [
      {
        id: "run-9",
        testId: "test-5",
        status: "failed",
        startedAt: new Date("2024-01-15T12:00:00Z"),
        completedAt: new Date("2024-01-15T12:00:05Z"),
        duration: 5000,
        assertResults: [
          { assertId: "assert-9", assertName: "First page has cursor", passed: true },
          { assertId: "assert-10", assertName: "Has next page indicator", passed: false, error: "hasNextPage was false" }
        ]
      }
    ],
    createdAt: new Date("2024-01-15T11:00:00Z"),
    updatedAt: new Date("2024-01-15T12:00:05Z"),
    isActive: false
  }
]

export function getMockTests(): MockworldTest[] {
  return MOCK_TESTS
}

export function getMockTestById(id: string): MockworldTest | undefined {
  return MOCK_TESTS.find(test => test.id === id)
}

export function getMockTestSummaries(): MockworldTestSummary[] {
  return MOCK_TESTS.map(test => {
    const recentRuns = test.runs
      .slice(0, 5)
      .map(r => r.status)

    return {
      id: test.id,
      name: test.name,
      description: test.description,
      runCount: test.runs.length,
      passedCount: test.runs.filter(r => r.status === "passed").length,
      failedCount: test.runs.filter(r => r.status === "failed").length,
      pendingCount: test.runs.filter(r => r.status === "pending").length,
      runningCount: test.runs.filter(r => r.status === "running").length,
      expectedCount: test.asserts.length,
      lastRunStatus: test.runs[0]?.status,
      lastRunAt: test.runs[0]?.completedAt || test.runs[0]?.startedAt,
      isActive: test.isActive,
      recentRuns,
      services: test.setup.services
    }
  })
}
