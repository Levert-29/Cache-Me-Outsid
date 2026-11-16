"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Calendar,
  ClipboardList,
  FileText,
  Home,
  Pill,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react"
import type { Profile } from "@/lib/types"

const doctorNavigation = [
  { name: "Dashboard", href: "/provider", icon: Home },
  { name: "My Schedule", href: "/provider/availability", icon: Calendar },
  { name: "Patient Queue", href: "/provider/queue", icon: Users },
  { name: "Patient Records", href: "/provider/patients", icon: ClipboardList },
  { name: "All Appointments", href: "/provider/appointments", icon: ClipboardList },
  { name: "Issue Prescription", href: "/provider/prescriptions/new", icon: Pill },
  { name: "Issue Leave Note", href: "/provider/leave-notes/new", icon: FileText },
]

const nurseNavigation = [
  { name: "Dashboard", href: "/provider", icon: Home },
  { name: "My Schedule", href: "/provider/availability", icon: Calendar },
  { name: "Patient Queue", href: "/provider/queue", icon: Users },
  { name: "Patient Records", href: "/provider/patients", icon: ClipboardList },
  { name: "All Appointments", href: "/provider/appointments", icon: ClipboardList },
  { name: "Triage & Vitals", href: "/provider/triage", icon: Syringe },
]

export function ProviderSidebar({ profile, avatarUrl }: { profile: Profile; avatarUrl?: string | null }) {
  const pathname = usePathname()
  const isNurse = profile.role === "nurse" || profile.specialization?.toLowerCase().includes("nurs")
  const navigation = isNurse ? nurseNavigation : doctorNavigation
  const displayTitle = isNurse ? "Nurse" : "Dr."

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Stethoscope className="h-6 w-6 text-primary" />
        <div>
          <span className="font-semibold text-sidebar-foreground">CCA Provider</span>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{profile.role} Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <>
                {profile.first_name?.[0]}
                {profile.last_name?.[0]}
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {displayTitle} {profile.first_name} {profile.last_name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {profile.specialization || "General Practice"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
