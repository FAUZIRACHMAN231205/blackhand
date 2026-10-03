/**
 * @jest-environment node
 */
import crypto from 'node:crypto'

jest.mock('server-only', () => ({}))

import {
  verifyNotificationSignature,
  mapTransactionStatus,
  formatMidtransTime,
  buildSnapPayload,
  orderKind,
} from '@/app/lib/midtrans'
import { validatePricing, formatIdr, MIN_PRICE_IDR } from '@/app/lib/categories'

const SERVER_KEY = 'SB-Mid-server-TEST-ONLY'

function signed(orderId: string, statusCode: string, grossAmount: string, key = SERVER_KEY) {
  return {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${key}`)
      .digest('hex'),
  }
}

describe('verifyNotificationSignature', () => {
  const originalKey = process.env.MIDTRANS_SERVER_KEY

  beforeEach(() => {
    process.env.MIDTRANS_SERVER_KEY = SERVER_KEY
  })
  afterAll(() => {
    process.env.MIDTRANS_SERVER_KEY = originalKey
  })

  it('accepts a notification signed with our server key', () => {
    expect(verifyNotificationSignature(signed('BH-1', '200', '15000.00'))).toBe(true)
  })

  it('rejects a notification whose amount was changed after signing', () => {
    const n = { ...signed('BH-1', '200', '15000.00'), gross_amount: '1000.00' }
    expect(verifyNotificationSignature(n)).toBe(false)
  })

  it('rejects a notification signed with someone else’s key', () => {
    expect(verifyNotificationSignature(signed('BH-1', '200', '15000.00', 'attacker-key'))).toBe(false)
  })

  it('rejects a signature of the wrong length without throwing', () => {
    const n = { ...signed('BH-1', '200', '15000.00'), signature_key: 'abc' }
    expect(verifyNotificationSignature(n)).toBe(false)
  })

  it('rejects a notification with fields missing', () => {
    const { signature_key, ...unsigned } = signed('BH-1', '200', '15000.00')
    expect(signature_key).toBeTruthy()
    expect(verifyNotificationSignature(unsigned)).toBe(false)
  })

  it('fails closed when no server key is configured', () => {
    delete process.env.MIDTRANS_SERVER_KEY
    // Without the guard, a missing key would be hashed as "" or "undefined" —
    // values an attacker can sign with just as easily as we can.
    expect(verifyNotificationSignature(signed('BH-1', '200', '15000.00', ''))).toBe(false)
    expect(verifyNotificationSignature(signed('BH-1', '200', '15000.00', 'undefined'))).toBe(false)
  })
})

describe('mapTransactionStatus', () => {
  it.each([
    ['settlement', undefined, 'paid'],
    ['capture', 'accept', 'paid'],
    // A card capture still under fraud review is not money in the bank yet.
    ['capture', 'challenge', 'pending'],
    ['pending', undefined, 'pending'],
    ['deny', undefined, 'failed'],
    ['cancel', undefined, 'cancelled'],
    ['expire', undefined, 'expired'],
    ['refund', undefined, 'refunded'],
    ['partial_refund', undefined, 'refunded'],
    ['something_new', undefined, 'pending'],
    [undefined, undefined, 'pending'],
  ])('%s (fraud: %s) → %s', (status, fraud, expected) => {
    expect(mapTransactionStatus(status, fraud)).toBe(expected)
  })
})

describe('formatMidtransTime', () => {
  it('writes the time in Western Indonesian Time with Midtrans’ format', () => {
    expect(formatMidtransTime(new Date('2026-09-30T17:05:09Z'))).toBe('2026-10-01 00:05:09 +0700')
  })
})

describe('buildSnapPayload', () => {
  const startedAt = new Date('2026-09-30T08:00:00Z')

  it('charges the sum of every line and pins the deadline to when the order opened', () => {
    const payload = buildSnapPayload({
      orderId: 'BHM-1',
      items: [
        { id: 'p1', price: 75000, quantity: 2, name: 'Tote Bag' },
        { id: 'SHIPPING', price: 20000, quantity: 1, name: 'Ongkos kirim' },
      ],
      customerEmail: 'buyer@example.com',
      startedAt,
      payMinutes: 30,
    })

    expect(payload.transaction_details).toEqual({ order_id: 'BHM-1', gross_amount: 170000 })
    // Without an explicit start, Midtrans would start the clock when the buyer
    // picks a payment method — possibly long after our reservation began.
    expect(payload.expiry).toEqual({ start_time: '2026-09-30 15:00:00 +0700', unit: 'minutes', duration: 30 })
  })

  it('trims long item names to Midtrans’ 50-character limit', () => {
    const payload = buildSnapPayload({
      orderId: 'BH-1',
      items: [{ id: 'w1', price: 15000, quantity: 1, name: 'x'.repeat(80) }],
      customerEmail: 'buyer@example.com',
      startedAt,
      payMinutes: 30,
    })
    expect(payload.item_details[0].name).toHaveLength(50)
  })

  it('includes a shipping address only for physical goods', () => {
    const base = {
      orderId: 'BHM-2',
      items: [{ id: 'p1', price: 75000, quantity: 1, name: 'Tote Bag' }],
      customerEmail: 'buyer@example.com',
      startedAt,
      payMinutes: 30,
    }
    expect(buildSnapPayload(base).customer_details).not.toHaveProperty('shipping_address')

    const shipped = buildSnapPayload({
      ...base,
      shipping: { name: 'Fauzi', phone: '0812', address: 'Jl. Kenanga 12', city: 'Karawang', postalCode: '41361' },
    })
    expect(shipped.customer_details).toMatchObject({
      phone: '0812',
      shipping_address: { city: 'Karawang', postal_code: '41361', country_code: 'IDN' },
    })
  })
})

describe('orderKind', () => {
  it('tells artwork and merchandise orders apart by prefix', () => {
    expect(orderKind('BH-123')).toBe('work')
    expect(orderKind('BHM-123')).toBe('product')
    expect(orderKind('XX-123')).toBeNull()
    expect(orderKind(undefined)).toBeNull()
  })
})

describe('validatePricing', () => {
  it('allows an album with no price while it is not for sale', () => {
    expect(validatePricing(null, false)).toBeNull()
  })

  it('requires a price before an album can be sold', () => {
    expect(validatePricing(null, true)).toMatch(/required/)
  })

  it.each([12.5, -1, '15000'])('rejects %p as a price', (price) => {
    expect(validatePricing(price, false)).toMatch(/whole number/)
  })

  it('refuses to sell below the minimum price', () => {
    expect(validatePricing(MIN_PRICE_IDR - 1, true)).toMatch(/at least/)
    expect(validatePricing(MIN_PRICE_IDR, true)).toBeNull()
  })

  it('formats rupiah with Indonesian thousands separators', () => {
    expect(formatIdr(15000)).toBe('Rp 15.000')
  })
})
