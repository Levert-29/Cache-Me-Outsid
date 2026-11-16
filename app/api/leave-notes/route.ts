import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase server configuration is missing')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointment_id')

    const adminSupabase = getAdminClient()
    let appointmentIds: string[] | null = appointmentId ? [appointmentId] : null

    if (!appointmentIds) {
      const { data: appointments, error: appointmentsError } = await adminSupabase
        .from('appointments')
        .select('id')
        .eq('student_id', user.id)

      if (appointmentsError) {
        return NextResponse.json({ error: appointmentsError.message }, { status: 400 })
      }

      appointmentIds = (appointments ?? []).map((appointment) => appointment.id)
    }

    if (appointmentIds.length === 0) {
      return NextResponse.json({ leaveNotes: [] })
    }

    const { data: leaveNotes, error } = await adminSupabase
      .from('medical_leave_notes')
      .select('*')
      .in('appointment_id', appointmentIds)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ leaveNotes })
  } catch (error) {
    console.error('Error fetching leave notes:', error)
    return NextResponse.json({ error: 'Failed to fetch leave notes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { appointment_id, leave_start_date, leave_end_date, reason, recommendations } = body

    if (!appointment_id || !leave_start_date || !leave_end_date || !reason?.trim()) {
      return NextResponse.json({ error: 'Appointment, dates, and reason are required' }, { status: 400 })
    }

    const { data: professional, error: professionalError } = await supabase
      .from('healthcare_professionals')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (professionalError || !professional) {
      return NextResponse.json({ error: 'Healthcare professional profile not found' }, { status: 404 })
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, student_id, professional_id')
      .eq('id', appointment_id)
      .eq('professional_id', professional.id)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found or not assigned to you' }, { status: 404 })
    }

    const adminSupabase = getAdminClient()
    const { data: leaveNote, error } = await adminSupabase
      .from('medical_leave_notes')
      .insert({
        appointment_id,
        patient_id: appointment.student_id,
        doctor_id: user.id,
        leave_start_date,
        leave_end_date,
        reason: reason.trim(),
        recommendations: recommendations?.trim() || null,
      })
      .select('id, appointment_id, patient_id, doctor_id, leave_start_date, leave_end_date, reason, recommendations, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const responseLeaveNote = {
      ...leaveNote,
      reference_number: `LN-${leaveNote.id.slice(0, 10).toUpperCase()}`,
    }

    return NextResponse.json({ leaveNote: responseLeaveNote, message: 'Medical leave note created successfully' })
  } catch (error) {
    console.error('Error creating leave note:', error)
    return NextResponse.json({ error: 'Failed to create leave note' }, { status: 500 })
  }
}
