import { PrismaClient, TestRunStatus } from "@prisma/client"

const prisma = new PrismaClient()

interface MockTestData {
  name: string
  description: string
  customInstructions: string
  serviceSlug: string
  stateRequirements: {
    resourceType: string
    resourcePath: string
    initialState: unknown
    description?: string
  }[]
  asserts: {
    name: string
    description?: string
    sonataExpression: string
    targetResourcePath?: string
    expectedResult?: unknown
  }[]
  runs: {
    status: TestRunStatus
    startedAt: Date
    completedAt?: Date
    duration?: number
    error?: string
    assertResults: {
      assertIndex: number
      passed: boolean
      actualValue?: unknown
      expectedValue?: unknown
      error?: string
    }[]
  }[]
}

const mockTests: MockTestData[] = [
  {
    name: "Shopify Products CRUD Flow",
    description: "Tests the complete create, read, update, delete flow for Shopify products",
    customInstructions: "Generate realistic Shopify product data with variants, images, and inventory levels.",
    serviceSlug: "shopify",
    stateRequirements: [
      {
        resourceType: "products",
        resourcePath: "/admin/api/2024-01/products.json",
        initialState: { products: [] },
        description: "Start with empty product catalog",
      },
    ],
    asserts: [
      {
        name: "Create product returns 201",
        sonataExpression: "{{response.statusCode}} == 201",
        targetResourcePath: "/admin/api/2024-01/products.json",
      },
      {
        name: "Created product has ID",
        sonataExpression: "{{response.body.product.id}} != null",
        targetResourcePath: "/admin/api/2024-01/products.json",
      },
      {
        name: "Product title matches",
        sonataExpression: "{{response.body.product.title}} == {{request.body.product.title}}",
        targetResourcePath: "/admin/api/2024-01/products.json",
      },
    ],
    runs: [
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-15T10:00:00Z"),
        completedAt: new Date("2024-01-15T10:00:05Z"),
        duration: 5000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
          { assertIndex: 2, passed: true },
        ],
      },
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-14T15:30:00Z"),
        completedAt: new Date("2024-01-14T15:30:04Z"),
        duration: 4000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
          { assertIndex: 2, passed: true },
        ],
      },
    ],
  },
  {
    name: "Amazon Order Sync Test",
    description: "Validates Amazon order synchronization and fulfillment updates",
    customInstructions: "Generate realistic Amazon order data with multiple items and proper fulfillment tracking.",
    serviceSlug: "amazon",
    stateRequirements: [
      {
        resourceType: "orders",
        resourcePath: "/orders/v0/orders",
        initialState: { orders: [] },
        description: "Start with no orders",
      },
    ],
    asserts: [
      {
        name: "List orders returns 200",
        sonataExpression: "{{response.statusCode}} == 200",
        targetResourcePath: "/orders/v0/orders",
      },
      {
        name: "Orders array is present",
        sonataExpression: "Array.isArray({{response.body.orders}})",
        targetResourcePath: "/orders/v0/orders",
      },
    ],
    runs: [
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-16T08:00:00Z"),
        completedAt: new Date("2024-01-16T08:00:03Z"),
        duration: 3000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
        ],
      },
      {
        status: TestRunStatus.FAILED,
        startedAt: new Date("2024-01-15T12:00:00Z"),
        completedAt: new Date("2024-01-15T12:00:08Z"),
        duration: 8000,
        error: "Timeout waiting for response",
        assertResults: [
          { assertIndex: 0, passed: false, error: "Request timed out" },
          { assertIndex: 1, passed: false },
        ],
      },
    ],
  },
  {
    name: "NetSuite ERP Integration",
    description: "Tests NetSuite order creation and inventory sync",
    customInstructions: "Generate NetSuite sales orders with proper line items and tax calculations.",
    serviceSlug: "netsuite_erp",
    stateRequirements: [
      {
        resourceType: "salesOrders",
        resourcePath: "/services/rest/record/v1/salesOrder",
        initialState: {},
        description: "Empty sales orders",
      },
    ],
    asserts: [
      {
        name: "Create sales order succeeds",
        sonataExpression: "{{response.statusCode}} == 200 || {{response.statusCode}} == 201",
        targetResourcePath: "/services/rest/record/v1/salesOrder",
      },
      {
        name: "Order ID returned",
        sonataExpression: "{{response.body.id}} != null",
        targetResourcePath: "/services/rest/record/v1/salesOrder",
      },
    ],
    runs: [
      {
        status: TestRunStatus.RUNNING,
        startedAt: new Date(),
        assertResults: [],
      },
    ],
  },
  {
    name: "ShipHero Fulfillment Flow",
    description: "Validates shipping request creation and fulfillment tracking in ShipHero",
    customInstructions: "Generate realistic shipping requests with proper carrier selection and tracking updates.",
    serviceSlug: "shiphero",
    stateRequirements: [
      {
        resourceType: "orders",
        resourcePath: "/graphql",
        initialState: { data: { orders: { edges: [] } } },
        description: "No pending orders",
      },
    ],
    asserts: [
      {
        name: "GraphQL query succeeds",
        sonataExpression: "{{response.statusCode}} == 200",
        targetResourcePath: "/graphql",
      },
      {
        name: "No errors in response",
        sonataExpression: "{{response.body.errors}} == null || {{response.body.errors}}.length == 0",
        targetResourcePath: "/graphql",
      },
      {
        name: "Orders data present",
        sonataExpression: "{{response.body.data.orders}} != null",
        targetResourcePath: "/graphql",
      },
    ],
    runs: [
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-14T09:00:00Z"),
        completedAt: new Date("2024-01-14T09:00:06Z"),
        duration: 6000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
          { assertIndex: 2, passed: true },
        ],
      },
    ],
  },
  {
    name: "WooCommerce Order Webhook",
    description: "Tests webhook payload processing for WooCommerce orders",
    customInstructions: "Generate WooCommerce webhook payloads with proper HMAC signatures.",
    serviceSlug: "woocommerce",
    stateRequirements: [],
    asserts: [
      {
        name: "Webhook acknowledged",
        sonataExpression: "{{response.statusCode}} == 200",
        targetResourcePath: "/wp-json/wc/v3/orders",
      },
      {
        name: "Order processed flag set",
        sonataExpression: "{{response.body.processed}} == true",
        targetResourcePath: "/wp-json/wc/v3/orders",
      },
    ],
    runs: [
      {
        status: TestRunStatus.FAILED,
        startedAt: new Date("2024-01-13T14:00:00Z"),
        completedAt: new Date("2024-01-13T14:00:02Z"),
        duration: 2000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: false, error: "Expected true but got undefined" },
        ],
      },
    ],
  },
  {
    name: "QuickBooks Invoice Sync",
    description: "Validates invoice creation and payment recording in QuickBooks",
    customInstructions: "Generate realistic invoice data with line items, taxes, and customer references.",
    serviceSlug: "quickbooks",
    stateRequirements: [
      {
        resourceType: "invoices",
        resourcePath: "/v3/company/*/invoice",
        initialState: { QueryResponse: { Invoice: [] } },
        description: "Empty invoice list",
      },
    ],
    asserts: [
      {
        name: "Invoice created",
        sonataExpression: "{{response.statusCode}} == 200",
        targetResourcePath: "/v3/company/*/invoice",
      },
      {
        name: "Invoice has DocNumber",
        sonataExpression: "{{response.body.Invoice.DocNumber}} != null",
        targetResourcePath: "/v3/company/*/invoice",
      },
    ],
    runs: [
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-12T11:00:00Z"),
        completedAt: new Date("2024-01-12T11:00:04Z"),
        duration: 4000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
        ],
      },
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-11T16:00:00Z"),
        completedAt: new Date("2024-01-11T16:00:03Z"),
        duration: 3000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
        ],
      },
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-10T10:00:00Z"),
        completedAt: new Date("2024-01-10T10:00:05Z"),
        duration: 5000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
        ],
      },
    ],
  },
  {
    name: "BigCommerce Inventory Update",
    description: "Tests batch inventory updates across multiple products",
    customInstructions: "Generate inventory updates with proper SKU references and warehouse locations.",
    serviceSlug: "bigcommerce_v3",
    stateRequirements: [
      {
        resourceType: "inventory",
        resourcePath: "/v3/inventory/items",
        initialState: { data: [] },
        description: "Initial inventory state",
      },
    ],
    asserts: [
      {
        name: "Batch update accepted",
        sonataExpression: "{{response.statusCode}} == 200",
        targetResourcePath: "/v3/inventory/items",
      },
      {
        name: "All items updated",
        sonataExpression: "{{response.body.data}}.length == {{request.body.items}}.length",
        targetResourcePath: "/v3/inventory/items",
      },
    ],
    runs: [
      {
        status: TestRunStatus.PENDING,
        startedAt: new Date("2024-01-16T12:00:00Z"),
        assertResults: [],
      },
    ],
  },
  {
    name: "Slack Notification Integration",
    description: "Validates Slack message posting for order notifications",
    customInstructions: "Post formatted messages with order details and action buttons.",
    serviceSlug: "slack",
    stateRequirements: [],
    asserts: [
      {
        name: "Message posted",
        sonataExpression: "{{response.body.ok}} == true",
        targetResourcePath: "/api/chat.postMessage",
      },
      {
        name: "Message has timestamp",
        sonataExpression: "{{response.body.ts}} != null",
        targetResourcePath: "/api/chat.postMessage",
      },
    ],
    runs: [
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-15T14:00:00Z"),
        completedAt: new Date("2024-01-15T14:00:01Z"),
        duration: 1000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
        ],
      },
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-14T14:00:00Z"),
        completedAt: new Date("2024-01-14T14:00:01Z"),
        duration: 1000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
        ],
      },
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-13T14:00:00Z"),
        completedAt: new Date("2024-01-13T14:00:01Z"),
        duration: 1000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
        ],
      },
      {
        status: TestRunStatus.FAILED,
        startedAt: new Date("2024-01-12T14:00:00Z"),
        completedAt: new Date("2024-01-12T14:00:02Z"),
        duration: 2000,
        assertResults: [
          { assertIndex: 0, passed: false, error: "channel_not_found" },
          { assertIndex: 1, passed: false },
        ],
      },
    ],
  },
  {
    name: "Loop Returns Processing",
    description: "Tests return request creation and refund processing",
    customInstructions: "Generate return requests with proper reason codes and refund calculations.",
    serviceSlug: "loop",
    stateRequirements: [
      {
        resourceType: "returns",
        resourcePath: "/api/v1/returns",
        initialState: { returns: [] },
        description: "No pending returns",
      },
    ],
    asserts: [
      {
        name: "Return created",
        sonataExpression: "{{response.statusCode}} == 201",
        targetResourcePath: "/api/v1/returns",
      },
      {
        name: "Return has ID",
        sonataExpression: "{{response.body.return.id}} != null",
        targetResourcePath: "/api/v1/returns",
      },
      {
        name: "Status is pending",
        sonataExpression: "{{response.body.return.status}} == 'pending'",
        targetResourcePath: "/api/v1/returns",
      },
    ],
    runs: [
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-16T09:00:00Z"),
        completedAt: new Date("2024-01-16T09:00:03Z"),
        duration: 3000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
          { assertIndex: 2, passed: true },
        ],
      },
    ],
  },
  {
    name: "FedEx Shipping Label Generation",
    description: "Tests shipping label creation and tracking number retrieval",
    customInstructions: "Generate valid shipping labels with proper dimensions, weights, and service types.",
    serviceSlug: "fedex",
    stateRequirements: [],
    asserts: [
      {
        name: "Label created successfully",
        sonataExpression: "{{response.body.output.transactionShipments}}.length > 0",
        targetResourcePath: "/ship/v1/shipments",
      },
      {
        name: "Tracking number present",
        sonataExpression: "{{response.body.output.transactionShipments[0].masterTrackingNumber}} != null",
        targetResourcePath: "/ship/v1/shipments",
      },
      {
        name: "Label image returned",
        sonataExpression: "{{response.body.output.transactionShipments[0].pieceResponses[0].packageDocuments}}.length > 0",
        targetResourcePath: "/ship/v1/shipments",
      },
    ],
    runs: [
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-15T11:00:00Z"),
        completedAt: new Date("2024-01-15T11:00:07Z"),
        duration: 7000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
          { assertIndex: 2, passed: true },
        ],
      },
      {
        status: TestRunStatus.FAILED,
        startedAt: new Date("2024-01-14T11:00:00Z"),
        completedAt: new Date("2024-01-14T11:00:05Z"),
        duration: 5000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
          { assertIndex: 2, passed: false, error: "Label image format not supported" },
        ],
      },
      {
        status: TestRunStatus.PASSED,
        startedAt: new Date("2024-01-13T11:00:00Z"),
        completedAt: new Date("2024-01-13T11:00:06Z"),
        duration: 6000,
        assertResults: [
          { assertIndex: 0, passed: true },
          { assertIndex: 1, passed: true },
          { assertIndex: 2, passed: true },
        ],
      },
    ],
  },
]

async function main() {
  console.log("Seeding Mockworld Tests...")

  // Get the first user (or create one if needed for testing)
  let user = await prisma.user.findFirst()

  if (!user) {
    console.log("No user found. Creating a test user...")
    user = await prisma.user.create({
      data: {
        email: "test@mockra.dev",
        password: "$2a$10$placeholder", // placeholder hash
        name: "Test User",
        role: "USER",
      },
    })
  }

  console.log(`Using user: ${user.email}`)

  for (const testData of mockTests) {
    console.log(`Creating test: ${testData.name}`)

    // Find or create a mock server for this service
    const service = await prisma.mockService.findUnique({
      where: { slug: testData.serviceSlug },
    })

    if (!service) {
      console.log(`  Service ${testData.serviceSlug} not found, skipping...`)
      continue
    }

    // Check if mock server exists for this user and service
    let mockServer = await prisma.mockServer.findFirst({
      where: {
        userId: user.id,
        serviceId: service.id,
      },
    })

    if (!mockServer) {
      // Create a mock server for testing
      mockServer = await prisma.mockServer.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          name: `${service.name} Test Server`,
          apiKey: `mck_${Math.random().toString(36).substring(2, 15)}`,
        },
      })
      console.log(`  Created mock server: ${mockServer.name}`)
    }

    // Create the test
    const test = await prisma.mockworldTest.create({
      data: {
        userId: user.id,
        name: testData.name,
        description: testData.description,
        customInstructions: testData.customInstructions,
        isActive: true,
        mockServers: {
          create: {
            mockServerId: mockServer.id,
          },
        },
        stateRequirements: {
          create: testData.stateRequirements.map((sr) => ({
            mockServerId: mockServer.id,
            resourceType: sr.resourceType,
            resourcePath: sr.resourcePath,
            initialState: sr.initialState as object,
            description: sr.description,
          })),
        },
        asserts: {
          create: testData.asserts.map((a) => ({
            name: a.name,
            description: a.description,
            sonataExpression: a.sonataExpression,
            mockServerId: mockServer.id,
            targetResourcePath: a.targetResourcePath,
            expectedResult: a.expectedResult as object | undefined,
          })),
        },
      },
      include: {
        asserts: true,
      },
    })

    // Create runs with assert results
    for (const runData of testData.runs) {
      const run = await prisma.testRun.create({
        data: {
          testId: test.id,
          status: runData.status,
          startedAt: runData.startedAt,
          completedAt: runData.completedAt,
          duration: runData.duration,
          error: runData.error,
        },
      })

      // Create assert results for this run
      for (const ar of runData.assertResults) {
        const assert = test.asserts[ar.assertIndex]
        if (assert) {
          await prisma.testRunAssertResult.create({
            data: {
              runId: run.id,
              assertId: assert.id,
              passed: ar.passed,
              actualValue: ar.actualValue as object | undefined,
              expectedValue: ar.expectedValue as object | undefined,
              error: ar.error,
            },
          })
        }
      }
    }

    console.log(`  Created test with ${testData.asserts.length} asserts and ${testData.runs.length} runs`)
  }

  console.log(`Done. Seeded ${mockTests.length} Mockworld tests.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
