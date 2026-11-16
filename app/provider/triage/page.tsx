"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Activity, HeartPulse, Save, Thermometer, Weight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Appointment = {
  id: string
  status: string
  patient?: { first_name?: string; last_name?: string; student_number?: string }
}

type Vitals = { blood_pressure: string; temperature: string; pulse: string; weight: string }

const emptyVitals: Vitals = { blood_pressure: "", temperature: "", pulse: "", weight: "" }

export default function ProviderTriagePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [vitals, setVitals] = useState<Record<string, Vitals>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function loadAppointments() {
    setLoading(true)
    try {
      const response = await fetch("/api/appointments?role=provider", { cache: "no-store" })
      const result = await response.json()
      setAppointments(response.ok ? result.appointments || [] : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAppointments() }, [])

  async function saveVitals(appointmentId: string) {
    const values = vitals[appointmentId] || emptyVitals
    if (!Object.values(values).some(Boolean)) {
      setMessage("Enter at least one vital sign before saving.")
      return
    }
    setSavingId(appointmentId)
    setMessage(null)
    const response = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: appointmentId, action: "provider_triage", ...values }),
    })
    const result = await response.json().catch(() => null)
    setMessage(response.ok ? "Triage vitals saved." : result?.error || "Could not save vitals.")
    setSavingId(null)
  }

  const activeAppointments = appointments.filter((appointment) => ["scheduled", "confirmed", "in_progress"].includes(appointment.status))

  return (
    <main className="space-y-6">
      <div><h1 className="text-2xl font-bold">Triage &amp; Vitals</h1><p className="text-muted-foreground">Record observations before the consultation begins.</p></div>
      {message && <p role="status" className="rounded-md border bg-muted/40 px-4 py-3 text-sm">{message}</p>}
      {loading ? <Card><CardContent className="py-12 text-center text-muted-foreground">Loading patients...</CardContent></Card> : activeAppointments.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">No patients are awaiting triage.</CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">{activeAppointments.map((appointment) => { const patient = appointment.patient; const values = vitals[appointment.id] || emptyVitals; return <Card key={appointment.id}><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="text-base">{patient?.first_name} {patient?.last_name}</CardTitle><p className="text-sm text-muted-foreground">Student number: {patient?.student_number || "Not provided"}</p></div><Badge variant="outline">{appointment.status.replace("_", " ")}</Badge></div></CardHeader><CardContent className="grid grid-cols-2 gap-4"><VitalField id="bp" label="Blood pressure" icon={<Activity className="mr-1 inline h-4 w-4" />} placeholder="120/80" value={values.blood_pressure} onChange={(value) => setVitals((current) => ({ ...current, [appointment.id]: { ...values, blood_pressure: value } }))} /><VitalField id="temp" label="Temperature" icon={<Thermometer className="mr-1 inline h-4 w-4" />} placeholder="36.5 °C" value={values.temperature} onChange={(value) => setVitals((current) => ({ ...current, [appointment.id]: { ...values, temperature: value } }))} /><VitalField id="pulse" label="Pulse" icon={<HeartPulse className="mr-1 inline h-4 w-4" />} placeholder="72 bpm" value={values.pulse} onChange={(value) => setVitals((current) => ({ ...current, [appointment.id]: { ...values, pulse: value } }))} /><VitalField id="weight" label="Weight" icon={<Weight className="mr-1 inline h-4 w-4" />} placeholder="kg" value={values.weight} onChange={(value) => setVitals((current) => ({ ...current, [appointment.id]: { ...values, weight: value } }))} /><Button className="col-span-2" onClick={() => saveVitals(appointment.id)} disabled={savingId === appointment.id}><Save className="mr-2 h-4 w-4" />{savingId === appointment.id ? "Saving..." : "Save vitals"}</Button></CardContent></Card> })}</div>}
    </main>
  )
}

function VitalField({ id, label, icon, placeholder, value, onChange }: { id: string; label: string; icon: ReactNode; placeholder: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label htmlFor={`${id}-${label}`}>{icon}{label}</Label><Input id={`${id}-${label}`} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}
