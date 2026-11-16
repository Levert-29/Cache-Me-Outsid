import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail, getAppointmentReminderEmail } from "@/lib/email"
import { format, addDays } from "date-fns"

// This API route should be called by a cron job (e.g., Vercel Cron)
// to send appointment reminders 24 hours before scheduled appointments

export async function GET(request: Request) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow without auth in development
    if (process.env.NODE_ENV === "production" && process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = await createClient()

  try {
    // Get tomorrow's date
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd")

    // Find all appointments scheduled for tomorrow that haven't been reminded yet
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(id, first_name, last_name, email),
        doctor:profiles!appointments_doctor_id_fkey(first_name, last_name)
      `)
      .eq("appointment_date", tomorrow)
      .in("status", ["pending", "confirmed"])

    if (error) {
      console.error("Error fetching appointments:", error)
      return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ message: "No appointments to remind", count: 0 })
    }

    let sentCount = 0
    const errors: string[] = []

    for (const appointment of appointments) {
      const patient = (appointment as any).patient
      const doctor = (appointment as any).doctor

      if (!patient?.email) {
        errors.push(`No email for patient in appointment ${appointment.id}`)
        continue
      }

      // Check if we already sent a reminder
      const { data: existingLog } = await supabase
        .from("email_logs")
        .select("id")
        .eq("appointment_id", appointment.id)
        .eq("email_type", "reminder")
        .single()

      if (existingLog) {
        continue // Already sent reminder
      }

      // Send reminder email
      const emailHtml = getAppointmentReminderEmail({
        patientName: `${patient.first_name} ${patient.last_name}`,
        doctorName: `${doctor.first_name} ${doctor.last_name}`,
        date: format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy"),
        time: appointment.appointment_time.slice(0, 5),
      })

      const result = await sendEmail({
        to: patient.email,
        subject: "Appointment Reminder - Campus Clinic",
        html: emailHtml,
      })

      // Log the email
      await supabase.from("email_logs").insert({
        recipient_id: patient.id,
        recipient_email: patient.email,
        email_type: "reminder",
        subject: "Appointment Reminder - Campus Clinic",
        appointment_id: appointment.id,
        status: result.success ? "sent" : "failed",
      })

      if (result.success) {
        sentCount++
      } else {
        errors.push(`Failed to send to ${patient.email}`)
      }
    }

    return NextResponse.json({
      message: "Reminder emails processed",
      sent: sentCount,
      total: appointments.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error in reminder cron:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
