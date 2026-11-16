"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, RefreshCw, User, UserCheck } from "lucide-react"
import { format } from "date-fns"

interface QueueEntry {
  id: string
  position: number
  estimated_wait_minutes: number | null
  checked_in_at: string
  is_active: boolean
  appointment: {
    id: string
    appointment_date: string
    start_time?: string
    appointment_time?: string
    status: string
    reason: string | null
    patient: {
      id: string
      first_name: string
      last_name: string
      student_number: string
    }
  }
}

export default function ProviderQueuePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClient()

  const loadQueue = async () => {
    try {
      const response = await fetch("/api/queue?provider=true", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to load queue")
      setQueue((result.queueEntries || []) as QueueEntry[])
    } catch (error) {
      console.error("Error loading queue:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadQueue()

    // Set up real-time subscription
    const channel = supabase
      .channel("provider-queue-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue" },
        () => {
          loadQueue()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleCallPatient = async (queueEntry: QueueEntry) => {
    setActionLoading(queueEntry.id)
    try {
      // Update queue entry
      await supabase
        .from("queue")
        .update({ called_at: new Date().toISOString() })
        .eq("id", queueEntry.id)

      // Update appointment status to in_progress
      await supabase
        .from("appointments")
        .update({ status: "in_progress", actual_start_time: new Date().toISOString() })
        .eq("id", queueEntry.appointment.id)

      loadQueue()
    } catch (error) {
      console.error("Error calling patient:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteConsultation = async (queueEntry: QueueEntry) => {
    setActionLoading(queueEntry.id)
    try {
      // Remove from queue
      await supabase
        .from("queue")
        .update({ is_active: false })
        .eq("id", queueEntry.id)

      // Update appointment status to completed
      await supabase
        .from("appointments")
        .update({ status: "completed", actual_end_time: new Date().toISOString() })
        .eq("id", queueEntry.appointment.id)

      // Reorder remaining queue
      const remainingQueue = queue.filter((q) => q.id !== queueEntry.id)
      for (let i = 0; i < remainingQueue.length; i++) {
        await supabase
          .from("queue")
          .update({ position: i + 1 })
          .eq("id", remainingQueue[i].id)
      }

      loadQueue()
    } catch (error) {
      console.error("Error completing consultation:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleNoShow = async (queueEntry: QueueEntry) => {
    setActionLoading(queueEntry.id)
    try {
      // Remove from queue
      await supabase
        .from("queue")
        .update({ is_active: false })
        .eq("id", queueEntry.id)

      // Update appointment status to no_show
      await supabase
        .from("appointments")
        .update({ status: "no_show" })
        .eq("id", queueEntry.appointment.id)

      loadQueue()
    } catch (error) {
      console.error("Error marking no-show:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadQueue()
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
          <h1 className="text-2xl font-bold">Patient Queue</h1>
          <p className="text-muted-foreground">
            {queue.length} patient{queue.length !== 1 ? "s" : ""} currently waiting
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Queue List */}
      {queue.length > 0 ? (
        <div className="space-y-4">
          {queue.map((entry, index) => {
            const isBeingCalled = entry.appointment.status === "in_progress"
            
            return (
              <Card key={entry.id} className={isBeingCalled ? "border-primary bg-primary/5" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full font-bold text-lg ${
                        isBeingCalled ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        #{entry.position}
                      </div>
                      <div>
                        <p className="font-medium">
                          {entry.appointment.patient.first_name} {entry.appointment.patient.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Student number: {entry.appointment.patient.student_number || "Not provided"} | 
                          Scheduled: {(entry.appointment.start_time || entry.appointment.appointment_time || "").slice(0, 5) || "Time not set"}
                        </p>
                        {entry.appointment.reason && (
                          <p className="text-sm text-muted-foreground">
                            Reason: {entry.appointment.reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Checked in at {format(new Date(entry.checked_in_at), "h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isBeingCalled ? (
                        <>
                          <Badge className="bg-blue-100 text-blue-800">In Consultation</Badge>
                          <Button
                            size="sm"
                            onClick={() => handleCompleteConsultation(entry)}
                            disabled={actionLoading === entry.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleCallPatient(entry)}
                            disabled={actionLoading === entry.id}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Call Patient
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleNoShow(entry)}
                            disabled={actionLoading === entry.id}
                          >
                            No Show
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No patients in queue</p>
            <p className="text-sm text-muted-foreground">
              Patients will appear here when they check in
            </p>
          </CardContent>
        </Card>
      )}

      {/* Queue Management Info */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Call Patient</p>
              <p className="text-sm text-muted-foreground">
                Click to notify the patient that it&apos;s their turn. The appointment status will change to &quot;In Progress&quot;.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Complete</p>
              <p className="text-sm text-muted-foreground">
                Mark the consultation as complete. The patient will be removed from the queue.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-medium">No Show</p>
              <p className="text-sm text-muted-foreground">
                Mark the patient as a no-show if they don&apos;t respond when called.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
