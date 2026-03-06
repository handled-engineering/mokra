import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { EndpointForm } from "../_components/endpoint-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: { id: string }
}

export default async function NewEndpointPage({ params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/")
  }

  const service = await prisma.mockService.findUnique({
    where: { id: params.id },
  })

  if (!service) {
    redirect("/admin/services")
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/admin/services/${params.id}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to {service.name}
      </Link>

      <h1 className="text-3xl font-bold mb-8">Add Endpoint to {service.name}</h1>

      <EndpointForm serviceId={params.id} />
    </div>
  )
}
