import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { doctor_id, appointment_date, appointment_time, reason, notes, symptoms } = body

    const { data: studentProfile, error: studentProfileError } = await supabase
      .from('profiles')
      .select('student_number')
      .eq('id', user.id)
      .single()

  if (studentProfileError && studentProfileError.code !== 'PGRST116') {
    return NextResponse.json({ error: `Could not load student profile: ${studentProfileError.message}` }, { status: 400 })
  }

  // Older accounts may have the number in auth metadata but not in profiles yet.
  // Copy it into the profile when the student books or rebooks an appointment.
  const metadataStudentNumber = typeof user.user_metadata?.student_number === 'string'
    ? user.user_metadata.student_number.trim()
    : ''
  if (!studentProfile?.student_number && metadataStudentNumber) {
    await supabase
      .from('profiles')
      .update({ student_number: metadataStudentNumber })
      .eq('id', user.id)
  }
  
  if (!doctor_id || !appointment_date || !appointment_time) {
      return NextResponse.json({ error: 'Doctor, date, and time are required' }, { status: 400 })
    }

    const { data: professional, error: professionalError } = await supabase
      .from('healthcare_professionals')
      .select('id, user_id')
      .eq('user_id', doctor_id)
      .maybeSingle()

    if (professionalError) {
      return NextResponse.json({ error: `Could not find the selected healthcare professional: ${professionalError.message}` }, { status: 400 })
    }

    if (!professional) {
      return NextResponse.json({ error: 'The selected doctor is not linked to a healthcare professional profile' }, { status: 400 })
    }

    const requestedTime = String(appointment_time).slice(0, 5)
    const [hours, minutes] = requestedTime.split(':').map(Number)
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return NextResponse.json({ error: 'A valid appointment time is required.' }, { status: 400 })
    }

    const endTotalMinutes = hours * 60 + minutes + 30
    const endHours = Math.floor((endTotalMinutes % (24 * 60)) / 60)
    const endMinutes = endTotalMinutes % 60

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        student_id: user.id,
        professional_id: professional.id,
        appointment_date,
        start_time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`,
        end_time: `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`,
        reason: reason || 'General consultation',
        notes: notes || null,
        status: 'scheduled',
        verification_code: `APT-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
      })
      .select()
      .single()

    if (appointmentError) {
      return NextResponse.json({ error: appointmentError.message }, { status: 400 })
    }

    // Get patient and doctor details for email
    const { data: patient } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single()

    const { data: doctor } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', doctor_id)
      .single()

    return NextResponse.json({ appointment, message: 'Appointment booked successfully' })
  } catch (error) {
    console.error('Error booking appointment:', error)
    const message = error instanceof Error ? error.message : 'Failed to book appointment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    if (searchParams.get('role') === 'provider') {
      const { data: professional, error: professionalError } = await supabase
        .from('healthcare_professionals')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (professionalError || !professional) {
        return NextResponse.json({ error: professionalError?.message || 'Professional profile not found' }, { status: 404 })
      }

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('professional_id', professional.id)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (appointmentsError) return NextResponse.json({ error: appointmentsError.message }, { status: 400 })

      const studentIds = [...new Set((appointments || []).map((appointment) => appointment.student_id))]
      const { data: profiles } = studentIds.length
        ? await supabase.from('profiles').select('id, first_name, last_name, student_number, email').in('id', studentIds)
        : { data: [] }
      const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]))
      return NextResponse.json({ appointments: (appointments || []).map((appointment) => ({ ...appointment, patient: profilesById.get(appointment.student_id) || null })) })
    }

    let query = supabase
      .from('appointments')
      .select('*')
      .eq('student_id', user.id)
      .order('appointment_date', { ascending: true })

    if (status) query = query.eq('status', status)
    if (date) query = query.eq('appointment_date', date)

    const { data: appointments, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const professionalIds = [...new Set((appointments || []).map((appointment) => appointment.professional_id))]
    const { data: professionals } = professionalIds.length
      ? await supabase.from('healthcare_professionals').select('id, user_id, specialization').in('id', professionalIds)
      : { data: [] }
    const userIds = (professionals || []).map((professional) => professional.user_id)
    const { data: doctors } = userIds.length
      ? await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
      : { data: [] }
    const doctorByProfessional = new Map((professionals || []).map((professional) => {
      const doctor = doctors?.find((profile) => profile.id === professional.user_id)
      return [professional.id, doctor ? { ...doctor, specialization: professional.specialization } : null]
    }))

    return NextResponse.json({ appointments: (appointments || []).map((appointment) => ({ ...appointment, doctor: doctorByProfessional.get(appointment.professional_id) || null })) })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { appointment_id, action, new_date, new_time } = body
    if (!appointment_id || !['cancel', 'reschedule', 'provider_status', 'provider_triage'].includes(action)) {
      return NextResponse.json({ error: 'Invalid appointment update request' }, { status: 400 })
    }

    if (action === 'provider_triage') {
      const { data: professional } = await supabase.from('healthcare_professionals').select('id').eq('user_id', user.id).single()
      if (!professional) return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
      const { data: current, error: currentError } = await supabase
        .from('appointments')
        .select('id, notes')
        .eq('id', appointment_id)
        .eq('professional_id', professional.id)
        .single()
      if (currentError || !current) return NextResponse.json({ error: currentError?.message || 'Appointment not found' }, { status: 404 })
      const triage = {
        blood_pressure: String(body.blood_pressure || '').trim(),
        temperature: String(body.temperature || '').trim(),
        pulse: String(body.pulse || '').trim(),
        weight: String(body.weight || '').trim(),
        recorded_at: new Date().toISOString(),
        recorded_by: user.id,
      }
      if (!triage.blood_pressure && !triage.temperature && !triage.pulse && !triage.weight) {
        return NextResponse.json({ error: 'Enter at least one vital sign.' }, { status: 400 })
      }
      const nextNotes = `${current.notes || ''}${current.notes ? '\\n\\n' : ''}Triage vitals: ${JSON.stringify(triage)}`
      const { data: appointment, error } = await supabase
        .from('appointments')
        .update({ notes: nextNotes, updated_at: new Date().toISOString() })
        .eq('id', appointment_id)
        .eq('professional_id', professional.id)
        .select('id, notes, status')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ appointment, message: 'Triage vitals saved' })
    }

    if (action === 'provider_status') {
      if (!['scheduled', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid appointment status' }, { status: 400 })
      }
      const { data: professional } = await supabase.from('healthcare_professionals').select('id').eq('user_id', user.id).single()
      if (!professional) return NextResponse.json({ error: 'Professional profile not found' }, { status: 404 })
      const { data: appointment, error } = await supabase
        .from('appointments')
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq('id', appointment_id)
        .eq('professional_id', professional.id)
        .select('id, student_id, professional_id, status')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })

      if (body.status === 'confirmed') {
        const { data: existing } = await supabase.from('queue').select('id').eq('appointment_id', appointment_id).eq('is_active', true).maybeSingle()
        if (!existing) {
          const { data: last } = await supabase.from('queue').select('position').eq('is_active', true).order('position', { ascending: false }).limit(1).maybeSingle()
          const position = (last?.position || 0) + 1
          const { error: queueError } = await supabase.from('queue').insert({ appointment_id, position, estimated_wait_minutes: position * 15, is_active: true })
          if (queueError) return NextResponse.json({ error: queueError.message }, { status: 400 })
        }
      } else if (body.status === 'in_progress') {
        await supabase.from('queue').update({ called_at: new Date().toISOString() }).eq('appointment_id', appointment_id).eq('is_active', true)
      } else if (body.status === 'completed' || body.status === 'cancelled') {
        await supabase.from('queue').update({ is_active: false }).eq('appointment_id', appointment_id)
      }

      return NextResponse.json({ appointment, message: 'Appointment status updated' })
    }

    if (action === 'cancel') {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', appointment_id)
        .eq('student_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      await supabase.from('queue').update({ is_active: false }).eq('appointment_id', appointment_id)
      return NextResponse.json({ appointment: data, message: 'Appointment cancelled' })
    }

    if (action === 'reschedule') {
      const { data: current } = await supabase.from('appointments').select('professional_id').eq('id', appointment_id).eq('student_id', user.id).single()
      if (!current) return NextResponse.json({ error: 'Appointment not found or not owned by this student' }, { status: 404 })
      if (!new_date || !new_time) return NextResponse.json({ error: 'A new date and time are required' }, { status: 400 })
      const { data, error } = await supabase
        .from('appointments')
        .update({
          appointment_date: new_date,
          start_time: `${new_time}:00`,
          end_time: `${new_time}:00`,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment_id)
        .eq('student_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ appointment: data, message: 'Appointment rescheduled' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[v0] Error updating appointment:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message || 'Failed to update appointment' }, { status: 500 })
  }
}
