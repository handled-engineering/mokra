import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ServiceActions } from "./service-actions"
import { ServiceDocs } from "./_components/service-docs"

interface Props {
  params: { id: string }
}

export default async function ServiceDetailPage({ params }: Props) {
  const service = await prisma.mockService.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: { projects: true },
      },
    },
  })

  if (!service) {
    notFound()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/contributor/services"
            className="text-sm text-gray-600 hover:underline mb-2 block"
          >
            Back to Services
          </Link>
          <h1 className="text-3xl font-bold">{service.name}</h1>
          <p className="text-gray-600 mt-1">/{service.slug}</p>
        </div>
        <ServiceActions service={service} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* File-Based Documentation */}
          <ServiceDocs serviceId={service.id} />
        </div>

        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Service Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`inline-block px-2 py-1 text-sm rounded-full ${
                    service.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {service.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold">{service._count.projects}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm">
                  {new Date(service.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage */}
          <Card>
            <CardHeader>
              <CardTitle>API Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">Base URL:</p>
              <code className="text-sm bg-gray-100 p-2 rounded block">
                /api/mock/{service.slug}
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Include your API key in the X-API-Key header
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
