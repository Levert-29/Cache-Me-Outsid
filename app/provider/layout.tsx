import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { ProviderSidebar } from "@/components/provider/sidebar"
import { ProviderHeader } from "@/components/provider/header"
import SiteFooter from "@/components/site-footer"

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is a healthcare provider
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const metadataRole = user.user_metadata?.role
  const normalizedRole = ["doctor", "nurse", "healthcare_professional"].includes(metadataRole)
    ? metadataRole
    : metadataRole === "admin"
      ? "admin"
      : null
  const effectiveRole = normalizedRole || profile?.role

  const providerProfile = profile ? { ...profile, role: effectiveRole || profile.role } : (normalizedRole ? {
    id: user.id,
    student_number: user.user_metadata?.student_number ?? null,
    email: user.email ?? "",
    first_name: user.user_metadata?.first_name ?? "",
    last_name: user.user_metadata?.last_name ?? "",
    phone: user.user_metadata?.phone ?? null,
    role: normalizedRole,
    specialization: user.user_metadata?.specialization ?? null,
    is_verified: Boolean(user.email_confirmed_at),
    created_at: user.created_at,
    updated_at: user.updated_at ?? user.created_at,
  } : null)

  if (!providerProfile || !["healthcare_professional", "doctor", "nurse", "admin"].includes(providerProfile.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Provider access required</h1>
          <p className="mt-2 text-muted-foreground">This account is not assigned a doctor or nurse role.</p>
        </div>
      </main>
    )
  }

  const storedAvatarUrl = providerProfile.avatar_url
  let avatarUrl: string | null = null

  if (storedAvatarUrl) {
    if (storedAvatarUrl.startsWith("http://") || storedAvatarUrl.startsWith("https://")) {
      avatarUrl = storedAvatarUrl
    } else {
      const serviceUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
      const avatarClient = serviceUrl && serviceKey
        ? createSupabaseClient(serviceUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        : supabase
      const { data: signedAvatar, error: avatarError } = await avatarClient.storage
        .from("avatars")
        .createSignedUrl(storedAvatarUrl, 3600)

      if (avatarError) {
        console.error("[v0] Provider avatar URL failed:", avatarError)
      } else {
        avatarUrl = signedAvatar?.signedUrl ?? null
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      <ProviderSidebar profile={providerProfile} avatarUrl={avatarUrl} />
      <div className="flex-1 flex flex-col">
        <ProviderHeader profile={providerProfile} avatarUrl={avatarUrl} />
        <main className="flex-1 p-6 overflow-auto bg-muted/30">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
