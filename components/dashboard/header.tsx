'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import {
  HeartPulse,
  Menu,
  LogOut,
  Settings,
  User,
  LayoutDashboard,
  Calendar,
  Clock,
  FileText,
  FileCheck,
  MessageSquare,
  Users,
  ClipboardList,
  BarChart3,
} from 'lucide-react'

interface HeaderProps {
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

export function DashboardHeader({ profile, avatarUrl }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const getNavItems = () => {
    switch (profile.role) {
      case 'admin':
        return adminNavItems
      case 'doctor':
      case 'nurse':
        return providerNavItems
      default:
        return studentNavItems
    }
  }

  const navItems = getNavItems()

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Mobile Menu */}
        <div className="lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
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
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
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

                {/* Settings */}
                <div className="px-3 py-4 border-t">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setMobileMenuOpen(false)}
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
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-primary" />
          <span className="font-bold">CCA</span>
        </div>

        {/* Desktop - Empty space for left alignment */}
        <div className="hidden lg:block" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="w-8 h-8 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-primary">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </span>
                )}
              </div>
              <span className="hidden md:inline-block">
                {profile.first_name} {profile.last_name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
