import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { updateEndpointSchema } from "@/lib/validations/endpoint"
import { z } from "zod"
import { Prisma } from "@prisma/client"

interface Props {
  params: { id: string }
}

export async function GET(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const endpoint = await prisma.mockEndpoint.findUnique({
      where: { id: params.id },
    })

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 })
    }

    return NextResponse.json({ endpoint })
  } catch (error) {
    console.error("Error fetching endpoint:", error)
    return NextResponse.json(
      { error: "Failed to fetch endpoint" },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = updateEndpointSchema.parse(body)

    // Check if endpoint exists
    const existingEndpoint = await prisma.mockEndpoint.findUnique({
      where: { id: params.id },
    })

    if (!existingEndpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 })
    }

    // If changing method or path, check for uniqueness
    if (data.method || data.path) {
      const conflictingEndpoint = await prisma.mockEndpoint.findFirst({
        where: {
          serviceId: existingEndpoint.serviceId,
          method: data.method || existingEndpoint.method,
          path: data.path || existingEndpoint.path,
          NOT: { id: params.id },
        },
      })

      if (conflictingEndpoint) {
        return NextResponse.json(
          { error: "An endpoint with this method and path already exists" },
          { status: 409 }
        )
      }
    }

    // Build update data, only including fields that are provided
    const updateData: Prisma.MockEndpointUpdateInput = {}

    if (data.method !== undefined) updateData.method = data.method
    if (data.path !== undefined) updateData.path = data.path
    if (data.description !== undefined && data.description !== null) {
      updateData.description = data.description
    }
    if (data.requestSchema !== undefined && data.requestSchema !== null) {
      updateData.requestSchema = data.requestSchema as Prisma.InputJsonValue
    }
    if (data.responseSchema !== undefined && data.responseSchema !== null) {
      updateData.responseSchema = data.responseSchema as Prisma.InputJsonValue
    }
    if (data.constraints !== undefined && data.constraints !== null) {
      updateData.constraints = data.constraints
    }

    const endpoint = await prisma.mockEndpoint.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ endpoint })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("Error updating endpoint:", error)
    return NextResponse.json(
      { error: "Failed to update endpoint" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.mockEndpoint.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting endpoint:", error)
    return NextResponse.json(
      { error: "Failed to delete endpoint" },
      { status: 500 }
    )
  }
}
