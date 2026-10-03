/**
 * @jest-environment node
 */
import crypto from 'node:crypto'
import { NextRequest } from 'next/server'

jest.mock('server-only', () => ({}))

const rpc = jest.fn()
const tablesRead: string[] = []
let orderRow: Record<string, unknown> | null

jest.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    rpc: (...a: unknown[]) => rpc(...a),
    from: (table: string) => {
      tablesRead.push(table)
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: orderRow }),
      }
      return q
    },
  },
}))

import { POST } from '@/app/api/payments/midtrans/webhook/route'

const SERVER_KEY = 'SB-Mid-server-TEST-ONLY'

function notify(fields: { order_id: string; gross_amount: string; transaction_status: string; status_code?: string }, key = SERVER_KEY) {
  const status_code = fields.status_code ?? '200'
  const signature_key = crypto
    .createHash('sha512')
    .update(`${fields.order_id}${status_code}${fields.gross_amount}${key}`)
    .digest('hex')
  const body = { ...fields, status_code, signature_key, transaction_id: 'tx-1', payment_type: 'qris' }
  return POST(
    new NextRequest('http://localhost/api/payments/midtrans/webhook', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/payments/midtrans/webhook', () => {
  const originalKey = process.env.MIDTRANS_SERVER_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    tablesRead.length = 0
    process.env.MIDTRANS_SERVER_KEY = SERVER_KEY
    rpc.mockResolvedValue({ data: 'paid', error: null })
  })
  afterAll(() => {
    process.env.MIDTRANS_SERVER_KEY = originalKey
  })

  it('applies a paid artwork notification through the atomic sale function', async () => {
    orderRow = { id: 'o1', amount_idr: 15000 }

    const res = await notify({ order_id: 'BH-abc', gross_amount: '15000.00', transaction_status: 'settlement' })

    expect(res.status).toBe(200)
    expect(tablesRead).toEqual(['orders'])
    expect(rpc).toHaveBeenCalledWith(
      'apply_work_order_notification',
      expect.objectContaining({ p_order_id: 'o1', p_status: 'paid', p_transaction_id: 'tx-1', p_payment_type: 'qris' })
    )
  })

  it('routes merchandise orders to their own table and function, checking the total', async () => {
    orderRow = { id: 'm1', total_idr: 170000 }

    await notify({ order_id: 'BHM-xyz', gross_amount: '170000.00', transaction_status: 'expire' })

    expect(tablesRead).toEqual(['product_orders'])
    expect(rpc).toHaveBeenCalledWith(
      'apply_product_order_notification',
      expect.objectContaining({ p_order_id: 'm1', p_status: 'expired' })
    )
  })

  it('never applies a notification whose amount differs from what we charged', async () => {
    orderRow = { id: 'o1', amount_idr: 15000 }

    const res = await notify({ order_id: 'BH-abc', gross_amount: '1000.00', transaction_status: 'settlement' })

    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects a forged notification before reading anything', async () => {
    orderRow = { id: 'o1', amount_idr: 15000 }

    const res = await notify({ order_id: 'BH-abc', gross_amount: '15000.00', transaction_status: 'settlement' }, 'attacker')

    expect(res.status).toBe(401)
    expect(tablesRead).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
  })

  it('ignores order ids that are not ours', async () => {
    const res = await notify({ order_id: 'OTHER-1', gross_amount: '15000.00', transaction_status: 'settlement' })

    expect(res.status).toBe(404)
    expect(tablesRead).toEqual([])
  })

  it('reports an unknown order', async () => {
    orderRow = null
    expect((await notify({ order_id: 'BH-missing', gross_amount: '1.00', transaction_status: 'settlement' })).status).toBe(404)
  })

  it('surfaces what the database decided, e.g. a payment for an already-sold work', async () => {
    orderRow = { id: 'o2', amount_idr: 15000 }
    rpc.mockResolvedValue({ data: 'needs_refund', error: null })
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const body = await (await notify({ order_id: 'BH-late', gross_amount: '15000.00', transaction_status: 'settlement' })).json()

    expect(body).toMatchObject({ received: true, status: 'paid', outcome: 'needs_refund' })
  })

  it('asks Midtrans to retry when the update fails', async () => {
    orderRow = { id: 'o1', amount_idr: 15000 }
    rpc.mockResolvedValue({ data: null, error: { message: 'db down' } })
    jest.spyOn(console, 'error').mockImplementation(() => {})

    expect((await notify({ order_id: 'BH-abc', gross_amount: '15000.00', transaction_status: 'settlement' })).status).toBe(500)
  })
})
