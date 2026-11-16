"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Check } from "lucide-react"
import { format, addDays, isBefore, startOfToday } from "date-fns"
import type { Appointment } from "@/lib/types"

export default function NewLeaveNotePage() {
  const router = useRouter()
  const supabase = createClient()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [selectedAppointment, setSelectedAppointment] = useState<string>("")
  const [leaveStartDate, setLeaveStartDate] = useState<Date | undefined>(new Date())
  const [leaveEndDate, setLeaveEndDate] = useState<Date | undefined>(addDays(new Date(), 1))
  const [reason, setReason] = useState("")
  const [recommendations, setRecommendations] = useState("")

  useEffect(() => {
    async function loadAppointments() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const response = await fetch("/api/appointments?role=provider", { cache: "no-store" })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Could not load appointments")
        }

        const availableAppointments = (result.appointments || []).filter((appointment: Appointment) =>
          ["confirmed", "in_progress", "completed"].includes(appointment.status) && appointment.patient,
        )
        setAppointments(availableAppointments as Appointment[])
      } catch (error) {
        console.error("Error loading appointments:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [supabase])

  const handleSubmit = async () => {
    if (!selectedAppointment || !leaveStartDate || !leaveEndDate || !reason) {
      alert("Please fill in all required fields")
      return
    }

    if (isBefore(leaveEndDate, leaveStartDate)) {
      alert("End date must be after start date")
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const response = await fetch("/api/leave-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: selectedAppointment,
          leave_start_date: format(leaveStartDate, "yyyy-MM-dd"),
          leave_end_date: format(leaveEndDate, "yyyy-MM-dd"),
          reason,
          recommendations,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to create leave note")

      setSubmitted(true)
    } catch (error) {
      console.error("Error creating leave note:", error)
      alert("Failed to create leave note. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Medical Leave Note Created</h2>
            <p className="mt-2 text-center text-muted-foreground max-w-md">
              The medical leave note has been created successfully and is now available for the student to download.
            </p>
            <div className="flex gap-2 mt-6">
              <Button onClick={() => {
                setSubmitted(false)
                setSelectedAppointment("")
                setLeaveStartDate(new Date())
                setLeaveEndDate(addDays(new Date(), 1))
                setReason("")
                setRecommendations("")
              }}>
                Create Another
              </Button>
              <Button variant="outline" onClick={() => router.push("/provider")}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Issue Medical Leave Note</h1>
        <p className="text-muted-foreground">Create a medical leave certificate for a student</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Note Details</CardTitle>
          <CardDescription>Fill in the medical leave information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label>Select Patient/Appointment *</Label>
            <Select value={selectedAppointment} onValueChange={setSelectedAppointment}>
              <SelectTrigger>
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {appointments.length === 0 ? (
                  <SelectItem value="none" disabled>No eligible patient appointments found</SelectItem>
                ) : appointments.map((apt) => (
                  <SelectItem key={apt.id} value={apt.id}>
                    {(apt as any).patient?.first_name} {(apt as any).patient?.last_name} ({(apt as any).patient?.student_number}) - {" "}
                    {format(new Date(apt.appointment_date), "MMM d")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Leave Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Leave Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {leaveStartDate ? format(leaveStartDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={leaveStartDate}
                    onSelect={setLeaveStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Leave End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {leaveEndDate ? format(leaveEndDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={leaveEndDate}
                    onSelect={setLeaveEndDate}
                    disabled={(date) => Boolean(leaveStartDate && isBefore(date, leaveStartDate))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Leave *</Label>
            <Textarea
              id="reason"
              placeholder="Medical reason for leave (will be shown on the certificate)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <Label htmlFor="recommendations">Recommendations (Optional)</Label>
            <Textarea
              id="recommendations"
              placeholder="Any recommendations for the student during the leave period"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? "Creating..." : "Create Leave Note"}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
