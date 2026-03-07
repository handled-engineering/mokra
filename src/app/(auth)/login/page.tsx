"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Logo } from "@/components/ui/logo"
import { ArrowLeft } from "lucide-react"
import { analytics } from "@/lib/mixpanel"

function ShootingStars() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-[20%] -left-[10%] w-[200px] h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent rotate-[35deg] animate-[shooting_3s_ease-in-out_infinite]" style={{ animationDelay: '0s' }} />
      <div className="absolute top-[35%] -left-[5%] w-[150px] h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent rotate-[40deg] animate-[shooting_4s_ease-in-out_infinite]" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-[50%] -left-[15%] w-[250px] h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent rotate-[30deg] animate-[shooting_3.5s_ease-in-out_infinite]" style={{ animationDelay: '0.8s' }} />
      <div className="absolute top-[65%] -left-[8%] w-[180px] h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent rotate-[45deg] animate-[shooting_4.5s_ease-in-out_infinite]" style={{ animationDelay: '2.2s' }} />
      <div className="absolute top-[15%] left-[30%] w-[120px] h-[1px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rotate-[38deg] animate-[shooting_5s_ease-in-out_infinite]" style={{ animationDelay: '3s' }} />
      <div className="absolute top-[80%] -left-[12%] w-[220px] h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent rotate-[32deg] animate-[shooting_3.8s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[25%] right-[20%] w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[30%] left-[10%] w-40 h-40 bg-blue-400/10 rounded-full blur-3xl" />
      <style jsx>{`
        @keyframes shooting {
          0% { transform: translateX(0) translateY(0) rotate(35deg); opacity: 0; }
          10% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateX(500px) translateY(300px) rotate(35deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: "Error",
          description: "Invalid email or password",
          variant: "destructive",
        })
        setLoading(false)
      } else if (result?.ok) {
        analytics.userLoggedIn({ method: "credentials" })
        // Small delay to ensure session cookie is set
        await new Promise(resolve => setTimeout(resolve, 100))
        window.location.href = callbackUrl
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-soft-lg">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Sign in
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-white text-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40" />
        <ShootingStars />
        <div className="relative z-10 flex flex-col w-full p-10 xl:p-16">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size="md" />
            <span className="text-xl font-semibold text-slate-900">Mokra</span>
          </Link>
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-lg">
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Mock APIs for AI Agents
                </span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-slate-900">
                Test AI agents
                <span className="block bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  with confidence
                </span>
              </h1>
              <p className="mt-5 text-base xl:text-lg text-slate-500 max-w-md leading-relaxed">
                AI agents can test against mock environments identical to the third-party services they integrate with. No credentials needed.
              </p>
              <div className="mt-8 flex items-center gap-2.5">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-orange-500">
                  <span className="text-white text-sm font-bold">Y</span>
                </div>
                <span className="text-slate-500 text-sm">Backed by Y Combinator</span>
              </div>
            </div>
          </div>
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
          <Suspense fallback={
            <Card className="border-0 shadow-soft-lg">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                <CardDescription>Loading...</CardDescription>
              </CardHeader>
            </Card>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
