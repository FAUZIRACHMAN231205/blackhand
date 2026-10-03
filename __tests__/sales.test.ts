import {
  publicSaleStatus,
  isReserved,
  paymentDeadline,
  PAYMENT_WINDOW_MINUTES,
} from '@/app/lib/sales'

const NOW = Date.parse('2026-09-30T08:00:00Z')
const inMinutes = (m: number) => new Date(NOW + m * 60_000).toISOString()

describe('publicSaleStatus', () => {
  const forSale = { is_for_sale: true, price_idr: 15000, sold_at: null, reserved_until: null }

  it('is available when for sale, unsold and unreserved', () => {
    expect(publicSaleStatus(forSale, NOW)).toBe('available')
  })

  it('is sold once a buyer has paid — even if still flagged for sale', () => {
    expect(publicSaleStatus({ ...forSale, sold_at: inMinutes(-60) }, NOW)).toBe('sold')
  })

  it('stays sold after the artist takes it off sale', () => {
    expect(publicSaleStatus({ ...forSale, is_for_sale: false, sold_at: inMinutes(-60) }, NOW)).toBe('sold')
  })

  it('is reserved while someone else is paying', () => {
    expect(publicSaleStatus({ ...forSale, reserved_until: inMinutes(10) }, NOW)).toBe('reserved')
  })

  it('is available again once the reservation lapses', () => {
    expect(publicSaleStatus({ ...forSale, reserved_until: inMinutes(-1) }, NOW)).toBe('available')
  })

  it('is not for sale without the flag or without a price', () => {
    expect(publicSaleStatus({ ...forSale, is_for_sale: false }, NOW)).toBe('not_for_sale')
    expect(publicSaleStatus({ ...forSale, price_idr: null }, NOW)).toBe('not_for_sale')
  })
})

describe('isReserved', () => {
  it('only counts a reservation that ends in the future', () => {
    expect(isReserved({ reserved_until: inMinutes(5) }, NOW)).toBe(true)
    expect(isReserved({ reserved_until: inMinutes(-5) }, NOW)).toBe(false)
    expect(isReserved({ reserved_until: null }, NOW)).toBe(false)
  })
})

describe('paymentDeadline', () => {
  it('is the payment window after the checkout opened', () => {
    const opened = '2026-09-30T08:00:00.000Z'
    expect(paymentDeadline(opened).getTime() - Date.parse(opened)).toBe(PAYMENT_WINDOW_MINUTES * 60_000)
  })
})
