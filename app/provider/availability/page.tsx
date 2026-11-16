"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { CalendarDays, Clock, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { TimeSlot } from "@/lib/types"

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function ProviderAvailabilityPage() {
  const supabase = createClient()
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [day, setDay] = useState("1")
  const [start, setStart] = useState("08:00")
  const [end, setEnd] = useState("16:00")
  const [duration, setDuration] = useState("30")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  async function loadSlots() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: professional } = await supabase
      .from("healthcare_professionals")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!professional) {
      setSlots([])
      setLoading(false)
      return
    }
    const { data } = await supabase.from("doctor_availability").select("*").eq("doctor_id", user.id).order("day_of_week").order("start_time")
    setSlots((data || []) as TimeSlot[])
    setLoading(false)
  }

  useEffect(() => { loadSlots() }, [])

  const grouped = useMemo(() => days.map((name, index) => ({ name, index, slots: slots.filter((slot) => slot.day_of_week === index) })), [slots])

  async function addSlot() {
    setSaving(true); setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
  const response = await fetch('/api/provider/availability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day_of_week: Number(day), start_time: start, end_time: end, slot_duration_minutes: Number(duration) }),
  })
  const result = await response.json()
  const error = response.ok ? null : new Error(result.error || 'Failed to save availability')
  setMessage(error ? error.message : "Availability added.")
    if (!error) await loadSlots()
    setSaving(false)
  }

  async function removeSlot(id: string) {
    await supabase.from("doctor_availability").delete().eq("id", id)
    setSlots((current) => current.filter((slot) => slot.id !== id))
  }

  async function toggleSlot(slot: TimeSlot) {
    const { error } = await supabase.from("doctor_availability").update({ is_available: !slot.is_available }).eq("id", slot.id)
    if (!error) setSlots((current) => current.map((item) => item.id === slot.id ? { ...item, is_available: !slot.is_available } : item))
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Availability calendar</h1><p className="text-muted-foreground">Set the hours patients can book with you.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Add weekly hours</CardTitle><CardDescription>These hours repeat each week until you change them.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-2"><Label>Day</Label><Select value={day} onValueChange={setDay}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{days.map((name, index) => <SelectItem key={name} value={String(index)}>{name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Starts</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
      <div className="space-y-2"><Label>Ends</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      <div className="space-y-2"><Label>Slot length</Label><Input type="number" min="10" max="120" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
      <div className="flex items-end"><Button className="w-full" onClick={addSlot} disabled={saving}>{saving ? "Saving..." : "Add hours"}</Button></div>
      {message && <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-5">{message}</p>}
    </CardContent></Card>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{grouped.map(({ name, index, slots: daySlots }) => <Card key={name}><CardHeader className="pb-3"><CardTitle className="text-base">{name}</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <p className="text-sm text-muted-foreground">Loading...</p> : daySlots.length ? daySlots.map((slot) => <div key={slot.id} className="flex items-center justify-between rounded-lg border p-3"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span className={slot.is_available ? "" : "text-muted-foreground line-through"}>{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</span><span className="text-xs text-muted-foreground">({slot.slot_duration_minutes} min)</span></div><div className="flex items-center gap-2"><Switch checked={slot.is_available} onCheckedChange={() => toggleSlot(slot)} aria-label={`Toggle ${name} availability`} /><Button variant="ghost" size="icon" onClick={() => removeSlot(slot.id)} aria-label={`Remove ${name} hours`}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div>) : <p className="text-sm text-muted-foreground">No hours set</p>}</CardContent></Card>)}</div>
  </div>
}
