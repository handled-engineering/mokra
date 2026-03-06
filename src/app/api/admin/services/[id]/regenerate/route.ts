import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { parseApiDocumentation, parseApiDocumentationFromUrl } from "@/lib/ai/parse-docs"

function isUrl(str: string): boolean {
  const trimmed = str.trim()
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
}

interface Props {
  params: { id: string }
}

export async function POST(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get the service with its documentation
    const service = await prisma.mockService.findUnique({
      where: { id: params.id },
      include: { endpoints: true },
    })

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    // Re-parse the documentation - use URL parser if documentation is a URL
    const parsedSpec = isUrl(service.documentation)
      ? await parseApiDocumentationFromUrl(service.documentation.trim())
      : await parseApiDocumentation(service.documentation)

    // Update service and endpoints in a transaction
    const updatedService = await prisma.$transaction(async (tx) => {
      // Delete existing endpoints
      await tx.mockEndpoint.deleteMany({
        where: { serviceId: service.id },
      })

      // Update service with new parsed spec
      const updated = await tx.mockService.update({
        where: { id: service.id },
        data: {
          parsedSpec: JSON.parse(JSON.stringify(parsedSpec)) as Prisma.InputJsonValue,
        },
      })

      // Create new endpoints
      if (parsedSpec.endpoints && parsedSpec.endpoints.length > 0) {
        await tx.mockEndpoint.createMany({
          data: parsedSpec.endpoints.map((ep) => ({
            serviceId: service.id,
            method: ep.method.toUpperCase(),
            path: ep.path,
            description: ep.description,
            requestSchema: (ep.requestSchema || Prisma.JsonNull) as Prisma.InputJsonValue,
            responseSchema: (ep.responseSchema || Prisma.JsonNull) as Prisma.InputJsonValue,
            constraints: ep.constraints,
          })),
        })
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      endpointsCount: parsedSpec.endpoints?.length || 0,
      previousCount: service.endpoints.length,
    })
  } catch (error) {
    console.error("Error regenerating documentation:", error)
    return NextResponse.json(
      { error: "Failed to regenerate documentation" },
      { status: 500 }
    )
  }
}
