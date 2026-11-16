'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { HeartPulse, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountType, setAccountType] = useState<'student' | 'doctor' | 'nurse'>('student')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      const user = authData.user
      const session = authData.session

      if (!user || !session) {
        setError('Sign-in succeeded, but the session could not be saved. Please try again.')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const role = profile?.role ?? user.user_metadata?.role
      const expectedRole = accountType === 'student' ? 'student' : accountType

      const roleMatches = accountType === 'student'
        ? role === 'student'
        : role === accountType || (accountType === 'doctor' && role === 'healthcare_professional')

      if (!roleMatches) {
        await supabase.auth.signOut()
        setError(`This account is not registered as a ${expectedRole}.`)
        return
      }

      const destination = ['healthcare_professional', 'doctor', 'nurse'].includes(role)
        ? '/provider'
        : role === 'admin'
          ? '/admin'
          : '/dashboard'

      // Use a full navigation so the server reads the freshly written session cookie.
      window.location.assign(destination)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <HeartPulse className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-base mt-1">
              Sign in to Campus Clinic Appointment System
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <fieldset className="space-y-3" disabled={isLoading}>
              <legend className="text-sm font-medium">Account type</legend>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="account-type"
                    value="student"
                    checked={accountType === 'student'}
                    onChange={() => setAccountType('student')}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm font-medium">Student</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="account-type"
                    value="doctor"
                    checked={accountType === 'doctor'}
                    onChange={() => setAccountType('doctor')}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm font-medium">Doctor</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="account-type"
                    value="nurse"
                    checked={accountType === 'nurse'}
                    onChange={() => setAccountType('nurse')}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm font-medium">Nurse</span>
                </label>
              </div>
            </fieldset>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{accountType === 'student' ? 'Student Email' : 'Email Address'}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder={accountType === 'student' ? 'your.email@university.edu' : ''}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
            </FieldGroup>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
                Register here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
