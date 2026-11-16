import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: symptoms, error } = await supabase
      .from('symptoms')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ symptoms })
  } catch (error) {
    console.error('Error fetching symptoms:', error)
    return NextResponse.json({ error: 'Failed to fetch symptoms' }, { status: 500 })
  }
}
