"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  FileText,
  MessageSquare,
  Pill,
  Star,
  TrendingUp,
  Users,
} from "lucide-react"
import { format, subDays } from "date-fns"

interface AdminStats {
  totalStudents: number
  totalDoctors: number
  totalAppointments: number
  appointmentsToday: number
  totalPrescriptions: number
  totalLeaveNotes: number
  totalFeedback: number
  averageRating: number
}

interface RecentActivity {
  type: "appointment" | "feedback" | "prescription"
  description: string
  timestamp: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    appointmentsToday: 0,
    totalPrescriptions: 0,
    totalLeaveNotes: 0,
    totalFeedback: 0,
    averageRating: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [recentFeedback, setRecentFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadDashboard() {
      try {
        const today = format(new Date(), "yyyy-MM-dd")

        // Get user counts
        const { count: studentCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student")

        const { count: doctorCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "doctor")

        // Get appointment counts
        const { count: totalAppointments } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })

        const { count: todayAppointments } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("appointment_date", today)

        // Get prescription and leave note counts
        const { count: prescriptionCount } = await supabase
          .from("prescriptions")
          .select("*", { count: "exact", head: true })

        const { count: leaveNoteCount } = await supabase
          .from("medical_leave_notes")
          .select("*", { count: "exact", head: true })

        // Get feedback stats
        const { count: feedbackCount } = await supabase
          .from("feedback")
          .select("*", { count: "exact", head: true })

        const { data: feedbackRatings } = await supabase
          .from("feedback")
          .select("rating")

        const avgRating = feedbackRatings && feedbackRatings.length > 0
          ? feedbackRatings.reduce((sum, f) => sum + f.rating, 0) / feedbackRatings.length
          : 0

        setStats({
          totalStudents: studentCount || 0,
          totalDoctors: doctorCount || 0,
          totalAppointments: totalAppointments || 0,
          appointmentsToday: todayAppointments || 0,
          totalPrescriptions: prescriptionCount || 0,
          totalLeaveNotes: leaveNoteCount || 0,
          totalFeedback: feedbackCount || 0,
          averageRating: Math.round(avgRating * 10) / 10,
        })

        // Get recent feedback
        const { data: recentFeedbackData } = await supabase
          .from("feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5)

        if (recentFeedbackData) {
          setRecentFeedback(recentFeedbackData)
        }

        // Build recent activity
        const activities: RecentActivity[] = []

        // Recent appointments
        const { data: recentAppointments } = await supabase
          .from("appointments")
          .select(`
            *,
            patient:profiles!appointments_patient_id_fkey(first_name, last_name)
          `)
          .order("created_at", { ascending: false })
          .limit(3)

        if (recentAppointments) {
          recentAppointments.forEach((apt) => {
            activities.push({
              type: "appointment",
              description: `New appointment booked by ${(apt as any).patient?.first_name} ${(apt as any).patient?.last_name}`,
              timestamp: apt.created_at,
            })
          })
        }

        // Recent feedback
        const { data: recentFeedbackActivity } = await supabase
          .from("feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(2)

        if (recentFeedbackActivity) {
          recentFeedbackActivity.forEach((fb) => {
            activities.push({
              type: "feedback",
              description: `New feedback received - ${fb.rating} stars`,
              timestamp: fb.created_at,
            })
          })
        }

        // Sort by timestamp
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setRecentActivity(activities.slice(0, 5))

      } catch (error) {
        console.error("Error loading admin dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [supabase])

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
      />
    ))
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
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of the Campus Clinic Appointment System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">registered students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Healthcare Providers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDoctors}</div>
            <p className="text-xs text-muted-foreground">doctors on staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">{stats.appointmentsToday} today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              from {stats.totalFeedback} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions Issued</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPrescriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leave Notes Issued</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeaveNotes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Feedback Received</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFeedback}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      activity.type === "appointment" ? "bg-blue-100" :
                      activity.type === "feedback" ? "bg-yellow-100" : "bg-green-100"
                    }`}>
                      {activity.type === "appointment" && <Calendar className="h-4 w-4 text-blue-600" />}
                      {activity.type === "feedback" && <MessageSquare className="h-4 w-4 text-yellow-600" />}
                      {activity.type === "prescription" && <Pill className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
            <CardDescription>Latest student reviews</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFeedback.length > 0 ? (
              <div className="space-y-4">
                {recentFeedback.map((feedback) => (
                  <div key={feedback.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(feedback.rating)}
                    </div>
                    {feedback.comments && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {feedback.comments}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(feedback.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No feedback yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
