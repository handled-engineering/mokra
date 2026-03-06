import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { createEndpointSchema } from "@/lib/validations/endpoint"
import { z } from "zod"

interface Props {
  params: { id: string }
}

export async function POST(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createEndpointSchema.parse(body)

    // Verify service exists
    const service = await prisma.mockService.findUnique({
      where: { id: params.id },
    })

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    // Check for duplicate method + path
    const existingEndpoint = await prisma.mockEndpoint.findFirst({
      where: {
        serviceId: params.id,
        method: data.method,
        path: data.path,
      },
    })

    if (existingEndpoint) {
      return NextResponse.json(
        { error: "An endpoint with this method and path already exists" },
        { status: 409 }
      )
    }

    const endpoint = await prisma.mockEndpoint.create({
      data: {
        serviceId: params.id,
        method: data.method,
        path: data.path,
        description: data.description,
        requestSchema: data.requestSchema || data.queryParams,
        responseSchema: data.responseSchema,
        constraints: data.constraints,
      },
    })

    return NextResponse.json({ endpoint }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error creating endpoint:", error)
    return NextResponse.json(
      { error: "Failed to create endpoint" },
      { status: 500 }
    )
  }
}
