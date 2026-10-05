/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('server-only', () => ({}))

const requireUser = jest.fn()
const expireStaleOrders = jest.fn()
const findResumableProductCheckout = jest.fn()
const createSnapTransaction = jest.fn()
const rpc = jest.fn()
let product: Record<string, unknown> | null

jest.mock('@/app/lib/apiAuth', () => ({ requireUser: () => requireUser() }))
jest.mock('@/app/lib/orders', () => ({
  expireStaleOrders: () => expireStaleOrders(),
  findResumableProductCheckout: (...a: unknown[]) => findResumableProductCheckout(...a),
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
        update: () => q,
        maybeSingle: async () => ({ data: product }),
        then: (resolve: (v: unknown) => void) => resolve({ error: null }),
      }
      return q
    },
  },
}))

import { POST } from '@/app/api/shop/products/[id]/checkout/route'

const SHIPPING = {
  recipient_name: 'Fauzi Rachman',
  recipient_phone: '081234567890',
  shipping_address: 'Jl. Kenanga No. 12, Telukjambe',
  shipping_city: 'Karawang',
  shipping_postal_code: '41361',
  notes: '',
}

const checkout = (body: Record<string, unknown>) =>
  POST(
    new NextRequest('http://localhost/api/shop/products/p1/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'p1' }) }
  )

const ORDER = {
  id: 'm1',
  product_id: 'p1',
  product_name: 'Tote Bag',
  unit_price_idr: 75000,
  quantity: 2,
  shipping_fee_idr: 20000,
  total_idr: 170000,
  created_at: '2026-09-30T08:00:00.000Z',
}

describe('POST /api/shop/products/[id]/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireUser.mockResolvedValue({ user: { id: 'buyer', email: 'buyer@example.com', full_name: 'Buyer' } })
    product = { id: 'p1', is_published: true }
    findResumableProductCheckout.mockResolvedValue(null)
    rpc.mockResolvedValue({ data: [ORDER], error: null })
    createSnapTransaction.mockResolvedValue({ token: 'snap-token', redirectUrl: 'https://snap' })
  })

  it('takes stock and charges product plus shipping as separate lines', async () => {
    const res = await checkout({ quantity: 2, ...SHIPPING })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ orderId: 'm1', token: 'snap-token', totalIdr: 170000 })
    // Stale checkouts are swept first, so returned stock counts.
    expect(expireStaleOrders).toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith(
      'create_product_order',
      expect.objectContaining({ p_product_id: 'p1', p_quantity: 2, p_shipping_city: 'Karawang' })
    )
    expect(createSnapTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          { id: 'p1', price: 75000, quantity: 2, name: 'Tote Bag' },
          { id: 'SHIPPING', price: 20000, quantity: 1, name: 'Ongkos kirim' },
        ],
        shipping: expect.objectContaining({ city: 'Karawang', postalCode: '41361' }),
      })
    )
  })

  it('reopens the same unpaid order instead of taking stock again', async () => {
    findResumableProductCheckout.mockResolvedValue({
      orderId: 'm0',
      token: 'old-token',
      expiresAt: 'x',
      totalIdr: 170000,
    })

    const res = await checkout({ quantity: 2, ...SHIPPING })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ orderId: 'm0', token: 'old-token', totalIdr: 170000, resumed: true })
    // Matched on the same buyer, product, quantity and address.
    expect(findResumableProductCheckout).toHaveBeenCalledWith(
      'buyer',
      'p1',
      2,
      expect.objectContaining({ shipping_city: 'Karawang', shipping_postal_code: '41361' })
    )
    expect(rpc).not.toHaveBeenCalled()
    expect(createSnapTransaction).not.toHaveBeenCalled()
  })

  it('looks for a resumable order only after sweeping lapsed ones', async () => {
    const calls: string[] = []
    expireStaleOrders.mockImplementation(async () => void calls.push('expire'))
    findResumableProductCheckout.mockImplementation(async () => (calls.push('find'), null))

    await checkout({ quantity: 2, ...SHIPPING })

    expect(calls).toEqual(['expire', 'find'])
  })

  it('leaves out the shipping line when shipping is free', async () => {
    rpc.mockResolvedValue({ data: [{ ...ORDER, shipping_fee_idr: 0, total_idr: 150000 }], error: null })

    await checkout({ quantity: 2, ...SHIPPING })

    expect(createSnapTransaction.mock.calls[0][0].items).toHaveLength(1)
  })

  it('says so when there is not enough stock', async () => {
    rpc.mockResolvedValue({ data: [], error: null })

    const res = await checkout({ quantity: 2, ...SHIPPING })

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Stok/)
    expect(createSnapTransaction).not.toHaveBeenCalled()
  })

  it('validates the address before touching stock', async () => {
    const res = await checkout({ quantity: 1, ...SHIPPING, shipping_postal_code: 'abc' })

    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range quantity', async () => {
    expect((await checkout({ quantity: 0, ...SHIPPING })).status).toBe(400)
    expect((await checkout({ quantity: 999, ...SHIPPING })).status).toBe(400)
  })

  it('does not sell an unpublished product', async () => {
    product = { id: 'p1', is_published: false }
    expect((await checkout({ quantity: 1, ...SHIPPING })).status).toBe(404)
  })

  it('returns the stock when Midtrans will not open the transaction', async () => {
    createSnapTransaction.mockRejectedValue(new Error('down'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const res = await checkout({ quantity: 2, ...SHIPPING })

    expect(res.status).toBe(502)
    expect(rpc).toHaveBeenLastCalledWith(
      'apply_product_order_notification',
      expect.objectContaining({ p_order_id: 'm1', p_status: 'failed' })
    )
  })

  it('requires a signed-in shopper', async () => {
    requireUser.mockResolvedValue({ error: Response.json({ error: 'Unauthorized' }, { status: 401 }) })
    expect((await checkout({ quantity: 1, ...SHIPPING })).status).toBe(401)
  })
})
