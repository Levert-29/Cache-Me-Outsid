import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('appointment_id')
    const providerView = searchParams.get('provider') === 'true'

    if (appointmentId) {
      // Get queue position for specific appointment
      const { data: queueEntry, error } = await supabase
        .from('queue')
        .select(`
          *,
          appointment:appointments(
            id,
            appointment_date,
            start_time,
            student_id,
            professional_id
          )
        `)
        .eq('appointment_id', appointmentId)
        .eq('is_active', true)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ queueEntry })
    }

    if (providerView) {
      const { data: professional } = await supabase.from('healthcare_professionals').select('id').eq('user_id', user.id).single()
      if (!professional) return NextResponse.json({ queueEntries: [] })
      const { data: queueEntries, error } = await supabase
        .from('queue')
        .select('*, appointment:appointments!inner(id, appointment_date, start_time, status, reason, professional_id, student_id)')
        .eq('is_active', true)
        .neq('appointment.status', 'cancelled')
        .eq('appointment.professional_id', professional.id)
        .order('position', { ascending: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      const activeQueueEntries = (queueEntries || []).filter((entry: any) =>
        entry.appointment?.status && !['cancelled', 'completed', 'no_show'].includes(entry.appointment.status)
      )
      const studentIds = [...new Set(activeQueueEntries.map((entry: any) => entry.appointment?.student_id).filter(Boolean))]
      const { data: students } = studentIds.length
        ? await supabase.from('profiles').select('id, first_name, last_name, student_number').in('id', studentIds)
        : { data: [] }
      const studentById = new Map((students || []).map((student) => [student.id, student]))
      return NextResponse.json({ queueEntries: activeQueueEntries.map((entry: any) => ({
        ...entry,
        appointment: { ...entry.appointment, patient: studentById.get(entry.appointment.student_id) || null },
      })) })
    }

    // Get all active queue entries for the student
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('student_id', user.id)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ queueEntries: [] })
    }

    const appointmentIds = appointments.map(a => a.id)

    const { data: queueEntries, error } = await supabase
      .from('queue')
      .select(`
        *,
          appointment:appointments(
            id,
            appointment_date,
            start_time,
            student_id,
            professional_id
          )
      `)
      .in('appointment_id', appointmentIds)
      .eq('is_active', true)
      .neq('appointment.status', 'cancelled')
      .order('position', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const professionalIds = [...new Set((queueEntries || []).map((entry: any) => entry.appointment?.professional_id).filter(Boolean))]
    const { data: professionals } = professionalIds.length
      ? await supabase.from('healthcare_professionals').select('id, user_id').in('id', professionalIds)
      : { data: [] }
    const userIds = (professionals || []).map((professional) => professional.user_id)
    const { data: doctors } = userIds.length
      ? await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
      : { data: [] }
    const doctorByProfessional = new Map((professionals || []).map((professional) => [professional.id, doctors?.find((doctor) => doctor.id === professional.user_id) || null]))
    const enrichedQueueEntries = (queueEntries || []).map((entry: any) => ({
      ...entry,
      appointment: entry.appointment ? { ...entry.appointment, doctor: doctorByProfessional.get(entry.appointment.professional_id) || null } : null,
    }))

    return NextResponse.json({ queueEntries: enrichedQueueEntries })
  } catch (error) {
    console.error('Error fetching queue:', error)
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a provider
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['doctor', 'nurse', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only providers can manage the queue' }, { status: 403 })
    }

    const body = await request.json()
    const { appointment_id, action } = body

    if (action === 'check_in') {
      // Get current max position
      const { data: maxPosition } = await supabase
        .from('queue')
        .select('position')
        .eq('is_active', true)
        .order('position', { ascending: false })
        .limit(1)
        .single()

      const newPosition = (maxPosition?.position || 0) + 1

      const { data: queueEntry, error } = await supabase
        .from('queue')
        .insert({
          appointment_id,
          position: newPosition,
          estimated_wait_minutes: newPosition * 15
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      // Update appointment status to confirmed
      await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointment_id)

      return NextResponse.json({ queueEntry, message: 'Patient checked in' })
    }

    if (action === 'call_next') {
      // Get the next patient in queue
      const { data: nextPatient, error: fetchError } = await supabase
        .from('queue')
        .select('*')
        .eq('is_active', true)
        .is('called_at', null)
        .order('position', { ascending: true })
        .limit(1)
        .single()

      if (fetchError || !nextPatient) {
        return NextResponse.json({ error: 'No patients in queue' }, { status: 400 })
      }

      // Mark patient as called
      const { data: updatedEntry, error } = await supabase
        .from('queue')
        .update({ called_at: new Date().toISOString() })
        .eq('id', nextPatient.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      // Update appointment status to in_progress
      await supabase
        .from('appointments')
        .update({ status: 'in_progress', actual_start_time: new Date().toISOString() })
        .eq('id', nextPatient.appointment_id)

      return NextResponse.json({ queueEntry: updatedEntry, message: 'Patient called' })
    }

    if (action === 'complete') {
      const { data: queueEntry, error } = await supabase
        .from('queue')
        .update({ is_active: false })
        .eq('appointment_id', appointment_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ queueEntry, message: 'Patient completed' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error managing queue:', error)
    return NextResponse.json({ error: 'Failed to manage queue' }, { status: 500 })
  }
}
