"use client"

import { useEffect, useState } from "react"
import { BarChart3, Calendar, ClipboardList, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function AdminReportsPage() {
  const [stats, setStats] = useState({ users: 0, appointments: 0, feedback: 0, completed: 0 })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ count: users }, { count: appointments }, { count: feedback }, { count: completed }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("feedback").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed"),
      ])
      setStats({ users: users ?? 0, appointments: appointments ?? 0, feedback: feedback ?? 0, completed: completed ?? 0 })
    }
    load()
  }, [supabase])

  const cards = [
    ["Registered users", stats.users, Users],
    ["Appointments", stats.appointments, Calendar],
    ["Completed visits", stats.completed, ClipboardList],
    ["Feedback responses", stats.feedback, BarChart3],
  ] as const

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Reports & analytics</h1><p className="text-muted-foreground">A live overview of clinic activity.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value, Icon]) => <Card key={label}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">{label}</CardTitle><Icon className="h-4 w-4 text-primary" /></CardHeader><CardContent><p className="text-3xl font-bold">{value}</p><p className="text-xs text-muted-foreground">Current total</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Operational summary</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2"><p>Completion rate: <strong className="text-foreground">{stats.appointments ? Math.round(stats.completed / stats.appointments * 100) : 0}%</strong></p><p>Average feedback can be reviewed from the Feedback section.</p></CardContent></Card></div>
}
