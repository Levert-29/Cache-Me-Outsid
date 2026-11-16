"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Check, MessageSquare, Star } from "lucide-react"

interface FeedbackForm {
  rating: number
  waitTimeRating: number
  staffRating: number
  facilityRating: number
  comments: string
  suggestions: string
}

export default function FeedbackPage() {
  const [form, setForm] = useState<FeedbackForm>({
    rating: 0,
    waitTimeRating: 0,
    staffRating: 0,
    facilityRating: 0,
    comments: "",
    suggestions: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClient()

  const handleRatingChange = (field: keyof FeedbackForm, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (form.rating === 0) {
      alert("Please provide an overall rating")
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from("feedback").insert({
        rating: form.rating,
        wait_time_rating: form.waitTimeRating || null,
        staff_rating: form.staffRating || null,
        facility_rating: form.facilityRating || null,
        comments: form.comments || null,
        suggestions: form.suggestions || null,
        is_anonymous: true,
      })

      if (error) throw error

      setSubmitted(true)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      alert("Failed to submit feedback. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number
    onChange: (v: number) => void
    label: string
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`h-8 w-8 ${
                star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )

  if (submitted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Feedback</h1>
          <p className="text-muted-foreground">Help us improve our services</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Thank You for Your Feedback!</h2>
            <p className="mt-2 text-center text-muted-foreground max-w-md">
              Your feedback has been submitted anonymously. We appreciate your input and will use it
              to improve our services at the Campus Clinic.
            </p>
            <Button className="mt-6" onClick={() => setSubmitted(false)}>
              Submit Another Response
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-muted-foreground">
          Help us improve our services. Your feedback is anonymous.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Share Your Experience
          </CardTitle>
          <CardDescription>
            All responses are anonymous and help us provide better healthcare services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Rating */}
          <div className="p-4 rounded-lg bg-muted/50">
            <StarRating
              value={form.rating}
              onChange={(v) => handleRatingChange("rating", v)}
              label="Overall Experience *"
            />
          </div>

          {/* Category Ratings */}
          <div className="grid gap-6 sm:grid-cols-3">
            <StarRating
              value={form.waitTimeRating}
              onChange={(v) => handleRatingChange("waitTimeRating", v)}
              label="Wait Time"
            />
            <StarRating
              value={form.staffRating}
              onChange={(v) => handleRatingChange("staffRating", v)}
              label="Staff Friendliness"
            />
            <StarRating
              value={form.facilityRating}
              onChange={(v) => handleRatingChange("facilityRating", v)}
              label="Facility Cleanliness"
            />
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Tell us about your experience..."
              value={form.comments}
              onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))}
              rows={4}
            />
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <Label htmlFor="suggestions">Suggestions for Improvement (Optional)</Label>
            <Textarea
              id="suggestions"
              placeholder="How can we improve our services?"
              value={form.suggestions}
              onChange={(e) => setForm((prev) => ({ ...prev, suggestions: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4" />
            Your feedback will be submitted anonymously
          </div>

          <Button onClick={handleSubmit} disabled={submitting || form.rating === 0} className="w-full">
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
