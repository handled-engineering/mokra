"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Logo } from "@/components/ui/logo"
import { ArrowLeft } from "lucide-react"

function CodeTerminal() {
  return (
    <div className="rounded-xl bg-[#1e293b] border border-slate-700/50 shadow-2xl overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0f172a] border-b border-slate-700/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-slate-400 text-sm ml-2 font-mono">mock-api.sh</span>
      </div>
      {/* Terminal content */}
      <div className="p-5 font-mono text-sm">
        <div className="text-slate-300">
          <span className="text-emerald-400">$</span>{" "}
          <span className="text-slate-300">curl </span>
          <span className="text-cyan-400">https://api.mokra.dev/crm/contacts</span>
        </div>
        <div className="mt-4 text-slate-300">
          <div className="text-slate-400">{"{"}</div>
          <div className="pl-4">
            <span className="text-cyan-400">&quot;contacts&quot;</span>
            <span className="text-slate-400">: [</span>
          </div>
          <div className="pl-8 text-slate-400">{"{"}</div>
          <div className="pl-12">
            <span className="text-cyan-400">&quot;id&quot;</span>
            <span className="text-slate-400">: </span>
            <span className="text-amber-300">&quot;cntct_8f3k2j&quot;</span>
            <span className="text-slate-400">,</span>
          </div>
          <div className="pl-12">
            <span className="text-cyan-400">&quot;name&quot;</span>
            <span className="text-slate-400">: </span>
            <span className="text-amber-300">&quot;Sarah Chen&quot;</span>
            <span className="text-slate-400">,</span>
          </div>
          <div className="pl-12">
            <span className="text-cyan-400">&quot;email&quot;</span>
            <span className="text-slate-400">: </span>
            <span className="text-emerald-400">&quot;sarah@company.io&quot;</span>
          </div>
          <div className="pl-8 text-slate-400">{"}"}</div>
          <div className="pl-4 text-slate-400">],</div>
          <div className="pl-4">
            <span className="text-cyan-400">&quot;status&quot;</span>
            <span className="text-slate-400">: </span>
            <span className="text-amber-300">200</span>
          </div>
          <div className="text-slate-400">{"}"}</div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Response: 23ms</span>
          <span className="text-slate-600">|</span>
          <span>Mock API Active</span>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

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
      } else {
        window.location.href = "/dashboard"
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] text-white p-12 flex-col relative overflow-hidden">
        {/* Logo */}
        <div className="mb-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size="md" />
            <span className="text-xl font-semibold">Mokra</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="space-y-8 my-auto">
          {/* Badges */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-slate-300 text-sm border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Mock APIs for AI Agents
            </span>
          </div>

          {/* Headline */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
              Test AI agents
              <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                with confidence
              </span>
            </h1>
            <p className="mt-5 text-lg text-slate-400 max-w-md leading-relaxed">
              AI agents can test against mock environments identical to the third-party services they integrate with.
            </p>
          </div>

          {/* Code terminal */}
          <div className="max-w-md">
            <CodeTerminal />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8">
          <p className="text-sm text-slate-500">
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
        </div>
      </div>
    </div>
  )
}
