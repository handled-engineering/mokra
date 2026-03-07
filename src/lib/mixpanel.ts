import mixpanel from "mixpanel-browser"

const MIXPANEL_TOKEN = "2e24adc393006823cd9013b56fe56e1e"

// Internal domains and emails to exclude from tracking
const EXCLUDED_DOMAINS = ["@withzimi.com", "@itshandled.ai"]
const EXCLUDED_EMAILS = ["nsakapeter@gmail.com"]

let initialized = false
let currentUserEmail: string | null = null
let isInternalUser = false

function checkIsInternalUser(email: string): boolean {
  const emailLower = email.toLowerCase()
  if (EXCLUDED_EMAILS.some((e) => e.toLowerCase() === emailLower)) {
    return true
  }
  if (EXCLUDED_DOMAINS.some((domain) => emailLower.endsWith(domain.toLowerCase()))) {
    return true
  }
  return false
}

export function initMixpanel() {
  if (typeof window === "undefined") return
  if (initialized) return

  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === "development",
    track_pageview: false, // We'll track page views manually for better control
    persistence: "localStorage",
  })

  initialized = true
}

export function identifyUser(user: {
  id: string
  email: string
  name?: string | null
  role: string
  plan: string
}) {
  if (typeof window === "undefined") return

  // Ensure Mixpanel is initialized before identifying
  if (!initialized) {
    initMixpanel()
  }

  currentUserEmail = user.email
  isInternalUser = checkIsInternalUser(user.email)

  // Don't identify internal users
  if (isInternalUser) {
    console.log("[Mixpanel] Skipping identify for internal user:", user.email)
    return
  }

  mixpanel.identify(user.id)
  mixpanel.people.set({
    $email: user.email,
    $name: user.name || undefined,
    role: user.role,
    plan: user.plan,
    $last_login: new Date().toISOString(),
  })
}

export function resetUser() {
  if (typeof window === "undefined") return

  // Ensure Mixpanel is initialized before resetting
  if (!initialized) {
    initMixpanel()
  }

  currentUserEmail = null
  isInternalUser = false
  mixpanel.reset()
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return

  // Ensure Mixpanel is initialized before tracking
  if (!initialized) {
    initMixpanel()
  }

  // Skip tracking for internal users
  if (isInternalUser) {
    console.log("[Mixpanel] Skipping event for internal user:", eventName, properties)
    return
  }

  mixpanel.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
  })
}

// Pre-defined event tracking functions for type safety and consistency
export const analytics = {
  // ============================================
  // USER LIFECYCLE EVENTS
  // ============================================
  userSignedUp: (properties?: { plan?: string; referrer?: string }) => {
    trackEvent("User Signed Up", properties)
  },

  userLoggedIn: (properties?: { method?: string }) => {
    trackEvent("User Logged In", properties)
  },

  userLoggedOut: () => {
    trackEvent("User Logged Out")
    resetUser()
  },

  // ============================================
  // ONBOARDING EVENTS
  // ============================================
  onboardingStarted: () => {
    trackEvent("Onboarding Started")
  },

  onboardingStepCompleted: (properties: { step: number; stepName: string }) => {
    trackEvent("Onboarding Step Completed", properties)
  },

  onboardingCompleted: () => {
    trackEvent("Onboarding Completed")
  },

  onboardingDismissed: (properties: { completedSteps: number; totalSteps: number }) => {
    trackEvent("Onboarding Dismissed", properties)
  },

  // ============================================
  // MOCK SERVER EVENTS
  // ============================================
  mockServerCreated: (properties: {
    serverId: string
    serviceName: string
    serviceSlug: string
  }) => {
    trackEvent("Mock Server Created", properties)
  },

  mockServerViewed: (properties: {
    serverId: string
    serviceName: string
    serviceSlug: string
  }) => {
    trackEvent("Mock Server Viewed", properties)
  },

  mockServerDeleted: (properties: { serverId: string; serviceName: string }) => {
    trackEvent("Mock Server Deleted", properties)
  },

  mockServerContextUpdated: (properties: { serverId: string }) => {
    trackEvent("Mock Server Context Updated", properties)
  },

  // ============================================
  // API KEY EVENTS
  // ============================================
  apiKeyCreated: (properties?: { name?: string; hasExpiry?: boolean; hasExclusions?: boolean }) => {
    trackEvent("API Key Created", properties)
  },

  apiKeyDeleted: () => {
    trackEvent("API Key Deleted")
  },

  apiKeyRegenerated: () => {
    trackEvent("API Key Regenerated")
  },

  apiKeyCopied: () => {
    trackEvent("API Key Copied")
  },

  // ============================================
  // TEST EVENTS
  // ============================================
  testCreated: (properties: {
    testId: string
    mockServerCount: number
    assertionCount: number
  }) => {
    trackEvent("Test Created", properties)
  },

  testEdited: (properties: { testId: string }) => {
    trackEvent("Test Edited", properties)
  },

  testDeleted: (properties: { testId: string }) => {
    trackEvent("Test Deleted", properties)
  },

  testRunStarted: (properties: { testId: string }) => {
    trackEvent("Test Run Started", properties)
  },

  testRunCompleted: (properties: {
    testId: string
    passed: boolean
    assertionCount: number
    passedCount: number
    duration: number
  }) => {
    trackEvent("Test Run Completed", properties)
  },

  // ============================================
  // SERVICE BROWSING EVENTS
  // ============================================
  serviceListViewed: (properties?: { category?: string; searchTerm?: string }) => {
    trackEvent("Service List Viewed", properties)
  },

  serviceViewed: (properties: {
    serviceSlug: string
    serviceName: string
    serviceType?: string
  }) => {
    trackEvent("Service Viewed", properties)
  },

  serviceSearched: (properties: { searchTerm: string; resultsCount: number }) => {
    trackEvent("Service Searched", properties)
  },

  serviceCategoryFiltered: (properties: { category: string }) => {
    trackEvent("Service Category Filtered", properties)
  },

  serviceDocsViewed: (properties: {
    serviceSlug: string
    serviceName: string
  }) => {
    trackEvent("Service Docs Viewed", properties)
  },

  // ============================================
  // PRICING & CONVERSION EVENTS
  // ============================================
  pricingPageViewed: (properties?: { currentPlan?: string }) => {
    trackEvent("Pricing Page Viewed", properties)
  },

  checkoutStarted: (properties: { plan: string; price: number }) => {
    trackEvent("Checkout Started", properties)
  },

  checkoutCompleted: (properties: { plan: string; price: number }) => {
    trackEvent("Checkout Completed", properties)
  },

  checkoutAbandoned: (properties: { plan: string }) => {
    trackEvent("Checkout Abandoned", properties)
  },

  subscriptionUpgraded: (properties: { fromPlan: string; toPlan: string }) => {
    trackEvent("Subscription Upgraded", properties)
  },

  subscriptionDowngraded: (properties: { fromPlan: string; toPlan: string }) => {
    trackEvent("Subscription Downgraded", properties)
  },

  subscriptionCanceled: (properties: { plan: string }) => {
    trackEvent("Subscription Canceled", properties)
  },

  // ============================================
  // PAGE VIEW EVENTS
  // ============================================
  pageViewed: (pageName: string, properties?: Record<string, unknown>) => {
    trackEvent("Page Viewed", { page: pageName, ...properties })
  },

  dashboardViewed: (properties?: {
    mockServerCount: number
    totalRequests: number
  }) => {
    trackEvent("Dashboard Viewed", properties)
  },

  // ============================================
  // FEATURE USAGE EVENTS
  // ============================================
  featureUsed: (properties: { feature: string; firstTime?: boolean }) => {
    trackEvent("Feature Used", properties)
  },

  statefulModeEnabled: (properties: { serverId: string }) => {
    trackEvent("Stateful Mode Enabled", properties)
  },

  graphqlServiceUsed: (properties: { serviceSlug: string }) => {
    trackEvent("GraphQL Service Used", properties)
  },

  endpointContextAdded: (properties: { serverId: string; endpointPath: string }) => {
    trackEvent("Endpoint Context Added", properties)
  },

  // ============================================
  // ERROR & FRICTION EVENTS
  // ============================================
  errorOccurred: (properties: {
    errorType: string
    errorMessage: string
    page?: string
  }) => {
    trackEvent("Error Occurred", properties)
  },

  limitReached: (properties: {
    limitType: "mock_servers" | "api_keys" | "requests"
    currentPlan: string
  }) => {
    trackEvent("Limit Reached", properties)
  },

  // ============================================
  // USER PROPERTIES
  // ============================================
  setUserProperties: (properties: Record<string, unknown>) => {
    if (typeof window === "undefined" || isInternalUser) return
    if (!initialized) initMixpanel()
    mixpanel.people.set(properties)
  },

  incrementUserProperty: (property: string, value: number = 1) => {
    if (typeof window === "undefined" || isInternalUser) return
    if (!initialized) initMixpanel()
    mixpanel.people.increment(property, value)
  },

  setUserPropertyOnce: (properties: Record<string, unknown>) => {
    if (typeof window === "undefined" || isInternalUser) return
    if (!initialized) initMixpanel()
    mixpanel.people.set_once(properties)
  },
}
