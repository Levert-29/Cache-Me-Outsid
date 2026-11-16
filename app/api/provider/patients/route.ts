import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: professional, error: professionalError } = await supabase
      .from("healthcare_professionals")
      .select("id")
      .eq("user_id", user.id)
      .single()
    if (professionalError || !professional) {
      return NextResponse.json({ error: "Professional profile not found" }, { status: 404 })
    }

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, appointment_date, start_time, status, reason, notes, student_id")
      .eq("professional_id", professional.id)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const patientIds = [...new Set((appointments || []).map((appointment) => appointment.student_id).filter(Boolean))]
    const { data: profiles, error: profilesError } = patientIds.length
      ? await supabase.from("profiles").select("id, first_name, last_name, student_number, email").in("id", patientIds)
      : { data: [], error: null }
    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 400 })

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
    const patients = new Map<string, any>()
    for (const appointment of appointments || []) {
      const patient = profileById.get(appointment.student_id)
      if (!patient) continue
      const current = patients.get(patient.id) || { ...patient, visits: [] }
      current.visits.push(appointment)
      patients.set(patient.id, current)
    }

    return NextResponse.json({ patients: Array.from(patients.values()) })
  } catch (error) {
    console.error("[v0] Patient records error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load patient records" }, { status: 500 })
  }
}
