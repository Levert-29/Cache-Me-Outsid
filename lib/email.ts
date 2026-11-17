import { Resend } from "resend"

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character])
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  return apiKey ? new Resend(apiKey) : null
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: false, error: new Error('Email service is not configured') }
    }

    const { data, error } = await resend.emails.send({
      from: "Campus Clinic <noreply@resend.dev>",
      to,
      subject,
      html,
    })

    if (error) {
      console.error("Failed to send email:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Email service error:", error)
    return { success: false, error }
  }
}

export function getAppointmentConfirmationEmail(params: {
  patientName: string
  doctorName: string
  date: string
  time: string
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Confirmed</h1>
        </div>
        <div class="content">
          <p>Dear ${escapeHtml(params.patientName)},</p>
          <p>Your appointment at Campus Clinic has been confirmed.</p>
          
          <div class="details">
            <p><strong>Doctor:</strong> Dr. ${escapeHtml(params.doctorName)}</p>
            <p><strong>Date:</strong> ${escapeHtml(params.date)}</p>
            <p><strong>Time:</strong> ${escapeHtml(params.time)}</p>
          </div>
          
          <p><strong>Important Reminders:</strong></p>
          <ul>
            <li>Please arrive 10 minutes before your scheduled time</li>
            <li>Bring your student ID card</li>
            <li>If you need to cancel or reschedule, please do so at least 24 hours in advance</li>
          </ul>
          
          <p>You can manage your appointment through the Campus Clinic Appointment System.</p>
        </div>
        <div class="footer">
          <p>Campus Clinic Appointment System</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export function getAppointmentReminderEmail(params: {
  patientName: string
  doctorName: string
  date: string
  time: string
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Reminder</h1>
        </div>
        <div class="content">
          <p>Dear ${escapeHtml(params.patientName)},</p>
          <p>This is a friendly reminder about your upcoming appointment at Campus Clinic.</p>
          
          <div class="details">
            <p><strong>Doctor:</strong> Dr. ${escapeHtml(params.doctorName)}</p>
            <p><strong>Date:</strong> ${escapeHtml(params.date)}</p>
            <p><strong>Time:</strong> ${escapeHtml(params.time)}</p>
          </div>
          
          <p><strong>Please remember to:</strong></p>
          <ul>
            <li>Arrive 10 minutes early</li>
            <li>Bring your student ID</li>
            <li>List any medications you are currently taking</li>
          </ul>
          
          <p>If you cannot make this appointment, please reschedule or cancel as soon as possible.</p>
        </div>
        <div class="footer">
          <p>Campus Clinic Appointment System</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export function getAppointmentCancellationEmail(params: {
  patientName: string
  doctorName: string
  date: string
  time: string
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Cancelled</h1>
        </div>
        <div class="content">
          <p>Dear ${escapeHtml(params.patientName)},</p>
          <p>Your appointment at Campus Clinic has been cancelled.</p>
          
          <div class="details">
            <p><strong>Doctor:</strong> Dr. ${escapeHtml(params.doctorName)}</p>
            <p><strong>Date:</strong> ${escapeHtml(params.date)}</p>
            <p><strong>Time:</strong> ${escapeHtml(params.time)}</p>
          </div>
          
          <p>If you still need medical attention, please book a new appointment through the Campus Clinic Appointment System.</p>
        </div>
        <div class="footer">
          <p>Campus Clinic Appointment System</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
