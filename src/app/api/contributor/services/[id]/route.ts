import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

interface Props {
  params: { id: string }
}

export async function GET(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "CONTRIBUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const service = await prisma.mockService.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: { mockServers: true },
      },
    },
  })

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 })
  }

  return NextResponse.json({ service })
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "CONTRIBUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { isActive, name, description } = body

    const service = await prisma.mockService.update({
      where: { id: params.id },
      data: {
        ...(typeof isActive === "boolean" && { isActive }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    })

    return NextResponse.json({ service })
  } catch (error) {
    console.error("Error updating service:", error)
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "CONTRIBUTOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.mockService.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting service:", error)
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    )
  }
}
