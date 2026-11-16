"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar, Clock, FileText, Pill, Users, X } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import type { Appointment, Profile } from "@/lib/types"

interface DashboardStats {
  todayAppointments: number
  pendingAppointments: number
  completedToday: number
  inQueue: number
}

export default function ProviderDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const isNurse = profile?.role === "nurse" || profile?.specialization?.toLowerCase().includes("nurs")
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [appointmentChanges, setAppointmentChanges] = useState<any[]>([])
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationsSeen, setNotificationsSeen] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    pendingAppointments: 0,
    completedToday: 0,
    inQueue: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
          const authRole = user.user_metadata?.role
          const resolvedProfile = {
            ...profileData,
            role: authRole === "nurse" ? "nurse" : profileData.role,
          }
          setProfile(resolvedProfile as Profile)
        }

        const today = format(new Date(), "yyyy-MM-dd")

        const providerResponse = await fetch('/api/appointments?role=provider', { cache: 'no-store' })
        const providerResult = await providerResponse.json()
        if (!providerResponse.ok) throw new Error(providerResult.error || "Could not load provider appointments")
        const providerAppointments = providerResult.appointments || []
        const storedDismissed = JSON.parse(window.localStorage.getItem('provider-dismissed-notifications') || '[]') as string[]
        setDismissedNotificationIds(storedDismissed)
        setAppointmentChanges(providerAppointments.filter((appointment: any) =>
          (appointment.status === 'cancelled' || appointment.updated_at !== appointment.created_at) && !storedDismissed.includes(appointment.id)
        ).slice(0, 10))

        // Use the same schema-aware API as the provider appointments page.
        const todayAppointmentsData = providerAppointments.filter((appointment: any) => appointment.appointment_date === today)
        setTodayAppointments(todayAppointmentsData as Appointment[])

        const todayCount = todayAppointmentsData.filter((appointment: any) => appointment.status !== "cancelled").length
        const pendingCount = todayAppointmentsData.filter((appointment: any) => ["scheduled", "pending", "confirmed"].includes(appointment.status)).length
        const completedCount = todayAppointmentsData.filter((appointment: any) => appointment.status === "completed").length

        // Get active queue count separately; queue is not part of the appointment API.

        const { data: activeQueue } = await supabase
          .from("queue")
          .select("appointment:appointments(status)")
          .eq("is_active", true)

        const queueCount = (activeQueue || []).filter((entry: any) =>
          entry.appointment?.status && !["cancelled", "completed", "no_show"].includes(entry.appointment.status)
        ).length

        setStats({
          todayAppointments: todayCount || 0,
          pendingAppointments: pendingCount || 0,
          completedToday: completedCount || 0,
          inQueue: queueCount,
        })
      } catch (error) {
        console.error("Error loading dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [supabase])

  useEffect(() => {
    if (appointmentChanges.length === 0) return
    const seenKey = `provider-notifications-seen:${appointmentChanges.map((appointment) => appointment.id).sort().join(",")}`
    setNotificationsSeen(window.localStorage.getItem(seenKey) === "true")
  }, [appointmentChanges])

  useEffect(() => {
    if (!showNotifications) return
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('[data-notification-panel]')) return
      if (!notificationRef.current?.contains(target)) setShowNotifications(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [showNotifications])

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
      <div className="flex items-start justify-between gap-4">
        <div>
        <h1 className="text-2xl font-bold">
          Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {isNurse ? "Nurse" : "Dr."} {profile?.last_name}
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
        </div>
        <div ref={notificationRef} className="relative" title="Appointment changes">
          <Button variant="outline" size="icon" aria-label="Appointment changes" onClick={() => {
              const nextOpen = !showNotifications
              setShowNotifications(nextOpen)
              if (nextOpen) {
                setNotificationsSeen(true)
                const seenKey = `provider-notifications-seen:${appointmentChanges.map((appointment) => appointment.id).sort().join(",")}`
                window.localStorage.setItem(seenKey, "true")
              }
            }} aria-expanded={showNotifications}>
            <Bell className="h-4 w-4" />
          </Button>
          {appointmentChanges.length > 0 && !notificationsSeen && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{appointmentChanges.length}</span>}
        </div>
      </div>
      {showNotifications && (
        <Card data-notification-panel onMouseDown={(event) => event.stopPropagation()} className="absolute right-6 top-20 z-20 w-[min(24rem,calc(100vw-3rem))] border-amber-200 bg-amber-50 shadow-lg">
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent appointment changes</CardTitle><CardDescription>Students who cancelled or changed their appointments</CardDescription></CardHeader>
          <CardContent className="space-y-2">{appointmentChanges.length > 0 ? appointmentChanges.map((appointment) => <div key={appointment.id} className="flex items-start justify-between gap-3 rounded-md border bg-background p-3 text-sm"><div><p className="font-medium">{appointment.patient?.first_name} {appointment.patient?.last_name}</p><p className="text-xs text-muted-foreground">Appointment: {appointment.appointment_date} at {(appointment.start_time || '').slice(0, 5) || 'time not set'}</p><p className="text-xs text-muted-foreground">Occurred {format(new Date(appointment.updated_at || appointment.created_at), 'MMM d, yyyy h:mm a')}</p></div><div className="flex items-center gap-2"><Badge variant={appointment.status === 'cancelled' ? 'destructive' : 'secondary'}>{appointment.status === 'cancelled' ? 'Cancelled' : 'Rescheduled'}</Badge><Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Clear notification" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); const next = [...dismissedNotificationIds, appointment.id]; setDismissedNotificationIds(next); setAppointmentChanges((current) => current.filter((item) => item.id !== appointment.id)); window.localStorage.setItem('provider-dismissed-notifications', JSON.stringify(next)) }}><X className="h-4 w-4" /></Button></div></div>) : <p className="text-sm text-muted-foreground">No recent appointment changes.</p>}</CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">scheduled for today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground">awaiting consultation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">consultations done</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Queue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inQueue}</div>
            <p className="text-xs text-muted-foreground">patients waiting</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Button asChild className="h-auto py-4">
          <Link href="/provider/appointments" className="flex flex-col items-center gap-2">
            <Calendar className="h-6 w-6" />
            <span>Daily Schedule</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href="/provider/patients" className="flex flex-col items-center gap-2">
            <Users className="h-6 w-6" />
            <span>Patient List</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href="/provider/appointments" className="flex flex-col items-center gap-2">
            <Clock className="h-6 w-6" />
            <span>Manage Visits</span>
          </Link>
        </Button>
        {isNurse ? (
          <Button asChild variant="outline" className="h-auto py-4">
            <Link href="/provider/appointments" className="flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              <span>Triage &amp; Vitals</span>
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="outline" className="h-auto py-4">
              <Link href="/provider/prescriptions/new" className="flex flex-col items-center gap-2">
                <Pill className="h-6 w-6" />
                <span>Prescription</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4">
              <Link href="/provider/leave-notes/new" className="flex flex-col items-center gap-2">
                <FileText className="h-6 w-6" />
                <span>Medical Note</span>
              </Link>
            </Button>
          </>
        )}
        {!isNurse && (
          <Button asChild variant="outline" className="h-auto py-4">
            <Link href="/provider/availability" className="flex flex-col items-center gap-2">
              <Calendar className="h-6 w-6" />
              <span>Follow-up Slots</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Today&apos;s Appointments</CardTitle>
            <CardDescription>{isNurse ? "Patients assigned to your nursing workflow" : "Your schedule for today"}</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/provider/appointments">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {((appointment as any).start_time || (appointment as any).appointment_time || "").slice(0, 5) || "Time not set"} -{" "}
                        {(appointment as any).patient?.first_name}{" "}
                        {(appointment as any).patient?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Student number: {(appointment as any).patient?.student_number || "Not provided"}
                        {appointment.reason && ` | ${appointment.reason}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                    {["pending", "confirmed"].includes(appointment.status) && (
                      <Button size="sm" asChild>
                        <Link href={`/provider/appointments/${appointment.id}`}>
                          Start
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No appointments scheduled for today</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
