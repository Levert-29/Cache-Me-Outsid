"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Calendar as CalendarIcon, Clock, Edit, Plus, Trash2, User, Check, Info } from "lucide-react"
import Link from "next/link"
import { format, addDays, isBefore, startOfToday } from "date-fns"
import type { Appointment } from "@/lib/types"

export default function AppointmentsPage() {
  const searchParams = useSearchParams()
  const showSuccess = searchParams.get("booked") === "true"

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [newDate, setNewDate] = useState<Date | undefined>(undefined)
  const [newTime, setNewTime] = useState<string>("")
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadAppointments()
  }, [])

  async function loadAppointments() {
    try {
      const response = await fetch('/api/appointments', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to load appointments')
      setAppointments((result.appointments || []) as Appointment[])
    } catch (error) {
      console.error("Error loading appointments:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load available time slots when reschedule date changes
  useEffect(() => {
    async function loadTimeSlots() {
      if (!selectedAppointment || !newDate) {
        setAvailableSlots([])
        return
      }

      const dateStr = format(newDate, "yyyy-MM-dd")

      // Generate default slots
      const defaultSlots: { time: string; available: boolean }[] = []
      for (let hour = 8; hour < 17; hour++) {
        if (hour !== 12) {
          defaultSlots.push({ time: `${hour.toString().padStart(2, "0")}:00`, available: true })
          defaultSlots.push({ time: `${hour.toString().padStart(2, "0")}:30`, available: true })
        }
      }

      // Check existing appointments
      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("start_time")
        .eq("professional_id", (selectedAppointment as Appointment & { professional_id?: string }).professional_id)
        .eq("appointment_date", dateStr)
        .neq("id", selectedAppointment.id)
        .in("status", ["pending", "confirmed", "in_progress"])

      const bookedTimes = existingAppointments?.map((a) => ((a as { start_time?: string; appointment_time?: string }).start_time || (a as { appointment_time?: string }).appointment_time || "").slice(0, 5)) || []

      setAvailableSlots(
        defaultSlots.map((slot) => ({
          ...slot,
          available: !bookedTimes.includes(slot.time),
        }))
      )
    }

    loadTimeSlots()
  }, [selectedAppointment, newDate, supabase])

  const handleReschedule = async () => {
    if (!selectedAppointment || !newDate || !newTime) return

    setActionLoading(true)
    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: selectedAppointment.id,
          action: "reschedule",
          new_date: format(newDate, "yyyy-MM-dd"),
          new_time: newTime,
        }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || `Failed to reschedule appointment (${response.status})`)
      }

      setRescheduleDialogOpen(false)
      setSelectedAppointment(null)
      setNewDate(undefined)
      setNewTime("")
      loadAppointments()
    } catch (error) {
      console.error("Error rescheduling:", error)
      alert(error instanceof Error ? error.message : "Failed to reschedule appointment")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedAppointment) return

    setActionLoading(true)
    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: selectedAppointment.id,
          action: "cancel",
        }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || `Failed to cancel appointment (${response.status})`)
      }

      setCancelDialogOpen(false)
      setSelectedAppointment(null)
      loadAppointments()
    } catch (error) {
      console.error("Error cancelling:", error)
      alert(error instanceof Error ? error.message : "Failed to cancel appointment")
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "no_show":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const today = new Date().toISOString().split("T")[0]
  const upcomingAppointments = appointments.filter(
    (a) => a.appointment_date >= today && !["cancelled", "completed", "no_show"].includes(a.status)
  )
  const pastAppointments = appointments.filter(
    (a) => a.appointment_date < today || ["cancelled", "completed", "no_show"].includes(a.status)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">View and manage your clinic appointments</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/book">
            <Plus className="mr-2 h-4 w-4" />
            Book Appointment
          </Link>
        </Button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-green-800">
              Your appointment has been booked successfully. Your appointment details and verification code are available on the My Appointments page. No confirmation email will be sent.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Upcoming visits</p>
            <p className="mt-1 text-2xl font-bold">{upcomingAppointments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Completed visits</p>
            <p className="mt-1 text-2xl font-bold">{appointments.filter((appointment) => appointment.status === "completed").length}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">You can reschedule or cancel pending and confirmed visits from this page.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <CalendarIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {((appointment as { start_time?: string; appointment_time?: string }).start_time || appointment.appointment_time || "").slice(0, 5)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <User className="inline h-3 w-3 mr-1" />
                            Dr. {(appointment as any).doctor?.first_name}{" "}
                            {(appointment as any).doctor?.last_name}
                          </p>
                              {appointment.reason && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Reason: {appointment.reason}
                                </p>
                              )}
                              <p className="text-sm font-medium text-primary mt-1">
                                Clinic verification code: {appointment.verification_code}
                              </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        {["pending", "confirmed", "scheduled"].includes(appointment.status) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAppointment(appointment)
                                setRescheduleDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Reschedule
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedAppointment(appointment)
                                setCancelDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No upcoming appointments</p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/book">Book an Appointment</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {pastAppointments.length > 0 ? (
            <div className="space-y-4">
              {pastAppointments.map((appointment) => (
                <Card key={appointment.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {((appointment as { start_time?: string; appointment_time?: string }).start_time || appointment.appointment_time || "").slice(0, 5)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <User className="inline h-3 w-3 mr-1" />
                            Dr. {(appointment as any).doctor?.first_name}{" "}
                            {(appointment as any).doctor?.last_name}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No past appointments</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for your appointment
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className="mb-2 block">Select New Date</Label>
              <Calendar
                mode="single"
                selected={newDate}
                onSelect={setNewDate}
                disabled={(date) => isBefore(date, startOfToday()) || date > addDays(new Date(), 30)}
                className="rounded-md border"
              />
            </div>
            {newDate && (
              <div>
                <Label className="mb-2 block">Select New Time</Label>
                <div className="grid grid-cols-4 gap-2 max-h-[150px] overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={newTime === slot.time ? "default" : "outline"}
                      size="sm"
                      disabled={!slot.available}
                      onClick={() => setNewTime(slot.time)}
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={!newDate || !newTime || actionLoading}>
              {actionLoading ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Cancelling..." : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
