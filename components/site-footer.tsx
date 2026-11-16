'use client'

import Link from 'next/link'
import { HeartPulse, Mail, Phone, MapPin, Instagram, Facebook, Linkedin, BookOpen } from 'lucide-react'

const policyLinks = [
  { href: '/terms', label: 'Terms of Use' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/privacy', label: 'Privacy Policy' },
]

export function SiteFooter() {
  return (
    <footer className="border-t bg-card/80">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <HeartPulse className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">Campus Clinic</span>
            </div>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              Accessible, secure healthcare support for the campus community.
            </p>
            <div className="flex gap-3 text-muted-foreground" aria-label="Social media links">
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="transition-colors hover:text-primary"><Instagram className="h-4 w-4" /></a>
              <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="transition-colors hover:text-primary"><Facebook className="h-4 w-4" /></a>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="transition-colors hover:text-primary"><Linkedin className="h-4 w-4" /></a>
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Policies</h2>
            <nav className="space-y-2 text-sm text-muted-foreground" aria-label="Policy links">
              {policyLinks.map((link) => <Link key={link.href} href={link.href} className="block transition-colors hover:text-foreground">{link.label}</Link>)}
            </nav>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Help & Guides</h2>
            <nav className="space-y-2 text-sm text-muted-foreground" aria-label="Help links">
              <Link href="/guides" className="flex items-center gap-2 transition-colors hover:text-foreground"><BookOpen className="h-4 w-4" />User guides</Link>
              <Link href="/contact" className="block transition-colors hover:text-foreground">Contact support</Link>
              <Link href="/about" className="block transition-colors hover:text-foreground">About the clinic</Link>
            </nav>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Contact details</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />Campus Health Centre</p>
              <a href="mailto:clinic@campus.ac.za" className="flex items-center gap-2 hover:text-foreground"><Mail className="h-4 w-4" />clinic@campus.ac.za</a>
              <a href="tel:+27123456789" className="flex items-center gap-2 hover:text-foreground"><Phone className="h-4 w-4" />+27 12 345 6789</a>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Campus Clinic Appointment System</p>
          <p>Student Health Services</p>
        </div>
      </div>
    </footer>
  )
}

export function HomeButton() {
  return (
    <Link href="/" aria-label="Go to home page" className="fixed bottom-5 left-4 z-50 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary lg:left-72">
      <HeartPulse className="h-4 w-4" />
      <span className="hidden sm:inline">Home</span>
    </Link>
  )
}

export function BackToTopButton() {
  return (
    <button type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-5 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border bg-card text-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary">
      <span aria-hidden="true">↑</span>
    </button>
  )
}

export function SiteUtilities() {
  return <><HomeButton /><BackToTopButton /></>
}

export default SiteFooter
