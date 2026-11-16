import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function createServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase server configuration is missing')
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
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
    const adminSupabase = createServiceClient()

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
      return NextResponse.json({ prescriptions: [] })
    }

    const { data: prescriptions, error } = await adminSupabase
      .from('prescriptions')
      .select('*')
      .in('appointment_id', appointmentIds)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ prescriptions: prescriptions ?? [] })
  } catch (error) {
    console.error('Error fetching prescriptions:', error)
    return NextResponse.json({ error: 'Failed to fetch prescriptions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a doctor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const allowedRoles = new Set(['doctor', 'healthcare_professional', 'admin'])
    if (!profile?.role || !allowedRoles.has(profile.role)) {
      return NextResponse.json({ error: 'Only healthcare providers can create prescriptions' }, { status: 403 })
    }

    const body = await request.json()
    const { appointment_id, diagnosis, medications, instructions } = body

    const { data: professional } = await supabase
      .from('healthcare_professionals')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!professional) return NextResponse.json({ error: 'Provider profile not found' }, { status: 403 })

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, student_id')
      .eq('id', appointment_id)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Keep the payload aligned with the columns exposed by the connected
    // Supabase schema. Patient and provider ownership are derived from the
    // appointment and authenticated user rather than sent as unknown columns.
    const prescriptionRow = {
      appointment_id,
      diagnosis,
      medications,
      instructions,
    }

    // The provider has already been authorized above. Use the server-only
    // service client for this write because the existing table policy is
    // patient-scoped and cannot authorize a provider insert.
    const adminSupabase = createServiceClient()
    const { data: prescription, error } = await adminSupabase
      .from('prescriptions')
      .insert(prescriptionRow)
      .select('id, appointment_id, diagnosis, medications, instructions')
      .single()

    if (error) {
      console.error('Error inserting prescription:', error)
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }

    // Update appointment status to completed
    await supabase
      .from('appointments')
      .update({ status: 'completed', actual_end_time: new Date().toISOString() })
      .eq('id', appointment_id)

    return NextResponse.json({ prescription, message: 'Prescription created successfully' })
  } catch (error) {
    console.error('Error creating prescription:', error)
    return NextResponse.json({ error: 'Failed to create prescription' }, { status: 500 })
  }
}
