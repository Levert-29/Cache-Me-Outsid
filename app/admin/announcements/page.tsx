"use client"

import { useState } from "react"
import { Megaphone, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function AnnouncementsPage() { const [title, setTitle] = useState(""); const [message, setMessage] = useState(""); const [posted, setPosted] = useState(false); return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-2xl font-bold">Announcements</h1><p className="text-muted-foreground">Prepare notices for clinic users.</p></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />New announcement</CardTitle></CardHeader><CardContent className="space-y-4"><Input placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} /><Textarea placeholder="Write the announcement message..." value={message} onChange={(e) => setMessage(e.target.value)} /><Button disabled={!title.trim() || !message.trim()} onClick={() => { setPosted(true); setTitle(""); setMessage("") }}><Plus className="mr-2 h-4 w-4" />{posted ? "Announcement queued" : "Publish announcement"}</Button></CardContent></Card></div> }
