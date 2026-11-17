import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

import { GET, POST } from '@/app/api/appointments/route'

describe('appointments API authentication', () => {
  beforeEach(() => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })
  })

  it('rejects appointment reads without an authenticated user', async () => {
    const response = await GET(new Request('http://localhost/api/appointments'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('rejects appointment creation without an authenticated user', async () => {
    const response = await POST(
      new Request('http://localhost/api/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ doctor_id: 'doctor-1' }),
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('rejects invalid appointment times without inserting an appointment', async () => {
    const profilesQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    const professionalsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'professional-1', user_id: 'doctor-1' },
        error: null,
      }),
    }
    const from = vi.fn((table: string) =>
      table === 'profiles' ? profilesQuery : professionalsQuery,
    )

    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'student-1', user_metadata: {} } },
        }),
      },
      from,
    })

    const response = await POST(
      new Request('http://localhost/api/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          doctor_id: 'doctor-1',
          appointment_date: '2026-11-18',
          appointment_time: '25:99',
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'A valid appointment time is required.',
    })
    expect(from).toHaveBeenCalledTimes(2)
  })
})
