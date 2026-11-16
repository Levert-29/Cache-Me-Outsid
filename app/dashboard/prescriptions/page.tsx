"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Eye, Pill, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import type { Prescription } from "@/lib/types"

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  notes?: string
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function loadPrescriptions() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const response = await fetch("/api/prescriptions", { cache: "no-store" })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || "Could not load prescriptions")

        setPrescriptions((result.prescriptions ?? []) as Prescription[])
      } catch (error) {
        console.error("[v0] Error loading prescriptions:", error)
        setLoadError(error instanceof Error ? error.message : "Could not load prescriptions")
      } finally {
        setLoading(false)
      }
    }

    loadPrescriptions()
  }, [supabase])

  const filteredPrescriptions = prescriptions.filter(
    (p) =>
      p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.medications as Medication[]).some((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  )

  const handleDownload = (prescription: Prescription) => {
    // Generate a simple text-based prescription that can be printed
    const medications = prescription.medications as Medication[]

    const content = `
CAMPUS CLINIC PRESCRIPTION
===========================

Date: ${format(new Date(prescription.created_at), "MMMM d, yyyy")}
Prescription ID: ${prescription.id.slice(0, 8).toUpperCase()}

PATIENT INFORMATION
-------------------
(Patient details from appointment)

PRESCRIBING PHYSICIAN
--------------------
Campus Clinic Healthcare Provider

DIAGNOSIS
---------
${prescription.diagnosis}

MEDICATIONS
-----------
${medications
  .map(
    (med, i) => `
${i + 1}. ${med.name}
   Dosage: ${med.dosage}
   Frequency: ${med.frequency}
   Duration: ${med.duration}
   ${med.notes ? `Notes: ${med.notes}` : ""}
`
  )
  .join("")}

SPECIAL INSTRUCTIONS
-------------------
${prescription.instructions || "None"}

Date: ${format(new Date(prescription.created_at), "MMMM d, yyyy")}
${prescription.valid_until ? `Valid Until: ${format(new Date(prescription.valid_until), "MMMM d, yyyy")}` : ""}

===========================
This is a digital prescription from Campus Clinic.
Please present this to your pharmacist.
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `prescription-${prescription.id.slice(0, 8)}.txt`
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
        <h1 className="text-2xl font-bold">My Prescriptions</h1>
        <p className="text-muted-foreground">View and download your digital prescriptions</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by diagnosis or medication..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loadError && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-sm text-destructive">
            {loadError}
          </CardContent>
        </Card>
      )}

      {/* Prescriptions List */}
      {filteredPrescriptions.length > 0 ? (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => {
            const medications = prescription.medications as Medication[]
            const isActive = !prescription.valid_until || new Date(prescription.valid_until) >= new Date()

            return (
              <Card key={prescription.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Pill className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{prescription.diagnosis}</CardTitle>
                        <CardDescription>
                          Prescribed by a Campus Clinic healthcare provider on{" "}
                          {format(new Date(prescription.created_at), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "Active" : "Expired"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Medications</p>
                      <div className="flex flex-wrap gap-2">
                        {medications.slice(0, 3).map((med, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm"
                          >
                            {med.name}
                          </span>
                        ))}
                        {medications.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm">
                            +{medications.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPrescription(prescription)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(prescription)}
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
            <Pill className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              {searchQuery ? "No prescriptions found matching your search" : "No prescriptions yet"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Prescription Detail Dialog */}
      <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>
              Prescription ID: {selectedPrescription?.id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-6">
              {/* Prescribing Doctor */}
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Prescribing Physician</p>
                <p className="font-medium">Campus Clinic healthcare provider</p>
              </div>

              {/* Diagnosis */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Diagnosis</p>
                <p className="font-medium">{selectedPrescription.diagnosis}</p>
              </div>

              {/* Medications */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Medications</p>
                <div className="space-y-3">
                  {(selectedPrescription.medications as Medication[]).map((med, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <p className="font-medium">{med.name}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Dosage: </span>
                          {med.dosage}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Frequency: </span>
                          {med.frequency}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration: </span>
                          {med.duration}
                        </div>
                      </div>
                      {med.notes && (
                        <p className="text-sm mt-2 text-muted-foreground">
                          Note: {med.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {selectedPrescription.instructions && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Special Instructions</p>
                  <p className="text-sm">{selectedPrescription.instructions}</p>
                </div>
              )}

              {/* Validity */}
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Created On</p>
                    <p className="font-medium">
                      {format(new Date(selectedPrescription.created_at), "MMMM d, yyyy")}
                    </p>
                  </div>
                  {selectedPrescription.valid_until && (
                    <div>
                      <p className="text-muted-foreground">Valid Until</p>
                      <p className="font-medium">
                        {format(new Date(selectedPrescription.valid_until), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => handleDownload(selectedPrescription)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Prescription
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
