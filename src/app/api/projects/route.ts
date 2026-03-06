import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { generateApiKey } from "@/lib/utils"

const createProjectSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  name: z.string().min(1, "Name is required"),
})

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.userProject.findMany({
    where: { userId: session.user.id },
    include: {
      service: true,
      _count: {
        select: {
          requestLogs: true,
          mockStates: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { serviceId, name } = createProjectSchema.parse(body)

    // Check if service exists and is active
    const service = await prisma.mockService.findFirst({
      where: { id: serviceId, isActive: true },
    })

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or inactive" },
        { status: 404 }
      )
    }

    // Check subscription limits (basic plan = 3 projects, pro = unlimited)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    const projectCount = await prisma.userProject.count({
      where: { userId: session.user.id },
    })

    const limits: Record<string, number> = {
      FREE: 10,
      BASIC: 50,
      PRO: 1000,
    }

    const limit = limits[subscription?.plan || "FREE"]
    if (projectCount >= limit) {
      return NextResponse.json(
        { error: `Project limit reached. Upgrade your plan for more projects.` },
        { status: 403 }
      )
    }

    // Generate unique API key
    let apiKey = generateApiKey()
    let existing = await prisma.userProject.findUnique({ where: { apiKey } })
    while (existing) {
      apiKey = generateApiKey()
      existing = await prisma.userProject.findUnique({ where: { apiKey } })
    }

    const project = await prisma.userProject.create({
      data: {
        userId: session.user.id,
        serviceId,
        name,
        apiKey,
      },
      include: {
        service: true,
      },
    })

    return NextResponse.json({ project })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
