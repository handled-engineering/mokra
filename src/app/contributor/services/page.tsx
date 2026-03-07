import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ServicesPage() {
  const services = await prisma.mockService.findMany({
    include: {
      _count: {
        select: {
          mockServers: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Mock Services</h1>
        <Button asChild>
          <Link href="/contributor/services/new">Create New Service</Link>
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">No mock services yet</p>
            <Button asChild>
              <Link href="/contributor/services/new">Create your first service</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Link key={service.id} href={`/contributor/services/${service.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{service.name}</CardTitle>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        service.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <CardDescription>/{service.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {service.description || "No description"}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>{service._count.mockServers} mock servers</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
