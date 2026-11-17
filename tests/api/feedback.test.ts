import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { GET, POST } from '@/app/api/feedback/route'

describe('feedback API', () => {
  beforeEach(() => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })
  })

  it('rejects feedback with ratings outside the supported range', async () => {
    const response = await POST(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          rating: 6,
          wait_time_rating: 4,
          staff_rating: 4,
          facility_rating: 4,
          comments: '',
          suggestions: '',
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toHaveProperty('error')
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('rejects feedback reads without an authenticated user', async () => {
    const response = await GET()

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('rejects feedback text longer than the supported limit', async () => {
    const response = await POST(
      new Request('http://localhost/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          rating: 4,
          wait_time_rating: 4,
          staff_rating: 4,
          facility_rating: 4,
          comments: 'x'.repeat(2001),
          suggestions: '',
        }),
      }),
    )

    expect(response.status).toBe(400)
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
