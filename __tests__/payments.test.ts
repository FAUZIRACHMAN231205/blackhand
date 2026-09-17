/**
 * @jest-environment node
 */
import crypto from 'node:crypto'

jest.mock('server-only', () => ({}))

import { verifyNotificationSignature, mapTransactionStatus } from '@/app/lib/midtrans'
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
