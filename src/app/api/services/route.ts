import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const services = await prisma.mockService.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: {
        select: { endpoints: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ services })
}
