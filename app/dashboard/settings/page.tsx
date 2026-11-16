'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Check, ImagePlus, KeyRound, Loader2, LockKeyhole, Moon, ShieldCheck, Sun, Trash2, UserRound } from 'lucide-react'
import type { Profile } from '@/lib/types'

export default function SettingsPage() {
  const supabase = createClient()
  const { theme, setTheme, systemTheme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', student_number: '' })
  const [accountRole, setAccountRole] = useState('student')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [emailUpdates, setEmailUpdates] = useState(true)
  const [analyticsConsent, setAnalyticsConsent] = useState(false)
  const [profileVisibility, setProfileVisibility] = useState<'private' | 'clinic'>('private')
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as Profile)
        setAccountRole(data.role === 'healthcare_professional' || data.role === 'doctor' || data.role === 'nurse' ? 'healthcare_professional' : 'student')
        setForm({ first_name: data.first_name ?? '', last_name: data.last_name ?? '', phone: data.phone ?? '', student_number: data.student_number ?? '' })
        setEmailUpdates(data.email_updates ?? true)
        setAnalyticsConsent(data.analytics_consent ?? false)
        setProfileVisibility(data.profile_visibility ?? 'private')
        if (data.avatar_url) {
          const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(data.avatar_url, 3600)
          setAvatarUrl(signed?.signedUrl ?? null)
        }
      }
      setLoading(false)
    }
    loadProfile()
  }, [supabase])

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Your profile picture must be smaller than 5 MB.' })
      return
    }

    setUploadingAvatar(true)
    setMessage(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage({ type: 'error', text: 'Your session has expired. Please sign in again.' })
      setUploadingAvatar(false)
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/avatar.${extension}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    })
    if (uploadError) {
      console.error('[v0] Avatar upload failed:', uploadError)
      setMessage({ type: 'error', text: uploadError.message || 'We could not upload your profile picture. Please try again.' })
      setUploadingAvatar(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').update({ avatar_url: path, updated_at: new Date().toISOString() }).eq('id', user.id)
    const { data: signed, error: signedError } = await supabase.storage.from('avatars').createSignedUrl(path, 3600)
    if (profileError || signedError || !signed?.signedUrl) {
      console.error('[v0] Avatar profile save failed:', { profileError, signedError })
      setMessage({
        type: 'error',
        text: profileError?.message || signedError?.message || 'The picture uploaded, but we could not save it to your profile.',
      })
    } else {
      setAvatarUrl(`${signed.signedUrl}&v=${Date.now()}`)
      setProfile((current) => current ? { ...current, avatar_url: path } : current)
      setMessage({ type: 'success', text: 'Your profile picture has been updated.' })
    }
    setUploadingAvatar(false)
  }

  const removeAvatar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !profile?.avatar_url) return
    setUploadingAvatar(true)
    const { error: storageError } = await supabase.storage.from('avatars').remove([profile.avatar_url])
    if (!storageError) {
      const { error } = await supabase.from('profiles').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', user.id)
      if (!error) {
        setAvatarUrl(null)
        setProfile((current) => current ? { ...current, avatar_url: null } : current)
        setMessage({ type: 'success', text: 'Your profile picture was removed.' })
      }
    }
    if (storageError) setMessage({ type: 'error', text: 'We could not remove your profile picture. Please try again.' })
    setUploadingAvatar(false)
  }

  const updatePreferences = async (updates: Record<string, boolean | string>) => {
    if (!profile) return
    setMessage(null)
    const { error } = await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', profile.id)
    if (error) setMessage({ type: 'error', text: 'We could not save that preference.' })
    else {
      setProfile((current) => current ? { ...current, ...updates } : current)
      setMessage({ type: 'success', text: 'Your preference was saved.' })
    }
  }

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (passwords.next.length < 8) return setMessage({ type: 'error', text: 'Your new password must be at least 8 characters.' })
    if (passwords.next !== passwords.confirm) return setMessage({ type: 'error', text: 'The passwords do not match.' })
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.next })
    setChangingPassword(false)
    if (error) setMessage({ type: 'error', text: 'We could not change your password. Please try again.' })
    else {
      setPasswords({ current: '', next: '', confirm: '' })
      setMessage({ type: 'success', text: 'Your password has been changed.' })
    }
  }

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setMessage(null)
  }

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return
    setSaving(true)
    setMessage(null)
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...form, role: accountRole, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select('*')
      .single()

    if (error) {
      setMessage({ type: 'error', text: 'We could not save your profile. Please try again.' })
    } else {
      setProfile(data as Profile)
      setMessage({ type: 'success', text: 'Your profile has been updated.' })
    }
    setSaving(false)
  }

  const selectedTheme = theme === 'system' ? `system-${systemTheme ?? 'light'}` : theme

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Account preferences</p>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your profile, appearance, and notification preferences.</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-destructive/30 bg-destructive/10 text-destructive'}`} role="status">
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div>
              <div><CardTitle>Profile information</CardTitle><CardDescription>Keep your contact details up to date.</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading your profile...</div> : (
              <>
                <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-muted/30 p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary ring-2 ring-background ring-offset-2 ring-offset-primary/20">
                    {avatarUrl ? <img src={avatarUrl} alt="Your profile" className="h-full w-full object-cover" /> : <UserRound className="h-9 w-9" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Profile picture</p>
                    <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, GIF, or WebP up to 5 MB.</p>
                    <Label htmlFor="avatar-upload" className="mt-3 inline-flex cursor-pointer items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                      {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                      {uploadingAvatar ? 'Uploading...' : 'Upload picture'}
                    </Label>
                    {avatarUrl && <Button type="button" variant="ghost" size="sm" className="ml-2 text-destructive" onClick={removeAvatar} disabled={uploadingAvatar}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>}
                    <Input id="avatar-upload" type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={uploadAvatar} disabled={uploadingAvatar} />
                  </div>
                </div>
                <form onSubmit={saveProfile} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="first_name">First name</Label><Input id="first_name" value={form.first_name} onChange={(e) => updateForm('first_name', e.target.value)} required /></div>
                  <div className="space-y-2"><Label htmlFor="last_name">Last name</Label><Input id="last_name" value={form.last_name} onChange={(e) => updateForm('last_name', e.target.value)} required /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" value={profile?.email ?? ''} disabled /><p className="text-xs text-muted-foreground">Your email is managed by the clinic account.</p></div>
                <div className="space-y-2"><Label htmlFor="phone">Phone number</Label><Input id="phone" type="tel" placeholder="e.g. 071 234 5678" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} /></div>
  {accountRole === 'student' && <div className="space-y-2"><Label htmlFor="student_number">Student number</Label><Input id="student_number" placeholder="e.g. STU-2026-001" value={form.student_number} onChange={(e) => updateForm('student_number', e.target.value)} required /></div>}
  <div className="grid gap-5 sm:grid-cols-1">
  <div className="space-y-2">
    <Label htmlFor="role">Account role</Label>
    <Input
      id="role"
      value={accountRole}
      onChange={(event) => setAccountRole(event.target.value)}
      placeholder="Enter account role"
      className="capitalize"
      disabled={profile?.role === 'student'}
    />
  </div>
  </div>
                <div className="flex justify-end"><Button type="submit" disabled={saving || loading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button></div>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sun className="h-5 w-5" /></div><div><CardTitle>Appearance</CardTitle><CardDescription>Choose how the portal looks.</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-4">
              <Label htmlFor="theme">Theme</Label>
              <Select value={mounted ? selectedTheme : 'light'} onValueChange={(value) => setTheme(value.startsWith('system-') ? 'system' : value)} disabled={!mounted}>
                <SelectTrigger id="theme"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="light"><span className="flex items-center gap-2"><Sun className="h-4 w-4" />Light</span></SelectItem><SelectItem value="dark"><span className="flex items-center gap-2"><Moon className="h-4 w-4" />Dark</span></SelectItem><SelectItem value="system-light">System default</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Your choice is remembered on this device.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div><div><CardTitle>Notifications</CardTitle><CardDescription>Control clinic updates.</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-4"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Email updates</p><p className="text-xs text-muted-foreground">Appointment reminders and notices</p></div><Switch checked={emailUpdates} onCheckedChange={(value) => { setEmailUpdates(value); updatePreferences({ email_updates: value }) }} aria-label="Email updates" /></div><Separator /><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Anonymous analytics</p><p className="text-xs text-muted-foreground">Help improve the clinic portal</p></div><Switch checked={analyticsConsent} onCheckedChange={(value) => { setAnalyticsConsent(value); updatePreferences({ analytics_consent: value }) }} aria-label="Anonymous analytics" /></div><p className="text-xs text-muted-foreground">Preferences are applied to future clinic messages.</p></CardContent>
          </Card>

          <Card>
            <CardHeader><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="h-5 w-5" /></div><div><CardTitle>Privacy</CardTitle><CardDescription>Choose who can see your profile.</CardDescription></div></div></CardHeader>
            <CardContent className="space-y-3"><Label htmlFor="visibility">Profile visibility</Label><Select value={profileVisibility} onValueChange={(value: 'private' | 'clinic') => { setProfileVisibility(value); updatePreferences({ profile_visibility: value }) }}><SelectTrigger id="visibility"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="private">Private</SelectItem><SelectItem value="clinic">Visible to clinic staff</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Private profiles are only visible to you and authorized care staff.</p></CardContent>
          </Card>

          <Card>
            <CardHeader><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></div><div><CardTitle>Password</CardTitle><CardDescription>Keep your account secure.</CardDescription></div></div></CardHeader>
            <CardContent><form onSubmit={changePassword} className="space-y-4"><div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={8} value={passwords.next} onChange={(e) => setPasswords((current) => ({ ...current, next: e.target.value }))} required /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" minLength={8} value={passwords.confirm} onChange={(e) => setPasswords((current) => ({ ...current, confirm: e.target.value }))} required /></div><Button type="submit" variant="outline" disabled={changingPassword}>{changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Change password</Button></form></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
