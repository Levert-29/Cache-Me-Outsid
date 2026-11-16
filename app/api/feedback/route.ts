import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function createServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!url || !key) throw new Error('Supabase server credentials are not configured')

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const ratingFields = ['rating', 'wait_time_rating', 'staff_rating', 'facility_rating']
    const feedbackIsValid = ratingFields.every((field) => {
      const value = body[field]
      return Number.isInteger(value) && value >= 1 && value <= 5
    }) && [body.comments, body.suggestions].every((value) => typeof value === 'string' && value.length <= 2000)

    if (!feedbackIsValid) {
      return NextResponse.json({ error: 'Feedback ratings must be whole numbers from 1 to 5 and text must be 2000 characters or fewer.' }, { status: 400 })
    }

    const { 
      appointment_id, 
      rating, 
      wait_time_rating, 
      staff_rating, 
      facility_rating, 
      comments, 
      suggestions,
      is_anonymous = true 
    } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createServiceClient()
    const { data: feedback, error } = await adminSupabase
      .from('feedback')
      .insert({
        appointment_id: appointment_id || null,
        rating,
        wait_time_rating,
        staff_rating,
        facility_rating,
        comments,
        suggestions,
        is_anonymous
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ feedback, message: 'Thank you for your feedback!' })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can view all feedback' }, { status: 403 })
    }

    const { data: feedback, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}
