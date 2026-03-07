import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { parseApiDocumentation, parseApiDocumentationFromUrl } from "@/lib/ai/parse-docs"
import { isValidCategory } from "@/lib/categories"
import { serverAnalytics } from "@/lib/mixpanel-server"

function isUrl(str: string): boolean {
  const trimmed = str.trim()
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
}
import { slugify } from "@/lib/utils"

const createServiceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  documentation: z.string().min(10, "Documentation is required"),
})

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "CONTRIBUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const services = await prisma.mockService.findMany({
    include: {
      _count: {
        select: {
          mockServers: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ services })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "CONTRIBUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, description, category, documentation } = createServiceSchema.parse(body)

    // Validate category if provided
    if (category && !isValidCategory(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    // Generate unique slug
    let slug = slugify(name)
    const existing = await prisma.mockService.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now()}`
    }

    // Parse documentation with AI - use URL parser if documentation is a URL
    const parsedSpec = isUrl(documentation)
      ? await parseApiDocumentationFromUrl(documentation.trim())
      : await parseApiDocumentation(documentation)

    // Create service with parsed spec (endpoints are stored in parsedSpec)
    const service = await prisma.mockService.create({
      data: {
        name,
        slug,
        description: description || parsedSpec.description,
        category,
        documentation,
        parsedSpec: JSON.parse(JSON.stringify(parsedSpec)) as Prisma.InputJsonValue,
        isActive: true,
      },
    })

    // Track service created
    serverAnalytics.serviceCreated(session.user.id, {
      serviceId: service.id,
      serviceName: service.name,
      serviceSlug: service.slug,
      serviceType: "rest",
    }, session.user.email)

    return NextResponse.json({
      service,
      endpointsCount: parsedSpec.endpoints?.length || 0,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating service:", error)
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    )
  }
}
