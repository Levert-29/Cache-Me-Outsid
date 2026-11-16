"use client"

import { useState } from "react"
import { Clock, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
export default function ClinicHoursPage() {
  const [saved, setSaved] = useState(false)
  const [hours, setHours] = useState(Object.fromEntries(days.map((day) => [day, { open: "08:00", close: "17:00", closed: day === "Sunday" }])))
  return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-2xl font-bold">Clinic hours</h1><p className="text-muted-foreground">Set the operating hours shown to students and providers.</p></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Weekly schedule</CardTitle></CardHeader><CardContent className="space-y-3">{days.map((day) => <div key={day} className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_120px_120px_auto]"><span className="font-medium">{day}</span><Input type="time" disabled={hours[day].closed} value={hours[day].open} onChange={(e) => setHours({ ...hours, [day]: { ...hours[day], open: e.target.value } })} /><Input type="time" disabled={hours[day].closed} value={hours[day].close} onChange={(e) => setHours({ ...hours, [day]: { ...hours[day], close: e.target.value } })} /><Button variant={hours[day].closed ? "default" : "outline"} size="sm" onClick={() => setHours({ ...hours, [day]: { ...hours[day], closed: !hours[day].closed } })}>{hours[day].closed ? "Closed" : "Open"}</Button></div>)}<Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }}><Save className="mr-2 h-4 w-4" />{saved ? "Saved" : "Save hours"}</Button></CardContent></Card></div>
}
