import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

interface Props {
  params: { id: string }
}

export async function GET(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mockServer = await prisma.mockServer.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    include: {
      service: true,
      _count: {
        select: {
          requestLogs: true,
          mockStates: true,
        },
      },
    },
  })

  if (!mockServer) {
    return NextResponse.json({ error: "Mock server not found" }, { status: 404 })
  }

  return NextResponse.json({ mockServer })
}

export async function DELETE(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mockServer = await prisma.mockServer.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
  })

  if (!mockServer) {
    return NextResponse.json({ error: "Mock server not found" }, { status: 404 })
  }

  await prisma.mockServer.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
