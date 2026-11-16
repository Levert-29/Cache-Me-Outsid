"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, FileText, Pill, Plus, Users, ArrowRight, HeartPulse, MessageSquare, Settings } from "lucide-react"
import Link from "next/link"
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns"
import type { Appointment, Profile, Prescription, LeaveNote } from "@/lib/types"

interface DashboardStats {
  upcomingAppointments: number
  totalPrescriptions: number
  totalLeaveNotes: number
  queuePosition: number | null
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [recentPrescriptions, setRecentPrescriptions] = useState<Prescription[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    upcomingAppointments: 0,
    totalPrescriptions: 0,
    totalLeaveNotes: 0,
    queuePosition: null,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Load profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileData) {
          const providerRoles = ["healthcare_professional", "doctor", "nurse", "admin"]
          if (providerRoles.includes(profileData.role)) {
            router.replace("/provider")
            return
          }
          setProfile(profileData as Profile)
        }

        // Load upcoming appointments through the same server endpoint as My Appointments.
        // This keeps the dashboard aligned with the current appointment schema and RLS behavior.
        const today = new Date().toISOString().split("T")[0]
        const appointmentsResponse = await fetch("/api/appointments", { cache: "no-store" })
        const appointmentsResult = await appointmentsResponse.json()
        const appointmentsData = appointmentsResponse.ok ? appointmentsResult.appointments || [] : []
        const upcoming = appointmentsData
          .filter((appointment: Appointment) => appointment.appointment_date >= today)
          .filter((appointment: Appointment) => !["cancelled", "completed", "no_show"].includes(appointment.status))
          .sort((a: Appointment, b: Appointment) => `${a.appointment_date}${(a as Appointment & { start_time?: string }).start_time || a.appointment_time || ""}`.localeCompare(`${b.appointment_date}${(b as Appointment & { start_time?: string }).start_time || b.appointment_time || ""}`))

        setUpcomingAppointments(upcoming as Appointment[])

        const [prescriptionsResponse, leaveNotesResponse] = await Promise.all([
          fetch("/api/prescriptions", { cache: "no-store" }),
          fetch("/api/leave-notes", { cache: "no-store" }),
        ])
        const prescriptionsResult = await prescriptionsResponse.json()
        const leaveNotesResult = await leaveNotesResponse.json()
        const prescriptionsData = prescriptionsResponse.ok ? prescriptionsResult.prescriptions || [] : []
        setRecentPrescriptions((prescriptionsData as Prescription[]).slice(0, 3))

        // Use the same server-backed sources as the detail pages so counts are consistent.
        const appointmentCount = upcoming.length
        const prescriptionCount = prescriptionsData.length
        const leaveNoteCount = leaveNotesResponse.ok ? (leaveNotesResult.leaveNotes || []).length : 0

        const queueResponse = await fetch("/api/queue", { cache: "no-store" })
        const queueResult = await queueResponse.json()
        const queuePosition = queueResponse.ok ? queueResult.queueEntries?.[0]?.position || null : null

        setStats({
          upcomingAppointments: appointmentCount || 0,
          totalPrescriptions: prescriptionCount || 0,
          totalLeaveNotes: leaveNoteCount || 0,
          queuePosition,
        })
      } catch (error) {
        console.error("Error loading dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router, supabase])

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
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.first_name || "Student"}
          </h1>
          <p className="text-muted-foreground">
            {profile?.student_number && `Student ID: ${profile.student_number}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/book">
            <Plus className="mr-2 h-4 w-4" />
            Book Appointment
          </Link>
        </Button>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Need a clinic visit?</p>
              <p className="text-sm text-muted-foreground">Choose a provider and time.</p>
            </div>
            <Button variant="ghost" size="icon" asChild aria-label="Book an appointment">
              <Link href="/dashboard/book"><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10">
              <HeartPulse className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Your care history</p>
              <p className="text-sm text-muted-foreground">Review prescriptions and notes.</p>
            </div>
            <Button variant="ghost" size="icon" asChild aria-label="View care history">
              <Link href="/dashboard/prescriptions"><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Keep your details current</p>
              <p className="text-sm text-muted-foreground">Update your profile and preferences.</p>
            </div>
            <Button variant="ghost" size="icon" asChild aria-label="Open settings">
              <Link href="/dashboard/settings"><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Queue Alert */}
      {stats.queuePosition && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">You are currently in the queue</p>
              <p className="text-sm text-muted-foreground">
                Position: <span className="font-bold text-primary">#{stats.queuePosition}</span>
              </p>
            </div>
            <Button variant="outline" className="ml-auto" asChild>
              <Link href="/dashboard/queue">View Queue</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">scheduled visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPrescriptions}</div>
            <p className="text-xs text-muted-foreground">total prescriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Medical Leave Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeaveNotes}</div>
            <p className="text-xs text-muted-foreground">leave notes issued</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.queuePosition ? `#${stats.queuePosition}` : "Not in queue"}
            </div>
            <p className="text-xs text-muted-foreground">current position</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Your scheduled clinic visits</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/appointments">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.slice(0, 3).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {((appointment as Appointment & { start_time?: string }).start_time || appointment.appointment_time || "").slice(0, 5)} - Dr.{" "}
                        {(appointment as any).doctor?.first_name}{" "}
                        {(appointment as any).doctor?.last_name}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>
                    {appointment.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No upcoming appointments</p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard/book">Book an Appointment</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming appointment calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment calendar</CardTitle>
          <CardDescription>Your upcoming visits at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const month = new Date()
            const calendarDays = eachDayOfInterval({
              start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
              end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
            })
            return (
              <div className="overflow-x-auto">
                <div className="min-w-[40rem]">
                  <div className="grid grid-cols-7 gap-px rounded-t-lg bg-border text-center text-xs font-medium text-muted-foreground">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="bg-muted px-2 py-2">{day}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-px rounded-b-lg bg-border">
                    {calendarDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd')
                      const dayAppointments = upcomingAppointments.filter((appointment) => appointment.appointment_date === dateKey)
                      return (
                        <div key={dateKey} className={`min-h-24 bg-background p-2 ${!isSameMonth(day, month) ? 'text-muted-foreground/40' : ''}`}>
                          <p className={`text-sm font-semibold ${dateKey === format(new Date(), 'yyyy-MM-dd') ? 'text-primary' : ''}`}>{format(day, 'd')}</p>
                          <div className="mt-1 space-y-1">
                            {dayAppointments.map((appointment) => <p key={appointment.id} className="truncate rounded bg-primary/10 px-1.5 py-1 text-[11px] text-primary" title={appointment.reason || 'Appointment'}>{(appointment.start_time || appointment.appointment_time || '').slice(0, 5)} · {appointment.status}</p>)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Recent Prescriptions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Prescriptions</CardTitle>
            <CardDescription>Your latest prescribed medications</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/prescriptions">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentPrescriptions.length > 0 ? (
            <div className="space-y-4">
              {recentPrescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <Pill className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">{prescription.diagnosis}</p>
                      <p className="text-sm text-muted-foreground">
                        Prescribed by Dr. {(prescription as any).doctor?.first_name}{" "}
                        {(prescription as any).doctor?.last_name}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(prescription.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Pill className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No prescriptions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
