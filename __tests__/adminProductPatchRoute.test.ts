/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('server-only', () => ({}))

const requireAdmin = jest.fn()
const updates: Record<string, unknown>[] = []
// What the product looks like in the database before the PATCH.
let stored: { price_idr: number; compare_at_price_idr: number | null }

jest.mock('@/app/lib/apiAuth', () => ({ requireAdmin: () => requireAdmin() }))
jest.mock('@/app/lib/storage', () => ({ removeProductImages: jest.fn() }))
jest.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => {
      let isUpdate = false
      const q = {
        select: () => q,
        eq: () => q,
        update: (u: Record<string, unknown>) => ((isUpdate = true), updates.push(u), q),
        maybeSingle: async () => ({ data: isUpdate ? { id: 'p1' } : stored, error: null }),
      }
      return q
    },
  },
}))

import { PATCH } from '@/app/api/admin/products/[id]/route'

const patch = (body: Record<string, unknown>) =>
  PATCH(
    new NextRequest('http://localhost/api/admin/products/p1', { method: 'PATCH', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: 'p1' }) }
  )

describe('PATCH /api/admin/products/[id] — sale price pair', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    updates.length = 0
    requireAdmin.mockResolvedValue({ user: { id: 'admin' } })
    stored = { price_idr: 75000, compare_at_price_idr: 100000 }
  })

  it('refuses raising the price above the stored compare-at price', async () => {
    const res = await patch({ price_idr: 120000 })

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/higher than the price/)
    expect(updates).toHaveLength(0)
  })

  it('refuses a compare-at price below the stored price', async () => {
    const res = await patch({ compare_at_price_idr: 50000 })

    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('allows a price change that keeps the discount real', async () => {
    const res = await patch({ price_idr: 90000 })

    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ price_idr: 90000 })
  })

  it('allows ending a sale by clearing the compare-at price', async () => {
    const res = await patch({ compare_at_price_idr: null })

    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ compare_at_price_idr: null })
  })

  it('checks a pair sent together without reading the stored one', async () => {
    expect((await patch({ price_idr: 80000, compare_at_price_idr: 70000 })).status).toBe(400)
    expect((await patch({ price_idr: 80000, compare_at_price_idr: 95000 })).status).toBe(200)
  })

  it('leaves products without a sale alone when only the price changes', async () => {
    stored = { price_idr: 75000, compare_at_price_idr: null }
    expect((await patch({ price_idr: 120000 })).status).toBe(200)
  })
})
