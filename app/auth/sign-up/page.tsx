'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { HeartPulse, AlertCircle } from 'lucide-react'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    role: 'student' as 'student' | 'doctor' | 'nurse',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    studentNumber: '',
    gender: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [router] = [useRouter()]
  const supabase = createClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Validation
    if (formData.role === 'student' && !formData.studentNumber.trim()) {
      setError('Student number is required')
      setIsLoading(false)
      return
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required')
      setIsLoading(false)
      return
    }

    if (!formData.gender) {
      setError('Please select a gender')
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    }

    try {
      // The profiles table uses the healthcare_professional enum value;
      // keep the selected nurse role in auth metadata for nurse-specific UI.
      const databaseRole = formData.role === 'nurse' || formData.role === 'doctor'
        ? 'healthcare_professional'
        : formData.role
      const authRole = formData.role

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? 
            `${window.location.origin}/auth/callback`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            student_number: formData.studentNumber.trim(),
            gender: formData.gender,
            role: authRole,
          },
        },
      })

      if (error) {
        console.log('[v0] Supabase signup error:', {
          message: error.message,
          code: error.code,
          status: error.status,
          name: error.name,
        })
        const details = [error.code, error.status].filter(Boolean).join(' · ')
        setError(details ? `${error.message} (${details})` : error.message)
        return
      }

      if (signUpData.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          student_number: formData.studentNumber.trim() || null,
          gender: formData.gender,
          role: databaseRole,
          is_verified: false,
        }, { onConflict: 'id' })

        if (profileError) {
          console.log('[v0] Profile creation error:', profileError)
          const isGenderSchemaMismatch = profileError.message.toLowerCase().includes("gender") && profileError.message.toLowerCase().includes('schema cache')

          if (isGenderSchemaMismatch) {
            const { error: fallbackError } = await supabase.from('profiles').upsert({
              id: signUpData.user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
                phone: formData.phone,
              student_number: formData.studentNumber.trim() || null,
              role: databaseRole,
              is_verified: false,
            }, { onConflict: 'id' })

            if (fallbackError) {
              setError(`Account created, but profile setup failed: ${fallbackError.message}`)
              return
            }
          } else {
            setError(`Account created, but profile setup failed: ${profileError.message}`)
            return
          }
        }
      }

      router.push(formData.role === 'student' ? '/dashboard' : '/provider')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <HeartPulse className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription className="text-base mt-1">
              Register for Campus Clinic appointments
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="role">Account type</FieldLabel>
                <select id="role" name="role" value={formData.role} onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as typeof prev.role }))} disabled={isLoading} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="student">Student</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Clinic staff / Nurse</option>
                </select>
                <p className="text-xs text-muted-foreground">Doctor and staff accounts require clinic verification before accessing provider tools.</p>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="email">{formData.role === 'student' ? 'Student email' : 'Email Address'}</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={formData.role === 'student' ? 'john.doe@university.edu' : ''}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </Field>

              {formData.role === 'student' && (
                <Field>
                  <FieldLabel htmlFor="studentNumber">Student Number</FieldLabel>
                  <Input
                    id="studentNumber"
                    name="studentNumber"
                    type="text"
                    placeholder="e.g. STU-2026-001"
                    value={formData.studentNumber}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="gender">Gender</FieldLabel>
                <select id="gender" name="gender" value={formData.gender} onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))} required disabled={isLoading} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="" disabled>Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </Field>
            </FieldGroup>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
