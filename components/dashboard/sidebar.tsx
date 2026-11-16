'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import {
  HeartPulse,
  LayoutDashboard,
  Calendar,
  Clock,
  FileText,
  FileCheck,
  MessageSquare,
  Settings,
  Users,
  ClipboardList,
  BarChart3,
} from 'lucide-react'

interface SidebarProps {
  profile: Profile
  avatarUrl?: string | null
}

const studentNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/appointments', label: 'My Appointments', icon: Calendar },
  { href: '/dashboard/book', label: 'Book Appointment', icon: Clock },
  { href: '/dashboard/prescriptions', label: 'Prescriptions', icon: FileText },
  { href: '/dashboard/leave-notes', label: 'Leave Notes', icon: FileCheck },
  { href: '/dashboard/feedback', label: 'Give Feedback', icon: MessageSquare },
]

const providerNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/provider/availability', label: 'My Schedule', icon: Calendar },
  { href: '/provider/queue', label: 'Patient Queue', icon: Users },
  { href: '/provider/patients', label: 'Patient Records', icon: ClipboardList },
]

const adminNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/admin/appointments', label: 'All Appointments', icon: Calendar },
  { href: '/dashboard/admin/users', label: 'Manage Users', icon: Users },
  { href: '/dashboard/admin/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/dashboard/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

export function DashboardSidebar({ profile, avatarUrl }: SidebarProps) {
  const pathname = usePathname()

  const getNavItems = () => {
    switch (profile.role) {
      case 'admin':
        return adminNavItems
      case 'healthcare_professional':
      case 'doctor':
      case 'nurse':
        return providerNavItems
      default:
        return studentNavItems
    }
  }

  const navItems = getNavItems()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow border-r bg-card">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 h-16 border-b">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="font-bold text-lg">CCA</span>
              <p className="text-xs text-muted-foreground capitalize">{profile.role} Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Settings Link */}
          <div className="px-3 py-4 border-t">
            <Link
              href="/dashboard/settings"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === '/dashboard/settings'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </div>

          {/* User Info */}
          <div className="px-4 py-4 border-t bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-primary">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile.student_number || profile.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
