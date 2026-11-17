import { describe, expect, it } from 'vitest'
import {
  escapeHtml,
  getAppointmentCancellationEmail,
  getAppointmentConfirmationEmail,
  getAppointmentReminderEmail,
} from '@/lib/email'

const emailTemplates = [
  ['confirmation', getAppointmentConfirmationEmail],
  ['reminder', getAppointmentReminderEmail],
  ['cancellation', getAppointmentCancellationEmail],
] as const

describe('escapeHtml', () => {
  it('escapes HTML metacharacters in dynamic content', () => {
    expect(escapeHtml(`<tag attr="value">O'Neil & Co.</tag>`)).toBe(
      '&lt;tag attr=&quot;value&quot;&gt;O&#39;Neil &amp; Co.&lt;/tag&gt;',
    )
  })
})

describe.each(emailTemplates)('%s email template', (_name, createEmail) => {
  it('escapes every user-provided field before inserting it into HTML', () => {
    const html = createEmail({
      patientName: '<img src=x onerror=alert(1)>',
      doctorName: 'Dr. A & B',
      date: 'Today <script>',
      time: '09:00 "AM"',
    })

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('Dr. A &amp; B')
    expect(html).toContain('Today &lt;script&gt;')
    expect(html).toContain('09:00 &quot;AM&quot;')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script>')
  })
})
