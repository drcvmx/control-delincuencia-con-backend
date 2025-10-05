import type React from "react"
import { Header } from "@/components/header"
import { AuthGuard } from "@/components/auth-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </AuthGuard>
  )
}
