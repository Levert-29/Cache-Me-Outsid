import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: professionals, error: professionalsError } = await supabase
      .from('healthcare_professionals')
      .select('id, user_id, specialization, is_available')
      .eq('is_available', true)
      .not('user_id', 'is', null)

    if (professionalsError) return NextResponse.json({ error: professionalsError.message }, { status: 400 })

    const userIds = (professionals || []).map((professional) => professional.user_id)
    const { data: profiles, error: profilesError } = userIds.length
      ? await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
      : { data: [], error: null }
    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 400 })

    const { data: availability } = userIds.length
      ? await supabase.from('doctor_availability').select('doctor_id, day_of_week, start_time').in('doctor_id', userIds).eq('is_available', true)
      : { data: [] }
    const now = new Date()
    const nextForDoctor = (doctorId: string) => {
      const rows = (availability || []).filter((slot) => slot.doctor_id === doctorId)
      const candidates = rows.map((slot) => {
        const dayOffset = (slot.day_of_week - now.getDay() + 7) % 7
        const date = new Date(now)
        date.setDate(now.getDate() + dayOffset)
        const [hours, minutes] = slot.start_time.slice(0, 5).split(':').map(Number)
        date.setHours(hours, minutes, 0, 0)
        if (date <= now) date.setDate(date.getDate() + 7)
        return date
      })
      return candidates.sort((a, b) => a.getTime() - b.getTime())[0]?.toISOString() || null
    }
    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
    const doctors = (professionals || []).map((professional) => ({
      ...(profileById.get(professional.user_id) || {}),
      id: professional.user_id,
      professional_id: professional.id,
      specialization: professional.specialization,
      nextAvailableAt: nextForDoctor(professional.user_id),
    })).sort((a, b) => {
      if (!a.nextAvailableAt) return 1
      if (!b.nextAvailableAt) return -1
      return new Date(a.nextAvailableAt).getTime() - new Date(b.nextAvailableAt).getTime()
    })

    return NextResponse.json({ doctors })
  } catch (error) {
    console.error('Error fetching doctors:', error)
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 })
  }
}
