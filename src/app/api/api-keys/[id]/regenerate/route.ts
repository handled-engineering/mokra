import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { generateApiKey } from "@/lib/utils"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Check ownership
  const existingApiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  })

  if (!existingApiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 })
  }

  // Generate new unique key
  let newKey = generateApiKey()
  let existing = await prisma.apiKey.findUnique({ where: { key: newKey } })
  while (existing) {
    newKey = generateApiKey()
    existing = await prisma.apiKey.findUnique({ where: { key: newKey } })
  }

  // Update the API key
  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: { key: newKey },
    include: {
      exclusions: {
        include: {
          mockServer: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })

  // Return the new unmasked key (only shown once)
  return NextResponse.json({
    apiKey: {
      ...apiKey,
      key: newKey, // Return unmasked key
    },
  })
}
