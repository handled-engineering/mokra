import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { parseApiDocumentation, parseApiDocumentationFromUrl } from "@/lib/ai/parse-docs"

function isUrl(str: string): boolean {
  const trimmed = str.trim()
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
}
import { slugify } from "@/lib/utils"

const createServiceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  documentation: z.string().min(10, "Documentation is required"),
})

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const services = await prisma.mockService.findMany({
    include: {
      _count: {
        select: {
          endpoints: true,
          projects: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ services })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, description, documentation } = createServiceSchema.parse(body)

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

    // Create service and endpoints in a transaction
    const service = await prisma.$transaction(async (tx) => {
      const newService = await tx.mockService.create({
        data: {
          name,
          slug,
          description: description || parsedSpec.description,
          documentation,
          parsedSpec: JSON.parse(JSON.stringify(parsedSpec)) as Prisma.InputJsonValue,
          isActive: true,
        },
      })

      // Create endpoints
      if (parsedSpec.endpoints && parsedSpec.endpoints.length > 0) {
        await tx.mockEndpoint.createMany({
          data: parsedSpec.endpoints.map((ep) => ({
            serviceId: newService.id,
            method: ep.method.toUpperCase(),
            path: ep.path,
            description: ep.description,
            requestSchema: (ep.requestSchema || Prisma.JsonNull) as Prisma.InputJsonValue,
            responseSchema: (ep.responseSchema || Prisma.JsonNull) as Prisma.InputJsonValue,
            constraints: ep.constraints,
          })),
        })
      }

      return newService
    })

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
