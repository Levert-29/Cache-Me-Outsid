"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Star } from "lucide-react"
import { format } from "date-fns"

interface FeedbackEntry {
  id: string
  rating: number
  wait_time_rating: number | null
  staff_rating: number | null
  facility_rating: number | null
  comments: string | null
  suggestions: string | null
  created_at: string
}

interface FeedbackStats {
  total: number
  averageRating: number
  averageWaitTimeRating: number
  averageStaffRating: number
  averageFacilityRating: number
  ratingDistribution: { [key: number]: number }
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    averageRating: 0,
    averageWaitTimeRating: 0,
    averageStaffRating: 0,
    averageFacilityRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadFeedback() {
      try {
        const { data } = await supabase
          .from("feedback")
          .select("*")
          .order("created_at", { ascending: false })

        if (data) {
          setFeedback(data as FeedbackEntry[])

          // Calculate stats
          const total = data.length
          if (total > 0) {
            const avgRating = data.reduce((sum, f) => sum + f.rating, 0) / total
            const waitTimeRatings = data.filter((f) => f.wait_time_rating).map((f) => f.wait_time_rating!)
            const staffRatings = data.filter((f) => f.staff_rating).map((f) => f.staff_rating!)
            const facilityRatings = data.filter((f) => f.facility_rating).map((f) => f.facility_rating!)

            const avgWaitTime = waitTimeRatings.length > 0
              ? waitTimeRatings.reduce((sum, r) => sum + r, 0) / waitTimeRatings.length
              : 0
            const avgStaff = staffRatings.length > 0
              ? staffRatings.reduce((sum, r) => sum + r, 0) / staffRatings.length
              : 0
            const avgFacility = facilityRatings.length > 0
              ? facilityRatings.reduce((sum, r) => sum + r, 0) / facilityRatings.length
              : 0

            const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            data.forEach((f) => {
              distribution[f.rating] = (distribution[f.rating] || 0) + 1
            })

            setStats({
              total,
              averageRating: Math.round(avgRating * 10) / 10,
              averageWaitTimeRating: Math.round(avgWaitTime * 10) / 10,
              averageStaffRating: Math.round(avgStaff * 10) / 10,
              averageFacilityRating: Math.round(avgFacility * 10) / 10,
              ratingDistribution: distribution,
            })
          }
        }
      } catch (error) {
        console.error("Error loading feedback:", error)
      } finally {
        setLoading(false)
      }
    }

    loadFeedback()
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
        <h1 className="text-2xl font-bold">Student Feedback</h1>
        <p className="text-muted-foreground">Anonymous feedback from students</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{stats.averageRating || "N/A"}</span>
              <div className="flex">{renderStars(Math.round(stats.averageRating))}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {stats.total} reviews
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Wait Time Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.averageWaitTimeRating || "N/A"}</div>
            <div className="flex mt-1">{renderStars(Math.round(stats.averageWaitTimeRating))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Staff Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.averageStaffRating || "N/A"}</div>
            <div className="flex mt-1">{renderStars(Math.round(stats.averageStaffRating))}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Facility Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.averageFacilityRating || "N/A"}</div>
            <div className="flex mt-1">{renderStars(Math.round(stats.averageFacilityRating))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.ratingDistribution[star] || 0
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0

            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm">{star}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <Progress value={percentage} className="flex-1" />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {count} ({Math.round(percentage)}%)
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>All Feedback ({feedback.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {feedback.length > 0 ? (
            <div className="space-y-4">
              {feedback.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {renderStars(entry.rating)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {/* Category Ratings */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {entry.wait_time_rating && (
                      <Badge variant="outline" className="text-xs">
                        Wait Time: {entry.wait_time_rating}/5
                      </Badge>
                    )}
                    {entry.staff_rating && (
                      <Badge variant="outline" className="text-xs">
                        Staff: {entry.staff_rating}/5
                      </Badge>
                    )}
                    {entry.facility_rating && (
                      <Badge variant="outline" className="text-xs">
                        Facility: {entry.facility_rating}/5
                      </Badge>
                    )}
                  </div>

                  {entry.comments && (
                    <div className="mb-2">
                      <p className="text-sm font-medium">Comments:</p>
                      <p className="text-sm text-muted-foreground">{entry.comments}</p>
                    </div>
                  )}

                  {entry.suggestions && (
                    <div>
                      <p className="text-sm font-medium">Suggestions:</p>
                      <p className="text-sm text-muted-foreground">{entry.suggestions}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No feedback received yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
