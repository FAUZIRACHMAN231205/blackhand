/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('server-only', () => ({}))

const getSession = jest.fn()
const hasPurchased = jest.fn()
const signOriginalUrl = jest.fn()
jest.mock('@/app/lib/session', () => ({ getSession: () => getSession() }))
jest.mock('@/app/lib/orders', () => ({ hasPurchased: (...a: unknown[]) => hasPurchased(...a) }))
jest.mock('@/app/lib/storage', () => ({ signOriginalUrl: (...a: unknown[]) => signOriginalUrl(...a) }))

// work_images as the route sees it: image i1 belongs to album w1, i9 to w2.
const IMAGES = [
  { id: 'i1', work_id: 'w1', original_path: 'works/w1/i1.jpeg' },
  { id: 'i9', work_id: 'w2', original_path: 'works/w2/i9.jpeg' },
]
jest.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => {
      const filters: Record<string, string> = {}
      const query = {
        select: () => query,
        eq: (col: string, val: string) => ((filters[col] = val), query),
        maybeSingle: async () => ({
          data: IMAGES.find((r) => r.id === filters.id && r.work_id === filters.work_id) ?? null,
        }),
      }
      return query
    },
  },
}))

import { GET } from '@/app/api/works/[id]/images/[imageId]/route'

function request(id: string, imageId: string) {
  return GET(new NextRequest(`http://localhost/api/works/${id}/images/${imageId}`), {
    params: Promise.resolve({ id, imageId }),
  })
}

describe('GET /api/works/[id]/images/[imageId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getSession.mockResolvedValue({ id: 'buyer' })
    hasPurchased.mockResolvedValue(true)
    let n = 0
    signOriginalUrl.mockImplementation(async () => `https://storage.example/signed?token=${++n}`)
  })

  it('redirects the owner to a freshly signed URL', async () => {
    const res = await request('w1', 'i1')

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://storage.example/signed?token=1')
    expect(signOriginalUrl).toHaveBeenCalledWith('works/w1/i1.jpeg', 300)
    expect(hasPurchased).toHaveBeenCalledWith('buyer', 'w1')
  })

  it('signs anew on every load, so the address itself never goes stale', async () => {
    const first = await request('w1', 'i1')
    const second = await request('w1', 'i1')

    expect(first.headers.get('location')).not.toBe(second.headers.get('location'))
    expect(signOriginalUrl).toHaveBeenCalledTimes(2)
  })

  it('lets the browser reuse the redirect only while its target is still valid', async () => {
    const res = await request('w1', 'i1')
    const maxAge = Number(res.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1])

    expect(res.headers.get('cache-control')).toMatch(/^private/)
    expect(maxAge).toBeGreaterThan(0)
    expect(maxAge).toBeLessThan(300)
    expect(res.headers.get('vary')).toBe('Cookie')
  })

  it('refuses anonymous visitors without revealing anything', async () => {
    getSession.mockResolvedValue(null)

    const res = await request('w1', 'i1')

    expect(res.status).toBe(404)
    expect(signOriginalUrl).not.toHaveBeenCalled()
  })

  it('refuses signed-in visitors who have not bought the album', async () => {
    hasPurchased.mockResolvedValue(false)

    expect((await request('w1', 'i1')).status).toBe(404)
    expect(signOriginalUrl).not.toHaveBeenCalled()
  })

  it('refuses an image from a different album than the one owned', async () => {
    expect((await request('w1', 'i9')).status).toBe(404)
    expect(signOriginalUrl).not.toHaveBeenCalled()
  })

  it('reports a storage failure instead of redirecting nowhere', async () => {
    signOriginalUrl.mockResolvedValue(null)

    expect((await request('w1', 'i1')).status).toBe(502)
  })
})
