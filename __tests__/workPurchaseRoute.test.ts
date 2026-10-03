/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('server-only', () => ({}))

const requireUser = jest.fn()
const hasPurchased = jest.fn()
const findResumableWorkCheckout = jest.fn()
const createSnapTransaction = jest.fn()
const rpc = jest.fn()
const updates: Record<string, unknown>[] = []

// The work row the route reads first, and what a re-read after a lost claim returns.
let work: Record<string, unknown> | null
let reread: Record<string, unknown> | null
let workReads = 0

jest.mock('@/app/lib/apiAuth', () => ({ requireUser: () => requireUser() }))
jest.mock('@/app/lib/orders', () => ({
  hasPurchased: (...a: unknown[]) => hasPurchased(...a),
  findResumableWorkCheckout: (...a: unknown[]) => findResumableWorkCheckout(...a),
}))
jest.mock('@/app/lib/midtrans', () => ({
  ...jest.requireActual('@/app/lib/midtrans'),
  isMidtransConfigured: () => true,
  createSnapTransaction: (...a: unknown[]) => createSnapTransaction(...a),
}))
jest.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    rpc: (...a: unknown[]) => rpc(...a),
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        update: (u: Record<string, unknown>) => (updates.push(u), q),
        maybeSingle: async () => ({ data: workReads++ === 0 ? work : reread }),
        then: (resolve: (v: unknown) => void) => resolve({ error: null }),
      }
      return q
    },
  },
}))

import { POST } from '@/app/api/works/[id]/purchase/route'

const buy = () =>
  POST(new NextRequest('http://localhost/api/works/w1/purchase', { method: 'POST' }), {
    params: Promise.resolve({ id: 'w1' }),
  })

const ORDER = {
  id: 'o1',
  amount_idr: 15000,
  work_title: 'Zidan Anyun',
  created_at: '2026-09-30T08:00:00.000Z',
  expires_at: '2026-09-30T08:35:00.000Z',
}

describe('POST /api/works/[id]/purchase', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    updates.length = 0
    workReads = 0
    requireUser.mockResolvedValue({ user: { id: 'buyer', email: 'buyer@example.com', full_name: 'Buyer' } })
    work = { id: 'w1', title: 'Zidan Anyun', price_idr: 15000, is_for_sale: true, is_published: true, sold_at: null, reserved_until: null }
    reread = null
    findResumableWorkCheckout.mockResolvedValue(null)
    rpc.mockResolvedValue({ data: [ORDER], error: null })
    createSnapTransaction.mockResolvedValue({ token: 'snap-token', redirectUrl: 'https://snap' })
  })

  it('reserves the work and opens a payment deadline counted from the order', async () => {
    const res = await buy()

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ orderId: 'o1', token: 'snap-token' })
    expect(rpc).toHaveBeenCalledWith(
      'claim_work_for_checkout',
      expect.objectContaining({ p_work_id: 'w1', p_user_id: 'buyer', p_pay_minutes: 30, p_grace_minutes: 5 })
    )
    expect(createSnapTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        startedAt: new Date(ORDER.created_at),
        payMinutes: 30,
        items: [{ id: 'w1', price: 15000, quantity: 1, name: 'Zidan Anyun' }],
      })
    )
    expect(updates).toContainEqual({ snap_token: 'snap-token' })
  })

  it('refuses a sold work to anyone but its owner', async () => {
    work = { ...work, sold_at: '2026-09-29T00:00:00Z' }
    hasPurchased.mockResolvedValue(false)

    const res = await buy()

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/terjual/)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('tells the owner they already have it', async () => {
    work = { ...work, sold_at: '2026-09-29T00:00:00Z' }
    hasPurchased.mockResolvedValue(true)

    expect((await (await buy()).json()).error).toMatch(/sudah memiliki/)
  })

  it('reopens the buyer’s own unfinished checkout instead of starting another', async () => {
    findResumableWorkCheckout.mockResolvedValue({ orderId: 'o0', token: 'old-token', expiresAt: 'x' })

    const body = await (await buy()).json()

    expect(body).toMatchObject({ orderId: 'o0', token: 'old-token', resumed: true })
    expect(rpc).not.toHaveBeenCalled()
    expect(createSnapTransaction).not.toHaveBeenCalled()
  })

  it('turns a second buyer away while someone else is paying', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    reread = { sold_at: null, reserved_until: new Date(Date.now() + 10 * 60_000).toISOString() }

    const res = await buy()
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toMatch(/proses pembelian/)
    expect(body.reservedUntil).toBe(reread.reserved_until)
    expect(createSnapTransaction).not.toHaveBeenCalled()
  })

  it('reports a sale that happened between reading and claiming', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    reread = { sold_at: '2026-09-30T08:00:00Z', reserved_until: null }

    expect((await (await buy()).json()).error).toMatch(/terjual/)
  })

  it('refuses a work that is not for sale', async () => {
    work = { ...work, is_for_sale: false }
    expect((await buy()).status).toBe(400)
  })

  it('frees the work again when Midtrans will not open the transaction', async () => {
    createSnapTransaction.mockRejectedValue(new Error('down'))

    const res = await buy()

    expect(res.status).toBe(502)
    expect(rpc).toHaveBeenLastCalledWith(
      'apply_work_order_notification',
      expect.objectContaining({ p_order_id: 'o1', p_status: 'failed' })
    )
  })
})
