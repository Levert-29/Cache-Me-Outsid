"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Eye, FileText, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { format, differenceInDays } from "date-fns"
import type { LeaveNote } from "@/lib/types"

export default function LeaveNotesPage() {
  const [leaveNotes, setLeaveNotes] = useState<LeaveNote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<LeaveNote | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  useEffect(() => {
    async function loadLeaveNotes() {
      try {
        const response = await fetch("/api/leave-notes", { cache: "no-store" })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || "Could not load leave notes")
        setLeaveNotes((result.leaveNotes ?? []) as LeaveNote[])
      } catch (error) {
        console.error("Error loading leave notes:", error)
      } finally {
        setLoading(false)
      }
    }

    loadLeaveNotes()
  }, [])

  const filteredNotes = leaveNotes.filter(
    (note) =>
      note.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.reference_number ?? `LN-${note.id.slice(0, 10).toUpperCase()}`).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDownload = (note: LeaveNote) => {
    const doctor = (note as any).doctor
    const patient = (note as any).patient
    const duration = differenceInDays(new Date(note.leave_end_date), new Date(note.leave_start_date)) + 1

    const content = `
CAMPUS CLINIC
MEDICAL LEAVE CERTIFICATE
===========================

Reference Number: ${note.reference_number}
Date Issued: ${format(new Date(note.created_at), "MMMM d, yyyy")}

TO WHOM IT MAY CONCERN

This is to certify that:

STUDENT INFORMATION
-------------------
Name: ${patient?.first_name} ${patient?.last_name}
Student Number: ${patient?.student_number || "N/A"}

Has been examined and found to be unfit for classes/work due to medical reasons.

MEDICAL LEAVE DETAILS
--------------------
Leave Period: ${format(new Date(note.leave_start_date), "MMMM d, yyyy")} to ${format(new Date(note.leave_end_date), "MMMM d, yyyy")}
Duration: ${duration} day${duration > 1 ? "s" : ""}

Reason: ${note.reason}

${note.recommendations ? `Recommendations: ${note.recommendations}` : ""}

CERTIFYING PHYSICIAN
--------------------
Dr. ${doctor?.first_name} ${doctor?.last_name}
${doctor?.specialization || "General Practice"}
Campus Clinic

===========================
This certificate is issued upon request for academic purposes.
For verification, please contact Campus Clinic with reference number: ${note.reference_number}
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `medical-leave-${note.reference_number}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
        <h1 className="text-2xl font-bold">Medical Leave Notes</h1>
        <p className="text-muted-foreground">
          Download medical leave certificates for your lecturers
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by reference number or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Leave Notes List */}
      {filteredNotes.length > 0 ? (
        <div className="space-y-4">
          {filteredNotes.map((note) => {
            const duration =
              differenceInDays(new Date(note.leave_end_date), new Date(note.leave_start_date)) + 1

            return (
              <Card key={note.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                        <FileText className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Medical Leave - {duration} Day{duration > 1 ? "s" : ""}
                        </CardTitle>
                        <CardDescription>
                          Ref: {note.reference_number} | Issued on{" "}
                          {format(new Date(note.created_at), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Leave Start</p>
                        <p className="font-medium">
                          {format(new Date(note.leave_start_date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Leave End</p>
                        <p className="font-medium">
                          {format(new Date(note.leave_end_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Reason</p>
                      <p className="text-sm">{note.reason}</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedNote(note)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(note)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
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
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {searchQuery ? "No leave notes found matching your search" : "No medical leave notes yet"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leave Note Detail Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Medical Leave Certificate</DialogTitle>
            <DialogDescription>
              Reference: {selectedNote?.reference_number}
            </DialogDescription>
          </DialogHeader>

          {selectedNote && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Student</p>
                <p className="font-medium">
                  {(selectedNote as any).patient?.first_name}{" "}
                  {(selectedNote as any).patient?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Student Number: {(selectedNote as any).patient?.student_number || "N/A"}
                </p>
              </div>

              {/* Leave Period */}
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Leave Period</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-medium">
                      {format(new Date(selectedNote.leave_start_date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-medium">
                      {format(new Date(selectedNote.leave_end_date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <p className="text-sm mt-2">
                  Duration:{" "}
                  <span className="font-medium">
                    {differenceInDays(
                      new Date(selectedNote.leave_end_date),
                      new Date(selectedNote.leave_start_date)
                    ) + 1}{" "}
                    days
                  </span>
                </p>
              </div>

              {/* Reason */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Reason for Leave</p>
                <p>{selectedNote.reason}</p>
              </div>

              {/* Recommendations */}
              {selectedNote.recommendations && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Doctor&apos;s Recommendations
                  </p>
                  <p className="text-sm">{selectedNote.recommendations}</p>
                </div>
              )}

              {/* Certifying Doctor */}
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Certifying Physician
                </p>
                <p className="font-medium">
                  Dr. {(selectedNote as any).doctor?.first_name}{" "}
                  {(selectedNote as any).doctor?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(selectedNote as any).doctor?.specialization || "General Practice"}
                </p>
              </div>

              <Button className="w-full" onClick={() => handleDownload(selectedNote)}>
                <Download className="h-4 w-4 mr-2" />
                Download Certificate
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
