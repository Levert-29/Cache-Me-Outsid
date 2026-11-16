"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Calendar,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Menu,
  Pill,
  Settings,
  Stethoscope,
  User,
  Users,
} from "lucide-react"
import type { Profile } from "@/lib/types"

const navigation = [
  { name: "Dashboard", href: "/provider", icon: Home },
  { name: "Today's Schedule", href: "/provider/availability", icon: Calendar },
  { name: "Patient Queue", href: "/provider/queue", icon: Users },
  { name: "All Appointments", href: "/provider/appointments", icon: ClipboardList },
  { name: "Issue Prescription", href: "/provider/prescriptions/new", icon: Pill },
  { name: "Issue Leave Note", href: "/provider/leave-notes/new", icon: FileText },
  { name: "My Schedule", href: "/provider/availability", icon: Settings },
]

export function ProviderHeader({ profile, avatarUrl }: { profile: Profile; avatarUrl?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const currentPage = navigation.find((item) => item.href === pathname)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="font-semibold">CCA Provider</span>
          </div>
          <nav className="space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Page Title */}
      <h1 className="text-lg font-semibold md:text-xl">
        {currentPage?.name || "Provider Portal"}
      </h1>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <>
                  {profile.first_name?.[0]}
                  {profile.last_name?.[0]}
                </>
              )}
            </div>
            <span className="hidden sm:inline">
              Dr. {profile.first_name} {profile.last_name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div>
              <p className="font-medium">
{profile.role === "nurse" || profile.specialization?.toLowerCase().includes("nurs") ? "Nurse" : "Dr."} {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/provider/profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/provider/availability">
              <Settings className="mr-2 h-4 w-4" />
              Schedule Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
