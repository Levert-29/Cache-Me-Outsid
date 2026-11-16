import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const dayOfWeek = Number(body.day_of_week)
    const slotDuration = Number(body.slot_duration_minutes)
    const startTime = String(body.start_time)
    const endTime = String(body.end_time)

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !Number.isInteger(slotDuration) || slotDuration < 10 || slotDuration > 120 || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json({ error: 'Invalid availability details.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('specialization').eq('id', user.id).maybeSingle()
    let { data: professional } = await admin.from('healthcare_professionals').select('id').eq('user_id', user.id).maybeSingle()

    if (!professional) {
      const result = await admin.from('healthcare_professionals').insert({ user_id: user.id, specialization: profile?.specialization || 'General Practice', is_available: true }).select('id').single()
      if (result.error) return NextResponse.json({ error: `Could not create provider profile: ${result.error.message}` }, { status: 400 })
      professional = result.data
    }

    const professionalId = String(professional.id)
    const { data: verifiedProfessional, error: verificationError } = await admin
      .from('healthcare_professionals')
      .select('id')
      .eq('id', professionalId)
      .maybeSingle()

    if (verificationError || !verifiedProfessional) {
      return NextResponse.json({ error: 'Your provider profile could not be verified. Please sign out and sign in again.' }, { status: 400 })
    }

    const { error } = await admin.from('doctor_availability').insert({ doctor_id: user.id, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, slot_duration_minutes: slotDuration, is_available: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error saving provider availability:', error)
    return NextResponse.json({ error: 'Failed to save availability.' }, { status: 500 })
  }
}
