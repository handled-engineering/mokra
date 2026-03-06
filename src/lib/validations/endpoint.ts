import { z } from "zod"

const schemaFieldSchema = z.record(
  z.string(),
  z.enum(["string", "number", "boolean", "object", "array"])
)

export const createEndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z
    .string()
    .min(1, "Path is required")
    .refine((val) => val.startsWith("/"), "Path must start with /"),
  description: z.string().optional(),
  requestSchema: schemaFieldSchema.optional(),
  queryParams: schemaFieldSchema.optional(),
  responseSchema: z.any().optional(),
  constraints: z.string().optional(),
})

export const updateEndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  path: z
    .string()
    .refine((val) => val.startsWith("/"), "Path must start with /")
    .optional(),
  description: z.string().optional(),
  requestSchema: schemaFieldSchema.optional().nullable(),
  queryParams: schemaFieldSchema.optional().nullable(),
  responseSchema: z.any().optional().nullable(),
  constraints: z.string().optional().nullable(),
})

export type CreateEndpointInput = z.infer<typeof createEndpointSchema>
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>
