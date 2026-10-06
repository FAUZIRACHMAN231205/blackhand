import {
  validateProductInput,
  validateSalePrice,
  discountPercent,
  isNewArrival,
  NEW_ARRIVAL_DAYS,
  validateShippingFee,
  validateQuantity,
  parseShippingDetails,
  allowedFulfillmentActions,
  orderStageLabel,
  MAX_ORDER_QUANTITY,
} from '@/app/lib/shop'
import { MIN_PRICE_IDR } from '@/app/lib/categories'

describe('validateProductInput', () => {
  const valid = { name: 'Tote Bag', description: 'Canvas', price_idr: 75000, stock: 10, is_published: true }

  it('accepts a complete product', () => {
    expect(validateProductInput(valid)).toBeNull()
  })

  it('requires a name on create', () => {
    expect(validateProductInput({ ...valid, name: '  ' })).toMatch(/name/i)
  })

  it('rejects fractional, string or too-small prices', () => {
    expect(validateProductInput({ ...valid, price_idr: 12.5 })).toMatch(/whole number/)
    expect(validateProductInput({ ...valid, price_idr: '75000' })).toMatch(/whole number/)
    expect(validateProductInput({ ...valid, price_idr: MIN_PRICE_IDR - 1 })).toMatch(/at least/)
  })

  it('rejects negative stock but allows zero', () => {
    expect(validateProductInput({ ...valid, stock: -1 })).toMatch(/Stock/)
    expect(validateProductInput({ ...valid, stock: 0 })).toBeNull()
  })

  it('lets a partial update leave fields out', () => {
    expect(validateProductInput({ stock: 3 }, true)).toBeNull()
    expect(validateProductInput({ price_idr: 0 }, true)).toMatch(/at least/)
  })
})

describe('compare-at (sale) price', () => {
  const base = { name: 'Tote', price_idr: 75000, stock: 3 }

  it('accepts a compare-at price above the price, or none at all', () => {
    expect(validateProductInput({ ...base, compare_at_price_idr: 100000 })).toBeNull()
    expect(validateProductInput({ ...base, compare_at_price_idr: null })).toBeNull()
    expect(validateProductInput(base)).toBeNull()
  })

  it('rejects a compare-at price at or below the price — no visible discount', () => {
    expect(validateProductInput({ ...base, compare_at_price_idr: 75000 })).toMatch(/higher than the price/)
    expect(validateProductInput({ ...base, compare_at_price_idr: 50000 })).toMatch(/higher than the price/)
  })

  it('checks the pair the stored product would end up with', () => {
    // e.g. raising the price to 120.000 while 100.000 is stored as compare-at
    expect(validateSalePrice(120000, 100000)).toMatch(/higher than the price/)
    expect(validateSalePrice(90000, 100000)).toBeNull()
    expect(validateSalePrice(90000, null)).toBeNull()
  })

  it('rounds the percentage off, and reports none without a real discount', () => {
    expect(discountPercent(75000, 100000)).toBe(25)
    expect(discountPercent(66000, 99000)).toBe(33)
    expect(discountPercent(75000, 75000)).toBeNull()
    expect(discountPercent(75000, null)).toBeNull()
  })
})

describe('isNewArrival', () => {
  const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()

  it('marks products added within the window as new', () => {
    expect(isNewArrival(daysAgo(1))).toBe(true)
    expect(isNewArrival(daysAgo(NEW_ARRIVAL_DAYS - 1))).toBe(true)
  })

  it('stops after the window, and ignores future dates', () => {
    expect(isNewArrival(daysAgo(NEW_ARRIVAL_DAYS + 1))).toBe(false)
    expect(isNewArrival(daysAgo(-2))).toBe(false)
  })
})

describe('validateShippingFee', () => {
  it('allows free shipping and whole rupiah', () => {
    expect(validateShippingFee(0)).toBeNull()
    expect(validateShippingFee(20000)).toBeNull()
  })

  it.each([-1, 1.5, '20000', null])('rejects %p', (fee) => {
    expect(validateShippingFee(fee)).not.toBeNull()
  })
})

describe('validateQuantity', () => {
  it('accepts 1 up to the per-order maximum', () => {
    expect(validateQuantity(1)).toBeNull()
    expect(validateQuantity(MAX_ORDER_QUANTITY)).toBeNull()
  })

  it.each([0, MAX_ORDER_QUANTITY + 1, 1.5, '2'])('rejects %p', (q) => {
    expect(validateQuantity(q)).not.toBeNull()
  })
})

describe('parseShippingDetails', () => {
  const body = {
    recipient_name: '  Fauzi Rachman ',
    recipient_phone: '0812-3456 7890',
    shipping_address: 'Jl. Kenanga No. 12, RT 01/RW 02, Telukjambe',
    shipping_city: 'Karawang',
    shipping_postal_code: '41361',
    notes: '',
  }

  it('trims text and keeps only dialable characters in the phone number', () => {
    const result = parseShippingDetails(body)
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({ recipient_name: 'Fauzi Rachman', recipient_phone: '081234567890' }),
    })
  })

  it('keeps a leading + for international numbers', () => {
    const result = parseShippingDetails({ ...body, recipient_phone: '+62 812 3456 7890' })
    expect(result.ok && result.value.recipient_phone).toBe('+6281234567890')
  })

  it.each([
    ['recipient_name', 'A', /Nama/],
    ['recipient_phone', '123', /HP/],
    ['shipping_address', 'Jl. A', /Alamat/],
    ['shipping_city', '', /Kota/],
    ['shipping_postal_code', '4136', /Kode pos/],
    ['notes', 'x'.repeat(301), /Catatan/],
  ])('rejects a bad %s', (field, value, message) => {
    const result = parseShippingDetails({ ...body, [field]: value })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toMatch(message)
  })

  it('treats non-string fields as missing instead of throwing', () => {
    expect(parseShippingDetails({ ...body, recipient_name: 42 }).ok).toBe(false)
  })
})

describe('allowedFulfillmentActions', () => {
  it('offers nothing until the order is paid', () => {
    expect(allowedFulfillmentActions('pending', 'unfulfilled')).toEqual([])
    expect(allowedFulfillmentActions('needs_refund', 'unfulfilled')).toEqual([])
  })

  it('walks a paid order from new to shipped to completed', () => {
    expect(allowedFulfillmentActions('paid', 'unfulfilled')).toEqual(['process', 'ship', 'cancel'])
    expect(allowedFulfillmentActions('paid', 'processing')).toEqual(['ship', 'cancel'])
    expect(allowedFulfillmentActions('paid', 'shipped')).toEqual(['complete'])
    expect(allowedFulfillmentActions('paid', 'completed')).toEqual([])
  })

  it('does not allow cancelling once the parcel has left', () => {
    expect(allowedFulfillmentActions('paid', 'shipped')).not.toContain('cancel')
  })
})

describe('orderStageLabel', () => {
  it('shows the payment state until paid, then the shipping state', () => {
    expect(orderStageLabel('pending', 'unfulfilled')).toBe('Menunggu pembayaran')
    expect(orderStageLabel('paid', 'unfulfilled')).toMatch(/Lunas/)
    expect(orderStageLabel('paid', 'shipped')).toBe('Dikirim')
  })
})
