import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"

const prisma = new PrismaClient()

function generateApiKey(): string {
  return `mk_${randomUUID().replace(/-/g, "")}`
}

async function main() {
  console.log("Seeding test user with multiple mock servers...")

  // Create or update test user with real password hash
  const testUser = await prisma.user.upsert({
    where: { email: "test@mockra.dev" },
    update: {
      password: "$2a$12$4anymCFWt3OwhLM5O9/1eOAkGDbkLETTuAcgJhmvUUAszgIApFZwG", // "password"
    },
    create: {
      email: "test@mockra.dev",
      password: "$2a$12$4anymCFWt3OwhLM5O9/1eOAkGDbkLETTuAcgJhmvUUAszgIApFZwG", // "password"
      name: "Test User",
      role: "USER",
    },
  })

  console.log(`Created/updated test user: ${testUser.email}`)

  // Get some services to create mock servers for
  const services = await prisma.mockService.findMany({
    where: {
      slug: {
        in: [
          "shopify",
          "amazon",
          "bigcommerce_v3",
          "woocommerce",
          "ebay",
          "etsy",
          "square",
          "magento_v3",
          "shipbob",
          "shiphero",
          "logiwa",
        ],
      },
    },
  })

  if (services.length === 0) {
    console.log("No services found. Run seed.mockService.ts first.")
    return
  }

  console.log(`Found ${services.length} services to create mock servers for`)

  // Mock server configurations
  const mockServerConfigs = [
    { name: "Production Store", serviceSlug: "shopify", requestCount: 150 },
    { name: "Staging Store", serviceSlug: "shopify", requestCount: 45 },
    { name: "Dev Store", serviceSlug: "shopify", requestCount: 12 },
    { name: "US Marketplace", serviceSlug: "amazon", requestCount: 230 },
    { name: "EU Marketplace", serviceSlug: "amazon", requestCount: 89 },
    { name: "BigCommerce Main", serviceSlug: "bigcommerce_v3", requestCount: 67 },
    { name: "WooCommerce Blog Shop", serviceSlug: "woocommerce", requestCount: 23 },
    { name: "eBay Storefront", serviceSlug: "ebay", requestCount: 56 },
    { name: "Etsy Crafts", serviceSlug: "etsy", requestCount: 34 },
    { name: "Square POS", serviceSlug: "square", requestCount: 78 },
    { name: "Magento Enterprise", serviceSlug: "magento_v3", requestCount: 112 },
    { name: "ShipBob Fulfillment", serviceSlug: "shipbob", requestCount: 89 },
    { name: "ShipHero Warehouse", serviceSlug: "shiphero", requestCount: 145 },
    { name: "Logiwa WMS", serviceSlug: "logiwa", requestCount: 67 },
  ]

  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]
  const paths = [
    "/api/v1/orders",
    "/api/v1/orders/123",
    "/api/v1/products",
    "/api/v1/products/456",
    "/api/v1/inventory",
    "/api/v1/customers",
    "/api/v1/customers/789",
    "/api/v1/fulfillments",
    "/api/v1/shipments",
    "/api/v1/returns",
    "/graphql",
    "/admin/api/2024-01/orders.json",
    "/admin/api/2024-01/products.json",
  ]

  for (const config of mockServerConfigs) {
    const service = services.find((s) => s.slug === config.serviceSlug)
    if (!service) {
      console.log(`  Service ${config.serviceSlug} not found, skipping...`)
      continue
    }

    // Check if mock server already exists
    let mockServer = await prisma.mockServer.findFirst({
      where: {
        userId: testUser.id,
        serviceId: service.id,
        name: config.name,
      },
    })

    if (!mockServer) {
      // Create mock server with unique apiKey
      mockServer = await prisma.mockServer.create({
        data: {
          name: config.name,
          userId: testUser.id,
          serviceId: service.id,
          apiKey: generateApiKey(),
        },
      })
      console.log(`  Created mock server: ${config.name} (${service.name})`)
    } else {
      console.log(`  Mock server already exists: ${config.name} (${service.name})`)
    }

    // Create request logs
    const existingLogs = await prisma.requestLog.count({
      where: { mockServerId: mockServer.id },
    })

    if (existingLogs < config.requestCount) {
      const logsToCreate = config.requestCount - existingLogs
      const requestLogs = []

      for (let i = 0; i < logsToCreate; i++) {
        const method = methods[Math.floor(Math.random() * methods.length)]
        const path = paths[Math.floor(Math.random() * paths.length)]
        const isError = Math.random() < 0.08 // 8% error rate
        const statusCode = isError
          ? [400, 401, 403, 404, 500, 502, 503][Math.floor(Math.random() * 7)]
          : [200, 201, 204][Math.floor(Math.random() * 3)]
        const duration = Math.floor(Math.random() * 800) + 50 // 50-850ms

        // Random date within last 30 days
        const createdAt = new Date(
          Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
        )

        requestLogs.push({
          mockServerId: mockServer.id,
          method,
          path,
          statusCode,
          duration,
          request: { headers: { "Content-Type": "application/json" }, body: method !== "GET" ? { sample: "data" } : null },
          response: { headers: { "Content-Type": "application/json" }, body: { success: !isError } },
          createdAt,
        })
      }

      await prisma.requestLog.createMany({
        data: requestLogs,
      })

      console.log(`    Created ${logsToCreate} request logs`)
    } else {
      console.log(`    Already has ${existingLogs} request logs`)
    }
  }

  // Get all created mock servers for this user
  const allMockServers = await prisma.mockServer.findMany({
    where: { userId: testUser.id },
    include: { service: true },
  })

  console.log("\nCreating Mockworld Tests...")

  // Test configurations - each test uses multiple mock servers
  const testConfigs = [
    {
      name: "E-commerce Full Stack Test",
      description: "Tests complete order flow across Shopify, ShipBob, and payment processing",
      servicesSlugs: ["shopify", "shipbob", "square"],
      assertCount: 5,
      runCount: 8,
    },
    {
      name: "Multi-Channel Inventory Sync",
      description: "Validates inventory stays in sync across Amazon, eBay, and BigCommerce",
      servicesSlugs: ["amazon", "ebay", "bigcommerce_v3"],
      assertCount: 4,
      runCount: 12,
    },
    {
      name: "Warehouse Integration Test",
      description: "Tests fulfillment flow between ShipHero and Logiwa WMS",
      servicesSlugs: ["shiphero", "logiwa"],
      assertCount: 3,
      runCount: 6,
    },
    {
      name: "Shopify Order Lifecycle",
      description: "Complete order lifecycle testing for all Shopify stores",
      servicesSlugs: ["shopify"],
      assertCount: 6,
      runCount: 15,
    },
    {
      name: "Amazon Multi-Region Sync",
      description: "Tests synchronization between US and EU Amazon marketplaces",
      servicesSlugs: ["amazon"],
      assertCount: 4,
      runCount: 10,
    },
    {
      name: "Omnichannel Order Test",
      description: "Tests orders flowing through all connected sales channels",
      servicesSlugs: ["shopify", "amazon", "ebay", "etsy", "woocommerce"],
      assertCount: 8,
      runCount: 5,
    },
    {
      name: "Fulfillment Network Test",
      description: "Tests multi-warehouse fulfillment routing",
      servicesSlugs: ["shipbob", "shiphero", "logiwa"],
      assertCount: 5,
      runCount: 7,
    },
    {
      name: "POS Integration Test",
      description: "Tests Square POS integration with e-commerce platforms",
      servicesSlugs: ["square", "shopify", "bigcommerce_v3"],
      assertCount: 4,
      runCount: 9,
    },
  ]

  const runStatuses: ("PASSED" | "FAILED" | "RUNNING" | "PENDING")[] = ["PASSED", "FAILED", "RUNNING", "PENDING"]

  for (const testConfig of testConfigs) {
    // Find mock servers for this test's services
    const testMockServers = allMockServers.filter((ms) =>
      testConfig.servicesSlugs.includes(ms.service.slug)
    )

    if (testMockServers.length === 0) {
      console.log(`  Skipping test "${testConfig.name}" - no matching mock servers`)
      continue
    }

    // Check if test already exists
    let test = await prisma.mockworldTest.findFirst({
      where: {
        userId: testUser.id,
        name: testConfig.name,
      },
    })

    if (!test) {
      // Create the test
      test = await prisma.mockworldTest.create({
        data: {
          userId: testUser.id,
          name: testConfig.name,
          description: testConfig.description,
          customInstructions: `Generate realistic ${testConfig.servicesSlugs.join(", ")} API responses.`,
          isActive: Math.random() > 0.2, // 80% active
        },
      })
      console.log(`  Created test: ${testConfig.name}`)

      // Link mock servers to test
      for (const ms of testMockServers) {
        await prisma.testMockServer.create({
          data: {
            testId: test.id,
            mockServerId: ms.id,
          },
        })
      }
      console.log(`    Linked ${testMockServers.length} mock servers`)

      // Create asserts
      for (let i = 0; i < testConfig.assertCount; i++) {
        const targetMs = testMockServers[i % testMockServers.length]
        await prisma.testAssert.create({
          data: {
            testId: test.id,
            name: `Assert ${i + 1}: ${targetMs.service.name} response valid`,
            description: `Validates response from ${targetMs.name}`,
            sonataExpression: `{{response.statusCode}} == 200`,
            mockServerId: targetMs.id,
            targetResourcePath: "/api/v1/test",
          },
        })
      }
      console.log(`    Created ${testConfig.assertCount} asserts`)

      // Create test runs with mixed statuses
      const asserts = await prisma.testAssert.findMany({
        where: { testId: test.id },
      })

      for (let i = 0; i < testConfig.runCount; i++) {
        // Weight towards passed (60%), failed (25%), pending (10%), running (5%)
        const rand = Math.random()
        let status: "PASSED" | "FAILED" | "RUNNING" | "PENDING"
        if (rand < 0.6) status = "PASSED"
        else if (rand < 0.85) status = "FAILED"
        else if (rand < 0.95) status = "PENDING"
        else status = "RUNNING"

        const startedAt = new Date(
          Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000) // Last 14 days
        )
        const duration = Math.floor(Math.random() * 10000) + 1000 // 1-11 seconds
        const completedAt = status === "RUNNING" || status === "PENDING"
          ? undefined
          : new Date(startedAt.getTime() + duration)

        const run = await prisma.testRun.create({
          data: {
            testId: test.id,
            status,
            startedAt,
            completedAt,
            duration: completedAt ? duration : undefined,
            error: status === "FAILED" ? "Assertion failed: expected 200 got 500" : undefined,
          },
        })

        // Create assert results for completed runs
        if (status === "PASSED" || status === "FAILED") {
          for (const assert of asserts) {
            const passed = status === "PASSED" ? true : Math.random() > 0.3
            await prisma.testRunAssertResult.create({
              data: {
                runId: run.id,
                assertId: assert.id,
                passed,
                actualValue: passed ? { statusCode: 200 } : { statusCode: 500 },
                expectedValue: { statusCode: 200 },
                error: passed ? undefined : "Status code mismatch",
              },
            })
          }
        }
      }
      console.log(`    Created ${testConfig.runCount} test runs`)
    } else {
      console.log(`  Test already exists: ${testConfig.name}`)
    }
  }

  // Print summary
  const totalMockServers = await prisma.mockServer.count({
    where: { userId: testUser.id },
  })
  const totalRequests = await prisma.requestLog.count({
    where: { mockServer: { userId: testUser.id } },
  })
  const totalTests = await prisma.mockworldTest.count({
    where: { userId: testUser.id },
  })
  const totalRuns = await prisma.testRun.count({
    where: { test: { userId: testUser.id } },
  })

  console.log("\n--- Summary ---")
  console.log(`User: ${testUser.email}`)
  console.log(`Password: password`)
  console.log(`Mock Servers: ${totalMockServers}`)
  console.log(`Total Request Logs: ${totalRequests}`)
  console.log(`Mockworld Tests: ${totalTests}`)
  console.log(`Total Test Runs: ${totalRuns}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
