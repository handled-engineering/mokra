"use client"

import { SessionProvider } from "next-auth/react"
import { MixpanelProvider } from "./mixpanel-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MixpanelProvider>{children}</MixpanelProvider>
    </SessionProvider>
  )
}
