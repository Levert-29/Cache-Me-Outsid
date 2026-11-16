"use client"

import { useEffect, useState } from "react"
import { Search, UserRound, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function ProviderPatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/provider/patients", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Failed to load patient records")
        if (active) setPatients(result.patients || [])
      })
      .catch((error) => console.error("[v0] Patient records load error:", error))
    return () => { active = false }
  }, [])
  const filtered = patients.filter((patient) => `${patient.first_name} ${patient.last_name} ${patient.student_number || ""}`.toLowerCase().includes(query.toLowerCase()))
  const completedPatients = filtered.filter((patient) => patient.visits.some((visit: any) => visit.status === "completed"))
  const upcomingPatients = filtered.filter((patient) => patient.visits.some((visit: any) => ["scheduled", "confirmed", "in_progress"].includes(visit.status)))
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Patient records</h1><p className="text-muted-foreground">Completed visits appear as records. Upcoming appointments are listed separately.</p></div>{upcomingPatients.length > 0 && <Card><CardHeader><CardTitle className="text-base">Upcoming appointments</CardTitle><p className="text-sm text-muted-foreground">These patients will move into records after their visit is completed.</p></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{upcomingPatients.flatMap((patient) => patient.visits.filter((visit: any) => ["scheduled", "confirmed", "in_progress"].includes(visit.status)).map((visit: any) => <div key={visit.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="font-medium">{patient.first_name} {patient.last_name}</span><Badge variant="outline">{visit.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{visit.appointment_date} · {((visit.start_time || "").slice(0, 5) || "Time not set")}</p></div>))}</CardContent></Card>}<div className="grid gap-6 lg:grid-cols-[280px_1fr]"><Card><CardHeader><CardTitle className="text-base">Patients with completed records</CardTitle><p className="text-xs text-muted-foreground">{completedPatients.length} patient{completedPatients.length === 1 ? "" : "s"}</p><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search patients" value={query} onChange={(e) => setQuery(e.target.value)} /></div></CardHeader><CardContent className="space-y-2">{completedPatients.map((patient) => <button key={patient.id} onClick={() => setSelected(patient)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"><UserRound className="h-8 w-8 rounded-full bg-primary/10 p-2 text-primary" /><span><span className="block font-medium">{patient.first_name} {patient.last_name}</span><span className="text-xs text-muted-foreground">{patient.student_number || patient.email}</span></span></button>)}{!filtered.length && <p className="text-sm text-muted-foreground">No patients found.</p>}</CardContent></Card><Card><CardHeader><CardTitle>{selected ? `${selected.first_name} ${selected.last_name}` : "Select a patient"}</CardTitle></CardHeader><CardContent>{selected ? <div className="space-y-3">{selected.visits.map((visit: any, index: number) => <div key={`${visit.appointment_date}-${index}`} className="rounded-lg border p-4"><div className="flex items-center justify-between"><span className="font-medium">{visit.appointment_date}</span><Badge variant="outline">{visit.status}</Badge></div><p className="mt-2 text-sm">{visit.reason || "Routine consultation"}</p>{visit.notes && <p className="mt-2 flex gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" />{visit.notes}</p>}</div>)}</div> : <p className="text-sm text-muted-foreground">Choose a patient to view their visit history.</p>}</CardContent></Card></div></div>
}
