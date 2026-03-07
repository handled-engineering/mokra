// Endpoint interface (endpoints loaded from filesystem)
interface Endpoint {
  method: string
  path: string
  description?: string | null
}

interface Props {
  endpoints: Endpoint[]
  serviceId: string
}

const methodColors: Record<string, string> = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-yellow-100 text-yellow-800",
  PATCH: "bg-orange-100 text-orange-800",
  DELETE: "bg-red-100 text-red-800",
}

export function EndpointList({ endpoints }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4">
        Endpoints are defined in the filesystem under <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">services/[slug]/endpoints/</code>
      </p>
      {endpoints.map((endpoint, idx) => (
        <div
          key={`${endpoint.method}:${endpoint.path}:${idx}`}
          className="flex items-start gap-4 p-4 rounded-lg border bg-gray-50"
        >
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              methodColors[endpoint.method] || "bg-gray-100"
            }`}
          >
            {endpoint.method}
          </span>
          <div className="flex-1">
            <code className="text-sm font-mono">{endpoint.path}</code>
            {endpoint.description && (
              <p className="text-sm text-gray-600 mt-1">
                {endpoint.description}
              </p>
            )}
          </div>
        </div>
      ))}
      {endpoints.length === 0 && (
        <p className="text-gray-500 text-center py-4">No endpoints found</p>
      )}
    </div>
  )
}
