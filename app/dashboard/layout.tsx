import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import type { Profile } from '@/lib/types'
import SiteFooter from '@/components/site-footer'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  console.log('[v0] Dashboard role lookup:', {
    userId: user.id,
    email: user.email,
    profileRole: profile?.role,
    profileError: profileError?.message,
  })

  // Some existing accounts may not have a profile row yet. Keep the authenticated
  // session usable and derive a minimal profile from Supabase user metadata.
  const metadataRole = user.user_metadata?.role
  const normalizedMetadataRole = ['doctor', 'nurse', 'healthcare_professional'].includes(metadataRole)
    ? 'healthcare_professional'
    : metadataRole === 'admin'
      ? 'admin'
      : 'student'

  const displayProfile = profile ?? {
    id: user.id,
    student_number: user.user_metadata?.student_number ?? null,
    email: user.email ?? '',
    first_name: user.user_metadata?.first_name ?? '',
    last_name: user.user_metadata?.last_name ?? '',
    phone: user.user_metadata?.phone ?? null,
    role: normalizedMetadataRole,
    specialization: user.user_metadata?.specialization ?? null,
    is_verified: Boolean(user.email_confirmed_at),
    created_at: user.created_at,
    updated_at: user.updated_at ?? user.created_at,
  } as Profile

  if (['healthcare_professional', 'doctor', 'nurse', 'admin'].includes(displayProfile.role)) {
    redirect('/provider')
  }

  let avatarUrl: string | null = null
  if (displayProfile.avatar_url) {
    const storedAvatarUrl = displayProfile.avatar_url
    if (storedAvatarUrl.startsWith('http://') || storedAvatarUrl.startsWith('https://')) {
      avatarUrl = storedAvatarUrl
    } else {
      const { data: signedAvatar, error: avatarError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(storedAvatarUrl, 3600)
      if (avatarError) console.error('[v0] Student avatar URL failed:', avatarError)
      avatarUrl = signedAvatar?.signedUrl ?? null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar profile={displayProfile} avatarUrl={avatarUrl} />
      <div className="lg:pl-64">
        <DashboardHeader profile={displayProfile} avatarUrl={avatarUrl} />
        <main className="p-4 lg:p-6">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
