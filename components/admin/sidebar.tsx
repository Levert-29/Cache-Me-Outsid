"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  Calendar,
  Clock,
  FileText,
  Home,
  Megaphone,
  MessageSquare,
  Settings,
  Shield,
  Users,
} from "lucide-react"
import type { Profile } from "@/lib/types"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "All Users", href: "/admin/users", icon: Users },
  { name: "All Appointments", href: "/admin/appointments", icon: Calendar },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Clinic Hours", href: "/admin/clinic-hours", icon: Clock },
  { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
  { name: "Feedback", href: "/admin/feedback", icon: MessageSquare },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <span className="font-semibold text-sidebar-foreground">CCA Admin</span>
          <p className="text-xs text-sidebar-foreground/60">System Administration</p>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {profile.first_name?.[0]}
            {profile.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
