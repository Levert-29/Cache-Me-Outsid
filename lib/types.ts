// User roles
export type UserRole = 'student' | 'healthcare_professional' | 'doctor' | 'nurse' | 'admin'

// Appointment status
export type AppointmentStatus = 'scheduled' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'

// Profile type
export interface Profile {
  id: string
  student_number: string | null
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  specialization: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
  email_updates?: boolean
  analytics_consent?: boolean
  profile_visibility?: 'private' | 'clinic'
}

// Symptom type
export interface Symptom {
  id: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
  created_at: string
}

// Appointment type
export interface Appointment {
  id: string
  student_id: string
  professional_id: string | null
  appointment_date: string
  start_time: string
  appointment_time?: string
  patient_id?: string
  doctor_id?: string | null
  status: AppointmentStatus
  reason: string | null
  notes: string | null
  is_follow_up: boolean
  parent_appointment_id: string | null
  estimated_duration_minutes: number
  actual_start_time: string | null
  actual_end_time: string | null
  created_at: string
  updated_at: string
  verification_code: string
  // Joined fields
  patient?: Profile
  doctor?: Profile
  symptoms?: AppointmentSymptom[]
}

// Appointment symptom junction
export interface AppointmentSymptom {
  id: string
  appointment_id: string
  symptom_id: string
  severity: number | null
  duration_days: number | null
  notes: string | null
  symptom?: Symptom
}

// Medication type for prescriptions
export interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

// Prescription type
export interface Prescription {
  id: string
  appointment_id: string
  patient_id: string
  doctor_id: string
  diagnosis: string
  medications: Medication[]
  instructions: string | null
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Profile
  doctor?: Profile
  appointment?: Appointment
}

// Leave note type
export interface LeaveNote {
  id: string
  appointment_id: string
  patient_id: string
  doctor_id: string
  leave_start_date: string
  leave_end_date: string
  reason: string
  recommendations: string | null
  reference_number: string
  created_at: string
  // Joined fields
  patient?: Profile
  doctor?: Profile
  appointment?: Appointment
}

// Time slot type
export interface TimeSlot {
  id: string
  doctor_id: string
  day_of_week: number // 0 = Sunday, 6 = Saturday
  start_time: string
  end_time: string
  slot_duration_minutes: number
  is_available: boolean
  created_at: string
  // Joined fields
  doctor?: Profile
}

// Queue type
export interface QueueEntry {
  id: string
  appointment_id: string
  position: number
  estimated_wait_minutes: number | null
  checked_in_at: string
  called_at: string | null
  is_active: boolean
  created_at: string
  // Joined fields
  appointment?: Appointment
}

// Feedback type
export interface Feedback {
  id: string
  appointment_id: string | null
  rating: number
  wait_time_rating: number | null
  staff_rating: number | null
  facility_rating: number | null
  comments: string | null
  suggestions: string | null
  is_anonymous: boolean
  created_at: string
}

// Email log type
export interface EmailLog {
  id: string
  recipient_id: string | null
  recipient_email: string
  email_type: string
  subject: string
  sent_at: string
  status: string
  appointment_id: string | null
  metadata: Record<string, unknown> | null
}

// Available time slot for booking
export interface AvailableSlot {
  doctor_id: string
  doctor_name: string
  doctor_specialization: string | null
  date: string
  time: string
  slot_duration_minutes: number
}
