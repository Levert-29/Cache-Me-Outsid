import Link from 'next/link'
import { ArrowLeft, HeartPulse } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SiteFooter from '@/components/site-footer'

type Section = { title: string; body: string }

export function PublicContentPage({ title, intro, sections }: { title: string; intro: string; sections: Section[] }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><HeartPulse className="h-5 w-5 text-primary" /></span>Campus Clinic</Link>
          <Button variant="outline" asChild><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to dashboard</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-16 lg:px-6">
        <div className="mb-10 max-w-2xl"><p className="mb-3 text-sm font-medium text-primary">Campus Clinic</p><h1 className="text-4xl font-bold tracking-tight">{title}</h1><p className="mt-4 text-lg text-muted-foreground">{intro}</p></div>
        <div className="space-y-6">{sections.map((section) => <section key={section.title} className="rounded-xl border bg-card p-6 shadow-sm"><h2 className="text-xl font-semibold">{section.title}</h2><p className="mt-3 leading-7 text-muted-foreground">{section.body}</p></section>)}</div>
      </main>
      <SiteFooter />
    </div>
  )
}

export const content = {
  terms: [{ title: 'Using the service', body: 'Campus Clinic provides a convenient way for students to request appointments, view clinic information and access documents made available by authorised healthcare staff. Use the service responsibly and keep your account details secure.' }, { title: 'Appointments and care', body: 'Submitting an appointment request does not replace urgent medical care. Attend confirmed appointments on time and contact the clinic directly if you need to cancel or require immediate assistance.' }, { title: 'Account responsibilities', body: 'Provide accurate information, use only your own account and report suspicious activity to the clinic support team.' }],
  cookies: [{ title: 'What cookies do', body: 'We use essential cookies to keep you signed in, protect forms and remember settings such as your preferred theme. These cookies are necessary for the application to work.' }, { title: 'Your choices', body: 'You can clear cookies in your browser settings. Clearing essential cookies will sign you out and may reset saved preferences.' }, { title: 'Questions', body: 'For questions about cookies or privacy, contact clinic@campus.ac.za.' }],
  privacy: [{ title: 'Information we use', body: 'We use account, appointment and profile information to provide campus clinic services, communicate about visits and keep records accurate.' }, { title: 'Keeping information safe', body: 'Access is limited according to your role and account permissions. Do not share your password, and sign out on shared devices.' }, { title: 'Your rights', body: 'You may request corrections to your profile information by contacting the clinic support team.' }],
  guides: [{ title: 'Book an appointment', body: 'Open Book Appointment from your dashboard, select a healthcare provider, choose an available date and time, describe your reason for visiting, then review and confirm your request.' }, { title: 'Manage your visit', body: 'Use Appointments to review, reschedule or cancel upcoming visits. Queue Status shows current clinic activity and your position when you are checked in.' }, { title: 'Access documents', body: 'Prescriptions and medical leave notes are available from their dashboard sections after a healthcare provider has issued them.' }],
  contact: [{ title: 'Clinic support', body: 'Email clinic@campus.ac.za or call +27 12 345 6789 for help with your account, appointments or general clinic questions.' }, { title: 'Visit us', body: 'Campus Health Centre, Student Health Services. Clinic hours are Monday to Friday, 8:00 AM to 5:00 PM.' }, { title: 'Urgent care', body: 'This service is not an emergency line. Contact your local emergency services or visit the nearest emergency department for urgent medical attention.' }],
  about: [{ title: 'Care that fits campus life', body: 'Campus Clinic Appointment System helps students access routine healthcare with less waiting and fewer administrative steps.' }, { title: 'Built for the campus community', body: 'Students can book visits, follow queues, review prescriptions and share anonymous feedback. Healthcare providers can manage consultations and supporting documents.' }, { title: 'Our commitment', body: 'We aim to make clinic services accessible, respectful, secure and easy to use.' }],
}

export function PageTitle({ title, intro, sections }: { title: string; intro: string; sections: Section[] }) { return <PublicContentPage title={title} intro={intro} sections={sections} /> }

export default PublicContentPage

// Keep a direct link to the home page available on every public information page.
