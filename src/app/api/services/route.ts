import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServiceLoader } from "@/lib/services/loader"

export const dynamic = "force-dynamic"

export async function GET() {
  // Get services from database
  const dbServices = await prisma.mockService.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      category: true,
    },
    orderBy: { name: "asc" },
  })

  // Load endpoint counts from filesystem
  const loader = getServiceLoader()
  const servicesWithCounts = await Promise.all(
    dbServices.map(async (service) => {
      const loadedService = await loader.loadService(service.slug)

      return {
        ...service,
        type: loadedService?.type ?? "rest",
        _count: {
          endpoints: loadedService?.endpoints.length ?? 0,
        },
      }
    })
  )

  return NextResponse.json({ services: servicesWithCounts })
}
