import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { EndpointForm } from "../../_components/endpoint-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: { id: string; endpointId: string }
}

export default async function EditEndpointPage({ params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "CONTRIBUTOR") {
    redirect("/")
  }

  const endpoint = await prisma.mockEndpoint.findUnique({
    where: { id: params.endpointId },
    include: { service: true },
  })

  if (!endpoint || endpoint.serviceId !== params.id) {
    redirect(`/contributor/services/${params.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/contributor/services/${params.id}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to {endpoint.service.name}
      </Link>

      <h1 className="text-3xl font-bold mb-8">
        Edit {endpoint.method} {endpoint.path}
      </h1>

      <EndpointForm
        serviceId={params.id}
        endpoint={{
          id: endpoint.id,
          method: endpoint.method,
          path: endpoint.path,
          description: endpoint.description,
          requestSchema: endpoint.requestSchema as Record<string, string> | null,
          responseSchema: endpoint.responseSchema,
          constraints: endpoint.constraints,
        }}
      />
    </div>
  )
}
