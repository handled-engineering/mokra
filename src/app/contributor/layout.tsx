import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { ContributorSidebar } from "@/components/ui/contributor-sidebar"

export default async function ContributorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "CONTRIBUTOR" && session.user.role !== "ADMIN")) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <ContributorSidebar
        user={{
          email: session.user.email,
          name: session.user.name,
        }}
      />
      <main className="pl-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
