import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ServiceLoader,
  generateServiceDocs,
  generateMarkdownDocs,
} from "@/lib/services"

const serviceLoader = new ServiceLoader({
  cacheTTL: process.env.NODE_ENV === "development" ? 0 : 300000,
})

interface RouteParams {
  params: { id: string }
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "CONTRIBUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") || "json"

  try {
    // First, get the service from database to find its slug
    const dbService = await prisma.mockService.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, name: true },
    })

    if (!dbService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    // Try to load from filesystem
    const fileService = await serviceLoader.loadService(dbService.slug)

    if (!fileService) {
      return NextResponse.json(
        {
          error: "No file-based configuration found",
          message: `No service files found at services/${dbService.slug}/. Create a service.json and endpoints folder to enable file-based documentation.`,
          hint: {
            structure: {
              [`services/${dbService.slug}/`]: {
                "service.json": "Service configuration",
                "README.md": "Service documentation (optional)",
                "endpoints/": {
                  "{path}/": {
                    "{METHOD}/": {
                      "endpoint.json": "Endpoint configuration",
                      "notes.md": "Endpoint notes (optional)",
                      "request/schema.json": "Request schema (optional)",
                      "responses/{statusCode}/body.json": "Response body",
                    },
                  },
                },
              },
            },
          },
        },
        { status: 404 }
      )
    }

    // Generate documentation
    const docs = generateServiceDocs(fileService)

    if (format === "markdown") {
      const markdown = generateMarkdownDocs(docs)
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
        },
      })
    }

    return NextResponse.json({
      docs,
      source: "filesystem",
      path: `services/${dbService.slug}`,
    })
  } catch (error) {
    console.error("Error generating docs:", error)
    return NextResponse.json(
      { error: "Failed to generate documentation" },
      { status: 500 }
    )
  }
}
