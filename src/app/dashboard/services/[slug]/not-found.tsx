import Link from "next/link"
import { Layers, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ServiceNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
      <div className="flex size-16 items-center justify-center rounded-full bg-gray-100 mb-6">
        <Layers className="size-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Service Not Found</h2>
      <p className="text-gray-500 text-center max-w-md mb-6">
        The service you&apos;re looking for doesn&apos;t exist or may have been removed.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard/services">
          <ArrowLeft className="size-4" />
          Back to Services
        </Link>
      </Button>
    </div>
  )
}
