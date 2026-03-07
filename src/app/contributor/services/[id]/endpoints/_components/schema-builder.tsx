"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"

export interface SchemaField {
  key: string
  type: string
}

const FIELD_TYPES = ["string", "number", "boolean", "object", "array"]

interface SchemaBuilderProps {
  label: string
  value: SchemaField[]
  onChange: (fields: SchemaField[]) => void
}

export function SchemaBuilder({ label, value, onChange }: SchemaBuilderProps) {
  const addField = () => {
    onChange([...value, { key: "", type: "string" }])
  }

  const removeField = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<SchemaField>) => {
    const newFields = [...value]
    newFields[index] = { ...newFields[index], ...updates }
    onChange(newFields)
  }

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        {value.map((field, index) => (
          <div key={index} className="flex gap-2 items-center">
            <Input
              placeholder="Field name"
              value={field.key}
              onChange={(e) => updateField(index, { key: e.target.value })}
              className="flex-1"
            />
            <select
              value={field.type}
              onChange={(e) => updateField(index, { type: e.target.value })}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeField(index)}
              className="text-gray-500 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addField}>
        <Plus className="h-4 w-4 mr-2" />
        Add Field
      </Button>
    </div>
  )
}

export function schemaFieldsToObject(fields: SchemaField[]): Record<string, string> {
  return fields.reduce((acc, field) => {
    if (field.key.trim()) {
      acc[field.key.trim()] = field.type
    }
    return acc
  }, {} as Record<string, string>)
}

export function objectToSchemaFields(obj: Record<string, string> | null | undefined): SchemaField[] {
  if (!obj || typeof obj !== "object") return []
  return Object.entries(obj).map(([key, type]) => ({
    key,
    type: typeof type === "string" ? type : "string",
  }))
}
