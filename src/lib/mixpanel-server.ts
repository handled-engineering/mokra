import Mixpanel from "mixpanel"

const MIXPANEL_TOKEN = "2e24adc393006823cd9013b56fe56e1e"

// Internal domains and emails to exclude from tracking
const EXCLUDED_DOMAINS = ["@withzimi.com", "@itshandled.ai"]
const EXCLUDED_EMAILS = ["nsakapeter@gmail.com"]

const mixpanel = Mixpanel.init(MIXPANEL_TOKEN)

// Cache of user emails for internal user checking
// In production, you might want to use Redis for this
const userEmailCache = new Map<string, string>()

export function cacheUserEmail(userId: string, email: string) {
  userEmailCache.set(userId, email)
}

export function isInternalUser(email: string): boolean {
  const emailLower = email.toLowerCase()
  if (EXCLUDED_EMAILS.some((e) => e.toLowerCase() === emailLower)) {
    return true
  }
  if (EXCLUDED_DOMAINS.some((domain) => emailLower.endsWith(domain.toLowerCase()))) {
    return true
  }
  return false
}

export function isInternalUserById(userId: string): boolean {
  const email = userEmailCache.get(userId)
  if (!email) return false
  return isInternalUser(email)
}

export function trackServerEvent(
  eventName: string,
  distinctId: string,
  properties?: Record<string, unknown>,
  userEmail?: string
) {
  // Check if internal user
  if (userEmail && isInternalUser(userEmail)) {
    console.log("[Mixpanel Server] Skipping event for internal user:", eventName)
    return
  }
  if (isInternalUserById(distinctId)) {
    console.log("[Mixpanel Server] Skipping event for internal user (cached):", eventName)
    return
  }

  mixpanel.track(eventName, {
    distinct_id: distinctId,
    ...properties,
    timestamp: new Date().toISOString(),
  })
}

export function setServerUserProperties(
  distinctId: string,
  properties: Record<string, unknown>,
  userEmail?: string
) {
  if (userEmail && isInternalUser(userEmail)) return
  if (isInternalUserById(distinctId)) return

  mixpanel.people.set(distinctId, properties)
}

export function incrementServerUserProperty(
  distinctId: string,
  property: string,
  value: number = 1,
  userEmail?: string
) {
  if (userEmail && isInternalUser(userEmail)) return
  if (isInternalUserById(distinctId)) return

  mixpanel.people.increment(distinctId, property, value)
}

// Pre-defined server-side events
export const serverAnalytics = {
  // ============================================
  // USER LIFECYCLE EVENTS
  // ============================================
  userSignedUp: (
    userId: string,
    properties: {
      email: string
      name?: string
      plan: string
      referrer?: string
    }
  ) => {
    // Skip internal users
    if (isInternalUser(properties.email)) {
      console.log("[Mixpanel Server] Skipping signup for internal user:", properties.email)
      return
    }

    // Cache the email for future lookups
    cacheUserEmail(userId, properties.email)

    trackServerEvent("User Signed Up", userId, {
      plan: properties.plan,
      referrer: properties.referrer,
    })
    setServerUserProperties(userId, {
      $email: properties.email,
      $name: properties.name,
      plan: properties.plan,
      $created: new Date().toISOString(),
      mockServerCount: 0,
      totalRequests: 0,
      testRunsExecuted: 0,
    })
  },

  userLoggedIn: (userId: string, email: string) => {
    if (isInternalUser(email)) return
    cacheUserEmail(userId, email)

    trackServerEvent("User Logged In", userId, { method: "credentials" }, email)
    setServerUserProperties(userId, {
      $last_login: new Date().toISOString(),
    }, email)
  },

  // ============================================
  // MOCK SERVER EVENTS
  // ============================================
  mockServerCreated: (
    userId: string,
    properties: {
      serverId: string
      serviceName: string
      serviceSlug: string
    },
    userEmail?: string
  ) => {
    trackServerEvent("Mock Server Created", userId, properties, userEmail)
    incrementServerUserProperty(userId, "mockServerCount", 1, userEmail)
  },

  mockServerDeleted: (
    userId: string,
    properties: { serverId: string; serviceName: string },
    userEmail?: string
  ) => {
    trackServerEvent("Mock Server Deleted", userId, properties, userEmail)
    incrementServerUserProperty(userId, "mockServerCount", -1, userEmail)
  },

  // ============================================
  // MOCK REQUEST EVENTS (High volume - use sparingly or sample)
  // ============================================
  mockRequestMade: (
    userId: string,
    properties: {
      serverId: string
      serviceSlug: string
      method: string
      path: string
      statusCode: number
      duration: number
      isStateful?: boolean
      isGraphQL?: boolean
    },
    userEmail?: string
  ) => {
    trackServerEvent("Mock Request Made", userId, properties, userEmail)
    incrementServerUserProperty(userId, "totalRequests", 1, userEmail)

    // Track daily active usage
    const today = new Date().toISOString().split("T")[0]
    setServerUserProperties(userId, {
      lastRequestAt: new Date().toISOString(),
      lastActiveDate: today,
    }, userEmail)
  },

  // ============================================
  // API KEY EVENTS
  // ============================================
  apiKeyCreated: (
    userId: string,
    properties: { name: string; hasExpiry: boolean; excludedServerCount: number },
    userEmail?: string
  ) => {
    trackServerEvent("API Key Created", userId, properties, userEmail)
    incrementServerUserProperty(userId, "apiKeyCount", 1, userEmail)
  },

  apiKeyDeleted: (userId: string, userEmail?: string) => {
    trackServerEvent("API Key Deleted", userId, undefined, userEmail)
    incrementServerUserProperty(userId, "apiKeyCount", -1, userEmail)
  },

  apiKeyRegenerated: (userId: string, userEmail?: string) => {
    trackServerEvent("API Key Regenerated", userId, undefined, userEmail)
  },

  // ============================================
  // TEST EVENTS
  // ============================================
  testCreated: (
    userId: string,
    properties: {
      testId: string
      name: string
      mockServerCount: number
      assertionCount: number
    },
    userEmail?: string
  ) => {
    trackServerEvent("Test Created", userId, properties, userEmail)
    incrementServerUserProperty(userId, "testCount", 1, userEmail)
  },

  testDeleted: (userId: string, properties: { testId: string }, userEmail?: string) => {
    trackServerEvent("Test Deleted", userId, properties, userEmail)
    incrementServerUserProperty(userId, "testCount", -1, userEmail)
  },

  testRunExecuted: (
    userId: string,
    properties: {
      testId: string
      testName: string
      passed: boolean
      assertionCount: number
      passedCount: number
      failedCount: number
      duration: number
    },
    userEmail?: string
  ) => {
    trackServerEvent("Test Run Executed", userId, properties, userEmail)
    incrementServerUserProperty(userId, "testRunsExecuted", 1, userEmail)
    if (properties.passed) {
      incrementServerUserProperty(userId, "testRunsPassed", 1, userEmail)
    } else {
      incrementServerUserProperty(userId, "testRunsFailed", 1, userEmail)
    }
  },

  // ============================================
  // SUBSCRIPTION EVENTS
  // ============================================
  checkoutStarted: (
    userId: string,
    properties: { plan: string; currentPlan: string },
    userEmail?: string
  ) => {
    trackServerEvent("Checkout Started", userId, properties, userEmail)
  },

  subscriptionCreated: (
    userId: string,
    properties: { plan: string; stripeSubscriptionId: string },
    userEmail?: string
  ) => {
    trackServerEvent("Subscription Created", userId, properties, userEmail)
    setServerUserProperties(userId, { plan: properties.plan }, userEmail)
  },

  subscriptionUpdated: (
    userId: string,
    properties: { fromPlan: string; toPlan: string; stripeSubscriptionId: string },
    userEmail?: string
  ) => {
    const isUpgrade = getPlanValue(properties.toPlan) > getPlanValue(properties.fromPlan)
    const eventName = isUpgrade ? "Subscription Upgraded" : "Subscription Downgraded"

    trackServerEvent(eventName, userId, properties, userEmail)
    setServerUserProperties(userId, { plan: properties.toPlan }, userEmail)
  },

  subscriptionCanceled: (
    userId: string,
    properties: { plan: string; stripeSubscriptionId: string },
    userEmail?: string
  ) => {
    trackServerEvent("Subscription Canceled", userId, properties, userEmail)
    setServerUserProperties(userId, { plan: "FREE" }, userEmail)
  },

  paymentFailed: (
    userId: string,
    properties: { plan: string; reason?: string },
    userEmail?: string
  ) => {
    trackServerEvent("Payment Failed", userId, properties, userEmail)
  },

  // ============================================
  // ERROR EVENTS
  // ============================================
  serverError: (
    userId: string,
    properties: {
      errorType: string
      errorMessage: string
      endpoint: string
      method: string
    },
    userEmail?: string
  ) => {
    trackServerEvent("Server Error", userId, properties, userEmail)
  },

  limitReached: (
    userId: string,
    properties: {
      limitType: "mock_servers" | "api_keys" | "requests" | "tests"
      currentPlan: string
      currentCount: number
      limit: number
    },
    userEmail?: string
  ) => {
    trackServerEvent("Limit Reached", userId, properties, userEmail)
  },

  // ============================================
  // CONTRIBUTOR EVENTS
  // ============================================
  serviceCreated: (
    userId: string,
    properties: {
      serviceId: string
      serviceName: string
      serviceSlug: string
      serviceType: string
    },
    userEmail?: string
  ) => {
    trackServerEvent("Service Created", userId, properties, userEmail)
    incrementServerUserProperty(userId, "servicesCreated", 1, userEmail)
  },

  servicePublished: (
    userId: string,
    properties: { serviceId: string; serviceName: string },
    userEmail?: string
  ) => {
    trackServerEvent("Service Published", userId, properties, userEmail)
  },

  aiGenerationUsed: (
    userId: string,
    properties: {
      serviceId: string
      generationType: string
      tokensUsed?: number
    },
    userEmail?: string
  ) => {
    trackServerEvent("AI Generation Used", userId, properties, userEmail)
    incrementServerUserProperty(userId, "aiGenerationsUsed", 1, userEmail)
  },
}

// Helper function to get plan value for comparison
function getPlanValue(plan: string): number {
  const values: Record<string, number> = {
    FREE: 0,
    BASIC: 1,
    PRO: 2,
  }
  return values[plan] || 0
}
