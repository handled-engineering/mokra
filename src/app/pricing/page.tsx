"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Check, Zap, Sparkles, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Free",
    description: "Perfect for trying things out",
    price: 0,
    plan: "FREE",
    icon: Zap,
    features: [
      "10 mock projects",
      "1,000 requests/month",
      "Basic AI responses",
      "Community support",
    ],
  },
  {
    name: "Basic",
    description: "For individual developers",
    price: 19,
    plan: "BASIC",
    icon: Sparkles,
    popular: true,
    features: [
      "50 mock projects",
      "50,000 requests/month",
      "Advanced AI responses",
      "Email support",
      "Request analytics",
    ],
  },
  {
    name: "Pro",
    description: "For teams and power users",
    price: 49,
    plan: "PRO",
    icon: Crown,
    features: [
      "1,000 mock projects",
      "500,000 requests/month",
      "Priority AI responses",
      "Priority support",
      "Advanced analytics",
      "Custom constraints",
    ],
  },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubscribe = async (plan: string) => {
    if (!session) {
      router.push("/register")
      return
    }

    if (plan === "FREE") {
      router.push("/dashboard")
      return
    }

    setLoading(plan)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      window.location.href = data.url
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">MockAPI</span>
            </Link>
            <div className="flex items-center gap-2">
              {session ? (
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost">Sign in</Button>
                  </Link>
                  <Link href="/register">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-24">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Simple Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include AI-powered mock responses.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const Icon = plan.icon
              const isCurrentPlan = session?.user?.plan === plan.plan

              return (
                <Card
                  key={plan.name}
                  className={cn(
                    "relative flex flex-col transition-all duration-300",
                    plan.popular && "border-primary shadow-glow scale-105 z-10"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium px-4 py-1.5 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4 pt-8">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4",
                      plan.popular ? "bg-primary text-white" : "bg-accent text-accent-foreground"
                    )}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-5xl font-bold">${plan.price}</span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground">/month</span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                            <Check className="h-3.5 w-3.5 text-success" />
                          </div>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4">
                    <Button
                      className="w-full"
                      size="lg"
                      variant={plan.popular ? "gradient" : "outline"}
                      onClick={() => handleSubscribe(plan.plan)}
                      disabled={loading === plan.plan || isCurrentPlan}
                      loading={loading === plan.plan}
                    >
                      {isCurrentPlan
                        ? "Current Plan"
                        : plan.price === 0
                        ? "Get Started Free"
                        : "Subscribe Now"}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          {/* FAQ or additional info */}
          <div className="mt-20 text-center">
            <p className="text-muted-foreground">
              All plans include a 14-day free trial. No credit card required for the Free plan.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
