"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Trash2, Check } from "lucide-react"
import { format, addDays } from "date-fns"
import type { Appointment } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  notes: string
}

export default function NewPrescriptionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [selectedAppointment, setSelectedAppointment] = useState<string>("")
  const [diagnosis, setDiagnosis] = useState("")
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", frequency: "", duration: "", notes: "" },
  ])
  const [instructions, setInstructions] = useState("")
  const [validUntil, setValidUntil] = useState<Date | undefined>(addDays(new Date(), 30))

  useEffect(() => {
    async function loadAppointments() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const today = format(new Date(), "yyyy-MM-dd")
        const { data: professional } = await supabase
          .from("healthcare_professionals")
          .select("id")
          .eq("user_id", user.id)
          .single()
        if (!professional) return

        const { data } = await supabase
          .from("appointments")
          .select("*")
          .eq("professional_id", professional.id)
          .gte("appointment_date", today)
          .in("status", ["confirmed", "in_progress", "completed"])
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(50)

        const studentIds = [...new Set((data || []).map((appointment: any) => appointment.student_id).filter(Boolean))]
        const { data: students } = studentIds.length
          ? await supabase.from("profiles").select("id, first_name, last_name, student_number").in("id", studentIds)
          : { data: [] }
        const studentById = new Map((students || []).map((student: any) => [student.id, student]))
        setAppointments((data || []).map((appointment: any) => ({ ...appointment, patient: studentById.get(appointment.student_id) || null })) as Appointment[])
      } catch (error) {
        console.error("Error loading appointments:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [supabase])

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", frequency: "", duration: "", notes: "" }])
  }

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index))
  }

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications]
    updated[index][field] = value
    setMedications(updated)
  }

  const handleSubmit = async () => {
    if (!selectedAppointment || !diagnosis || medications.some((m) => !m.name || !m.dosage)) {
      alert("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const appointment = appointments.find((a) => a.id === selectedAppointment)
      if (!appointment) throw new Error("Appointment not found")

      const response = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: selectedAppointment,
          diagnosis,
          medications: medications.filter((m) => m.name),
          instructions: instructions || null,
          valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to create prescription")

      setSubmitted(true)
    } catch (error) {
      console.error("Error creating prescription:", error)
      alert("Failed to create prescription. Please try again.")
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
            <h2 className="mt-4 text-xl font-semibold">Prescription Created</h2>
            <p className="mt-2 text-center text-muted-foreground max-w-md">
              The prescription has been created successfully and is now available for the patient to view.
            </p>
            <div className="flex gap-2 mt-6">
              <Button onClick={() => {
                setSubmitted(false)
                setSelectedAppointment("")
                setDiagnosis("")
                setMedications([{ name: "", dosage: "", frequency: "", duration: "", notes: "" }])
                setInstructions("")
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Issue Prescription</h1>
        <p className="text-muted-foreground">Create a digital prescription for a patient</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription Details</CardTitle>
          <CardDescription>Fill in the prescription information</CardDescription>
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
                {appointments.map((apt) => (
                  <SelectItem key={apt.id} value={apt.id}>
                    {(apt as any).patient?.first_name} {(apt as any).patient?.last_name} - {" "}
                    {format(new Date(apt.appointment_date), "MMM d")} at {((apt as any).start_time || (apt as any).appointment_time || "").slice(0, 5) || "Time not set"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Diagnosis */}
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis *</Label>
            <Input
              id="diagnosis"
              placeholder="Enter diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>

          {/* Medications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Medications *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMedication}>
                <Plus className="h-4 w-4 mr-1" />
                Add Medication
              </Button>
            </div>

            {medications.map((med, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Medication {index + 1}</span>
                  {medications.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Medication Name *</Label>
                    <Input
                      placeholder="e.g., Paracetamol"
                      value={med.name}
                      onChange={(e) => updateMedication(index, "name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dosage *</Label>
                    <Input
                      placeholder="e.g., 500mg"
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={med.frequency}
                      onValueChange={(v) => updateMedication(index, "frequency", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once_daily">Once daily</SelectItem>
                        <SelectItem value="twice_daily">Twice daily</SelectItem>
                        <SelectItem value="three_times_daily">Three times daily</SelectItem>
                        <SelectItem value="four_times_daily">Four times daily</SelectItem>
                        <SelectItem value="every_4_hours">Every 4 hours</SelectItem>
                        <SelectItem value="every_6_hours">Every 6 hours</SelectItem>
                        <SelectItem value="every_8_hours">Every 8 hours</SelectItem>
                        <SelectItem value="as_needed">As needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      placeholder="e.g., 7 days"
                      value={med.duration}
                      onChange={(e) => updateMedication(index, "duration", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Special Notes</Label>
                  <Input
                    placeholder="e.g., Take with food"
                    value={med.notes}
                    onChange={(e) => updateMedication(index, "notes", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Additional Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Any additional instructions for the patient"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Valid Until */}
          <div className="space-y-2">
            <Label>Valid Until</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {validUntil ? format(validUntil, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={validUntil}
                  onSelect={setValidUntil}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? "Creating..." : "Create Prescription"}
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
