import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  FileText,
  Cpu,
  Database,
  Zap,
  ArrowRight,
  Code2,
  Shield,
  Gauge
} from "lucide-react"

export default function HomePage() {
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
              <Link href="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-slow delay-1000" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="container mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-8 animate-fade-in">
              <Zap className="h-4 w-4" />
              <span>AI-Powered Mock API Generation</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up">
              Build Faster with
              <span className="block gradient-text">Instant Mock APIs</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up">
              Upload your API documentation and get a fully functional mock server in seconds.
              AI-powered responses that understand your constraints and maintain state.
            </p>

            <div className="flex items-center justify-center gap-4 animate-fade-in-up">
              <Link href="/register">
                <Button size="xl" variant="gradient">
                  Start for Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="xl" variant="outline">
                  View Pricing
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-purple-500/60 border-2 border-background" />
                  ))}
                </div>
                <span>1,000+ developers</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <span>4.9/5 rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to mock APIs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to accelerate your development workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card hover className="group">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Any Documentation Format</h3>
                <p className="text-muted-foreground">
                  Upload OpenAPI, Swagger, Postman collections, or even plain text. Our AI understands it all.
                </p>
              </CardContent>
            </Card>

            <Card hover className="group">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Cpu className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI-Powered Responses</h3>
                <p className="text-muted-foreground">
                  Smart responses that follow your API constraints and generate realistic, contextual data.
                </p>
              </CardContent>
            </Card>

            <Card hover className="group">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Database className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Stateful CRUD</h3>
                <p className="text-muted-foreground">
                  Create, read, update, and delete. Your mock API remembers state across all requests.
                </p>
              </CardContent>
            </Card>

            <Card hover className="group">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Code2 className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Developer-First</h3>
                <p className="text-muted-foreground">
                  Simple API keys, comprehensive logs, and instant setup. Built by developers, for developers.
                </p>
              </CardContent>
            </Card>

            <Card hover className="group">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Secure & Reliable</h3>
                <p className="text-muted-foreground">
                  Enterprise-grade security with isolated environments and encrypted data at rest.
                </p>
              </CardContent>
            </Card>

            <Card hover className="group">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Gauge className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
                <p className="text-muted-foreground">
                  Sub-100ms response times globally. Your tests run fast, your development stays smooth.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with just four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { num: 1, title: "Upload Docs", desc: "Paste your API documentation in any format" },
              { num: 2, title: "AI Parses", desc: "Our AI extracts endpoints and constraints automatically" },
              { num: 3, title: "Get API Key", desc: "Create a project and get your unique API key instantly" },
              { num: 4, title: "Start Testing", desc: "Call your mock API with realistic responses" },
            ].map((step, i) => (
              <div key={step.num} className="relative text-center">
                {i < 3 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
                )}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold shadow-glow">
                  {step.num}
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <Card className="bg-gradient-to-br from-primary/5 via-blue-500/5 to-cyan-500/5 border-primary/20">
            <CardContent className="p-12 md:p-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to accelerate your development?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Join thousands of developers who are already building faster with MockAPI.
              </p>
              <Link href="/register">
                <Button size="xl" variant="gradient">
                  Get Started for Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">MockAPI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Create mock APIs instantly with AI
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
