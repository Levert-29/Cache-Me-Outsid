"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, Check, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProviderAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function loadAppointments() {
    setLoading(true)
    const response = await fetch("/api/appointments?role=provider", { cache: "no-store" })
    const result = await response.json()
    setAppointments(response.ok ? result.appointments || [] : [])
    setLoading(false)
  }

  useEffect(() => { loadAppointments() }, [])

  const filtered = useMemo(() => appointments.filter((appointment) => {
    const patient = appointment.patient
    const name = `${patient?.first_name || ""} ${patient?.last_name || ""} ${patient?.student_number || ""}`.toLowerCase()
    return name.includes(search.toLowerCase()) && (status === "all" || appointment.status === status)
  }), [appointments, search, status])

  async function updateStatus(id: string, nextStatus: string) {
    setUpdatingId(id)
    const response = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: id, action: "provider_status", status: nextStatus }),
    })
    if (response.ok) {
      setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, status: nextStatus } : appointment))
    } else {
      const result = await response.json().catch(() => null)
      window.alert(result?.error || "Could not update appointment")
    }
    setUpdatingId(null)
  }

  const badgeVariant = (value: string) => value === "cancelled" ? "destructive" as const : value === "completed" ? "secondary" as const : "outline" as const

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Appointment management</h1><p className="text-muted-foreground">Confirm, start, complete, or cancel patient appointments.</p></div>
      <Card>
        <CardHeader><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>All appointments</CardTitle><CardDescription>{filtered.length} appointment{filtered.length === 1 ? "" : "s"} found</CardDescription></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search patient" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div></div></CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="py-8 text-center text-muted-foreground">Loading appointments...</p> : filtered.length === 0 ? <p className="py-8 text-center text-muted-foreground">No appointments found.</p> : filtered.map((appointment) => {
            const patient = appointment.patient
            const currentStatus = appointment.status
            const canAct = !["cancelled", "completed"].includes(currentStatus)
            return <div key={appointment.id} className="flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><CalendarClock className="mt-1 h-5 w-5 text-primary" /><div><p className="font-medium">{patient?.first_name} {patient?.last_name}</p><p className="text-sm text-muted-foreground">{appointment.appointment_date} at {(appointment.start_time || appointment.appointment_time || "").slice(0, 5) || "Time not set"} · {appointment.reason || "Consultation"}</p><p className="text-xs text-muted-foreground">Student number: {patient?.student_number || "Not provided"}</p><p className="text-xs text-primary">Verification code: {appointment.verification_code || "Not available"}</p></div></div><div className="flex flex-wrap items-center gap-2"><Badge variant={badgeVariant(currentStatus)}>{currentStatus}</Badge>{canAct && <>{currentStatus === "scheduled" && <Button size="sm" onClick={() => updateStatus(appointment.id, "confirmed")} disabled={updatingId === appointment.id}><Check className="mr-1 h-4 w-4" />Check in</Button>}{currentStatus === "confirmed" && <Button size="sm" onClick={() => updateStatus(appointment.id, "in_progress")} disabled={updatingId === appointment.id}>Start</Button>}{currentStatus === "in_progress" && <Button size="sm" onClick={() => updateStatus(appointment.id, "completed")} disabled={updatingId === appointment.id}>Complete</Button>}<Button size="sm" variant="destructive" onClick={() => updateStatus(appointment.id, "cancelled")} disabled={updatingId === appointment.id}><X className="mr-1 h-4 w-4" />Cancel</Button></>}</div></div>
          })}
        </CardContent>
      </Card>
    </div>
  )
}
