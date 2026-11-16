"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, RefreshCw, Users } from "lucide-react"
import { format } from "date-fns"

interface QueueEntry {
  id: string
  position: number
  estimated_wait_minutes: number | null
  checked_in_at: string
  appointment: {
    id: string
    appointment_date: string
    start_time?: string
    appointment_time?: string
    doctor: {
      first_name: string
      last_name: string
    }
  }
}

interface ClinicStats {
  currentlyWaiting: number
  averageWaitTime: number
  nextAvailableSlot: string | null
}

export default function QueuePage() {
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null)
  const [clinicStats, setClinicStats] = useState<ClinicStats>({
    currentlyWaiting: 0,
    averageWaitTime: 15,
    nextAvailableSlot: null,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  const loadQueueData = async () => {
    try {
      const response = await fetch("/api/queue", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to load queue")

      const activeEntries = result.queueEntries || []
      const currentEntry = activeEntries[0] || null
      setQueueEntry(currentEntry as QueueEntry | null)

      const waitingCount = activeEntries.length
      const recentQueue = activeEntries.filter((entry: any) => entry.estimated_wait_minutes != null)

      let avgWait = 15
      if (recentQueue && recentQueue.length > 0) {
        const total = recentQueue.reduce((sum: number, q: any) => sum + (q.estimated_wait_minutes || 0), 0)
        avgWait = Math.round(total / recentQueue.length)
      }

      setClinicStats({
        currentlyWaiting: waitingCount || 0,
        averageWaitTime: avgWait,
        nextAvailableSlot: null,
      })
    } catch (error) {
      console.error("Error loading queue data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadQueueData()

    // Set up real-time subscription
    const channel = supabase
      .channel("queue-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue" },
        () => {
          loadQueueData()
        }
      )
      .subscribe()

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadQueueData, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [supabase])

  const handleRefresh = () => {
    setRefreshing(true)
    loadQueueData()
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Queue Status</h1>
          <p className="text-muted-foreground">Check wait times and your position in the queue</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Clinic Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Currently Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{clinicStats.currentlyWaiting}</span>
              <span className="text-muted-foreground">patients</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Wait Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{clinicStats.averageWaitTime}</span>
              <span className="text-muted-foreground">minutes</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clinic Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Open
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">8:00 AM - 5:00 PM</p>
          </CardContent>
        </Card>
      </div>

      {/* User's Queue Position */}
      {queueEntry ? (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Queue Position
            </CardTitle>
            <CardDescription>You are currently in the queue for your appointment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-4xl font-bold">#{queueEntry.position}</span>
              </div>
              <p className="mt-4 text-lg font-medium">
                Estimated wait: {queueEntry.estimated_wait_minutes || clinicStats.averageWaitTime * queueEntry.position} minutes
              </p>
              <p className="text-sm text-muted-foreground">
                Checked in at {format(new Date(queueEntry.checked_in_at), "h:mm a")}
              </p>

              <div className="mt-6 rounded-lg border bg-background p-4 w-full max-w-md">
                <p className="text-sm text-muted-foreground">Appointment Details</p>
                <p className="font-medium mt-1">
                  Dr. {queueEntry.appointment.doctor.first_name}{" "}
                  {queueEntry.appointment.doctor.last_name}
                </p>
                <p className="text-sm">
                  {format(new Date(queueEntry.appointment.appointment_date), "MMMM d, yyyy")} at{" "}
                  {(queueEntry.appointment.start_time || queueEntry.appointment.appointment_time || "").slice(0, 5) || "Time not set"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">You are not currently in the queue</p>
            <p className="text-sm text-muted-foreground mt-1">
              You will be added to the queue when you check in for your appointment
            </p>
          </CardContent>
        </Card>
      )}

      {/* Queue Info */}
      <Card>
        <CardHeader>
          <CardTitle>How the Queue Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Check In</p>
              <p className="text-sm text-muted-foreground">
                When you arrive at the clinic, check in at the reception desk
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Wait for Your Turn</p>
              <p className="text-sm text-muted-foreground">
                Monitor your position in the queue on this page. It updates in real-time.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Get Called</p>
              <p className="text-sm text-muted-foreground">
                When it&apos;s your turn, you&apos;ll be called to the consultation room
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
