import { notFound } from "next/navigation"
import { getServiceLoader } from "@/lib/services"
import { ServiceDetail } from "./service-detail"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params
  const loader = getServiceLoader()
  const service = await loader.loadService(slug)

  if (!service) {
    notFound()
  }

  return <ServiceDetail service={service} />
}
