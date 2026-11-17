# Cache-Me-Outsid

Campus clinic appointment management application built with Next.js and Supabase.

## Automated tests

- `npm test` runs the Vitest suite once.
- `npm run test:watch` runs Vitest in watch mode.

The tests cover unauthenticated appointment and feedback API requests, feedback rating validation, and HTML escaping in appointment email templates. They do not require a live Supabase connection.

## Supabase configuration and schema notes

The application code expects `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Supabase clients. Routes using the service-role client also require server-only credentials (`SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, plus `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`). Keep credentials in the deployment environment, never in source control. No environment variables or Supabase integration were added as part of this work.

The code references tables including `profiles`, `healthcare_professionals`, `appointments`, `doctor_availability`, `queue`, `symptoms`, `prescriptions`, `medical_leave_notes`, and `feedback`, plus the `avatars` storage bucket. The appointment API writes `student_id`, `professional_id`, `appointment_date`, `start_time`, and `end_time`; other code and the TypeScript model still contain legacy patient/doctor/time aliases. This is a code-derived contract only: the target Supabase schema was not available for verification. No database migration was added or applied. Verify the live schema and settle the appointment field names before creating or applying a migration.
