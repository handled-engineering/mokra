import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
  typescript: true,
})

export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    priceId: undefined as string | undefined,
    projects: 1,
    requestsPerMonth: 1000,
    features: [
      "1 mock project",
      "1,000 requests/month",
      "Basic AI responses",
      "Community support",
    ],
  },
  BASIC: {
    name: "Basic",
    price: 19,
    priceId: process.env.STRIPE_PRICE_BASIC,
    projects: 5,
    requestsPerMonth: 50000,
    features: [
      "5 mock projects",
      "50,000 requests/month",
      "Advanced AI responses",
      "Email support",
      "Request analytics",
    ],
  },
  PRO: {
    name: "Pro",
    price: 49,
    priceId: process.env.STRIPE_PRICE_PRO,
    projects: 100,
    requestsPerMonth: 500000,
    features: [
      "100 mock projects",
      "500,000 requests/month",
      "Priority AI responses",
      "Priority support",
      "Advanced analytics",
      "Custom constraints",
    ],
  },
}
