"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  text: string
}

export function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? "Copied!" : "Copy"}
    </Button>
  )
}
