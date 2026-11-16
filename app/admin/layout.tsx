import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"
import SiteFooter from "@/components/site-footer"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar profile={profile} />
      <div className="flex-1 flex flex-col">
        <AdminHeader profile={profile} />
        <main className="flex-1 p-6 overflow-auto bg-muted/30">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
