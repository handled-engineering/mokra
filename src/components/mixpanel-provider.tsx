"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { initMixpanel, identifyUser, resetUser } from "@/lib/mixpanel"

export function MixpanelProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    initMixpanel()
  }, [])

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      identifyUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        plan: session.user.plan,
      })
    } else if (status === "unauthenticated") {
      resetUser()
    }
  }, [session, status])

  return <>{children}</>
}
