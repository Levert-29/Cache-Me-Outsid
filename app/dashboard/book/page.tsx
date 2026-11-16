"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Check, Clock, User } from "lucide-react"
import { format, addDays, isBefore, startOfToday } from "date-fns"
import type { Profile, Symptom } from "@/lib/types"

type BookingStep = "doctor" | "datetime" | "symptoms" | "confirm"

interface Doctor extends Profile {
  specialization: string
  professional_id?: string
  nextAvailableAt?: string
}

interface TimeSlotOption {
  time: string
  available: boolean
}

export default function BookAppointmentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentStep, setCurrentStep] = useState<BookingStep>("doctor")
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlotOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedDoctor, setSelectedDoctor] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [reason, setReason] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")

  // Load doctors and symptoms on mount
  useEffect(() => {
    async function loadData() {
      try {
  const doctorsResponse = await fetch('/api/doctors', { cache: 'no-store' })
  const doctorsResult = await doctorsResponse.json()
      if (!doctorsResponse.ok) throw new Error(doctorsResult.error || `Could not load doctors (${doctorsResponse.status})`)
      setDoctors(doctorsResult.doctors || [])
      const { data: symptomData } = await supabase.from("symptoms").select("*").eq("is_active", true).order("category").order("name")
      setSymptoms(symptomData || [])
    } catch (error) {
      console.error("[v0] Error loading booking data:", error)
    } finally {
      setLoading(false)
    }
    }
    loadData()
  }, [])

  useEffect(() => {
    async function loadSlots() {
      setAvailableSlots([])
      setSelectedTime("")
      if (!selectedDoctor || !selectedDate) return
      const dayOfWeek = selectedDate.getDay()
      const { data: hours, error } = await supabase
        .from("doctor_availability")
        .select("start_time, end_time, slot_duration_minutes")
        .eq("doctor_id", selectedDoctor)
        .eq("day_of_week", dayOfWeek)
        .eq("is_available", true)
        .order("start_time")
      if (error || !hours?.length) return

      const { data: booked } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("professional_id", doctors.find((doctor) => doctor.id === selectedDoctor)?.professional_id)
        .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
        .neq("status", "cancelled")
      const taken = new Set((booked || []).map((appointment) => String(appointment.start_time).slice(0, 5)))
      const slots: TimeSlotOption[] = []
      for (const hour of hours) {
        let cursor = Number(hour.start_time.slice(0, 2)) * 60 + Number(hour.start_time.slice(3, 5))
        const end = Number(hour.end_time.slice(0, 2)) * 60 + Number(hour.end_time.slice(3, 5))
        const duration = hour.slot_duration_minutes || 30
        while (cursor + duration <= end) {
          const time = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`
          slots.push({ time, available: !taken.has(time) })
          cursor += duration
        }
      }
      setAvailableSlots(slots)
    }
    loadSlots()
  }, [selectedDoctor, selectedDate])

  const handleSymptomToggle = (symptomId: string) => {
    setSelectedSymptoms((current) => current.includes(symptomId) ? current.filter((id) => id !== symptomId) : [...current, symptomId])
  }

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Create appointment
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: selectedDoctor,
          appointment_date: format(selectedDate, "yyyy-MM-dd"),
          appointment_time: selectedTime,
          reason,
          notes: additionalNotes,
          symptoms: selectedSymptoms.map((symptomId) => ({ symptom_id: symptomId })),
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to book appointment")

      router.push("/dashboard/appointments?booked=true")
    } catch (error) {
      console.error("[v0] Error booking appointment:", error)
      alert(error instanceof Error ? error.message : "Failed to book appointment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case "doctor":
        return !!selectedDoctor
      case "datetime":
        return !!selectedDate && !!selectedTime
      case "symptoms":
        return true // Symptoms are optional
      case "confirm":
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    const steps: BookingStep[] = ["doctor", "datetime", "symptoms", "confirm"]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const steps: BookingStep[] = ["doctor", "datetime", "symptoms", "confirm"]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor)

  const groupedSymptoms = symptoms.reduce(
    (acc, symptom) => {
      const category = symptom.category || "Other"
      if (!acc[category]) acc[category] = []
      acc[category].push(symptom)
      return acc
    },
    {} as Record<string, Symptom[]>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Book an Appointment</h1>
        <p className="text-muted-foreground">Schedule your visit to the campus clinic</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[
          { key: "doctor", label: "Select Doctor", icon: User },
          { key: "datetime", label: "Date & Time", icon: CalendarIcon },
          { key: "symptoms", label: "Symptoms", icon: Check },
          { key: "confirm", label: "Confirm", icon: Check },
        ].map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.key
          const isPast =
            ["doctor", "datetime", "symptoms", "confirm"].indexOf(currentStep) >
            ["doctor", "datetime", "symptoms", "confirm"].indexOf(step.key)

          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isPast
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {isPast ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              {index < 3 && (
                <div
                  className={`w-12 sm:w-20 h-1 mx-2 rounded ${
                    isPast ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === "doctor" && "Select a Doctor"}
            {currentStep === "datetime" && "Choose Date & Time"}
            {currentStep === "symptoms" && "Describe Your Symptoms"}
            {currentStep === "confirm" && "Confirm Your Appointment"}
          </CardTitle>
          <CardDescription>
            {currentStep === "doctor" && "Choose the healthcare provider you'd like to see"}
            {currentStep === "datetime" && "Pick a convenient date and time for your visit"}
            {currentStep === "symptoms" && "Help us understand your concerns (optional)"}
            {currentStep === "confirm" && "Review and confirm your appointment details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Doctor Selection */}
          {currentStep === "doctor" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {doctors.length > 0 ? (
                doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => setSelectedDoctor(doctor.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      selectedDoctor === doctor.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {doctor.specialization || "General Practice"}
                        </p>
                        {doctor.nextAvailableAt && (
                          <p className="mt-1 text-xs text-primary">
                            Earliest: {format(new Date(doctor.nextAvailableAt), "EEE, MMM d 'at' h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No doctors available at the moment. Please try again later.
                </div>
              )}
            </div>
          )}

          {/* Date & Time Selection */}
          {currentStep === "datetime" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="mb-2 block">Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => isBefore(date, startOfToday()) || date > addDays(new Date(), 30)}
                  className="rounded-md border"
                />
              </div>
              <div>
                <Label className="mb-2 block">Select Time</Label>
                {selectedDate ? (
                  availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          size="sm"
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className="w-full"
                        >
                          <Clock className="mr-1 h-3 w-3" />
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No available slots for this date
                    </p>
                  )
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Please select a date first
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Symptoms Selection */}
          {currentStep === "symptoms" && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="reason">Primary Reason for Visit</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Checkup</SelectItem>
                    <SelectItem value="illness">Illness / Feeling Unwell</SelectItem>
                    <SelectItem value="injury">Injury</SelectItem>
                    <SelectItem value="followup">Follow-up Visit</SelectItem>
                    <SelectItem value="prescription">Prescription Refill</SelectItem>
                    <SelectItem value="mental_health">Mental Health Support</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block">Select Your Symptoms (Optional)</Label>
                <div className="space-y-4">
                  {Object.entries(groupedSymptoms).map(([category, categorySymptoms]) => (
                    <div key={category}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">{category}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {categorySymptoms.map((symptom) => (
                          <div
                            key={symptom.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={symptom.id}
                              checked={selectedSymptoms.includes(symptom.id)}
                              onCheckedChange={() => handleSymptomToggle(symptom.id)}
                            />
                            <label
                              htmlFor={symptom.id}
                              className="text-sm cursor-pointer"
                            >
                              {symptom.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information you'd like to share..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Confirmation */}
          {currentStep === "confirm" && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Doctor</p>
                    <p className="font-medium">
                      Dr. {selectedDoctorData?.first_name} {selectedDoctorData?.last_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">{selectedTime}</p>
                  </div>
                </div>

                {reason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reason for Visit</p>
                    <p className="font-medium capitalize">{reason.replace("_", " ")}</p>
                  </div>
                )}

                {selectedSymptoms.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Symptoms</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSymptoms.map((id) => {
                        const symptom = symptoms.find((s) => s.id === id)
                        return symptom ? (
                          <span
                            key={id}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                          >
                            {symptom.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {additionalNotes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Additional Notes</p>
                    <p className="text-sm">{additionalNotes}</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                By confirming this appointment, you agree to arrive 10 minutes before your
                scheduled time. You will receive an email confirmation shortly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === "doctor"}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep === "confirm" ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Booking..." : "Confirm Appointment"}
          </Button>
        ) : (
          <Button onClick={nextStep} disabled={!canProceed()}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
