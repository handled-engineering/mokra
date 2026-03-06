"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Logo } from "@/components/ui/logo"
import { ArrowLeft, Check } from "lucide-react"

function ShootingStars() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Shooting star 1 */}
      <div className="absolute top-[20%] -left-[10%] w-[200px] h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent rotate-[35deg] animate-[shooting_3s_ease-in-out_infinite]" style={{ animationDelay: '0s' }} />

      {/* Shooting star 2 */}
      <div className="absolute top-[35%] -left-[5%] w-[150px] h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent rotate-[40deg] animate-[shooting_4s_ease-in-out_infinite]" style={{ animationDelay: '1.5s' }} />

      {/* Shooting star 3 */}
      <div className="absolute top-[50%] -left-[15%] w-[250px] h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent rotate-[30deg] animate-[shooting_3.5s_ease-in-out_infinite]" style={{ animationDelay: '0.8s' }} />

      {/* Shooting star 4 */}
      <div className="absolute top-[65%] -left-[8%] w-[180px] h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent rotate-[45deg] animate-[shooting_4.5s_ease-in-out_infinite]" style={{ animationDelay: '2.2s' }} />

      {/* Shooting star 5 */}
      <div className="absolute top-[15%] left-[30%] w-[120px] h-[1px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rotate-[38deg] animate-[shooting_5s_ease-in-out_infinite]" style={{ animationDelay: '3s' }} />

      {/* Shooting star 6 */}
      <div className="absolute top-[80%] -left-[12%] w-[220px] h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent rotate-[32deg] animate-[shooting_3.8s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />

      {/* Glowing orbs */}
      <div className="absolute top-[25%] right-[20%] w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[30%] left-[10%] w-40 h-40 bg-blue-400/10 rounded-full blur-3xl" />

      <style jsx>{`
        @keyframes shooting {
          0% {
            transform: translateX(0) translateY(0) rotate(35deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(500px) translateY(300px) rotate(35deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Registration failed")
      }

      toast({
        title: "Success",
        description: "Account created successfully. Please sign in.",
      })
      router.push("/login")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    "10 free mock projects",
    "1,000 requests per month",
    "AI-powered responses",
    "No credit card required",
  ]

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-white text-slate-900 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40" />

        {/* Shooting stars */}
        <ShootingStars />

        {/* Content container */}
        <div className="relative z-10 flex flex-col w-full p-10 xl:p-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size="md" />
            <span className="text-xl font-semibold text-slate-900">Mokra</span>
          </Link>

          {/* Main content - centered */}
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-lg">
              {/* Badge */}
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Mock APIs for AI Agents
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-slate-900">
                Start building
                <span className="block bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  in minutes
                </span>
              </h1>

              <p className="mt-5 text-base xl:text-lg text-slate-500 max-w-md leading-relaxed">
                Create your free account and start mocking APIs instantly with AI-powered responses.
              </p>

              {/* Benefits list */}
              <ul className="mt-6 space-y-2.5">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-slate-600 text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* Y Combinator badge */}
              <div className="mt-8 flex items-center gap-2.5">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-orange-500">
                  <span className="text-white text-sm font-bold">Y</span>
                </div>
                <span className="text-slate-500 text-sm">Backed by Y Combinator</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-slate-400">
            Trusted by developers worldwide
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors lg:hidden">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Logo size="lg" />
            <span className="text-2xl font-bold">Mokra</span>
          </div>

          <Card className="border-0 shadow-soft-lg">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
              <CardDescription>
                Get started with your free account today
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-11"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-2">
                <Button type="submit" className="w-full" size="lg" variant="gradient" loading={loading}>
                  Create account
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
