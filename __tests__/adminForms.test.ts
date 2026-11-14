import { EMPTY_WORK, checkWork, workPayload } from '@/app/admin/_components/WorkFields'
import { EMPTY_PRODUCT, checkProduct, firstProductError, productPayload } from '@/app/admin/_components/ProductFields'

describe('checkWork', () => {
  it('accepts a titled work that is not for sale', () => {
    expect(checkWork({ ...EMPTY_WORK, title: 'Nocturne' })).toEqual({})
  })

  it('puts each problem under its own field', () => {
    expect(checkWork({ ...EMPTY_WORK, title: '  ', isForSale: true, price: '' })).toEqual({
      title: 'Judul wajib diisi.',
      price: expect.stringMatching(/Harga wajib/),
    })
    expect(checkWork({ ...EMPTY_WORK, title: 'A', isForSale: true, price: '500' }).price).toMatch(/minimal/)
  })

  it('sends numbers, and no price as null', () => {
    expect(workPayload({ ...EMPTY_WORK, title: ' A ', price: '' })).toMatchObject({ title: 'A', price_idr: null })
    expect(workPayload({ ...EMPTY_WORK, title: 'A', price: '15000' }).price_idr).toBe(15000)
  })
})

describe('checkProduct', () => {
  const valid = { ...EMPTY_PRODUCT, name: 'Tote Bag', price: '75000', stock: '5' }

  it('accepts a complete product', () => {
    expect(checkProduct(valid)).toEqual({})
    expect(firstProductError({})).toBeNull()
  })

  it('names the missing fields and focuses the first one', () => {
    const errors = checkProduct({ ...EMPTY_PRODUCT, stock: '' })
    expect(errors.name).toMatch(/Nama produk/)
    expect(errors.price).toBe('Harga wajib diisi.')
    expect(errors.stock).toBe('Stok wajib diisi.')
    expect(firstProductError(errors)).toBe('product-name')
  })

  it('blames the compare-at price, not the price, for a fake discount', () => {
    const errors = checkProduct({ ...valid, compareAtPrice: '50000' })
    expect(errors.price).toBeUndefined()
    expect(errors.compareAtPrice).toMatch(/lebih tinggi dari harga jual/)
  })

  it('sends the same body as before', () => {
    expect(productPayload({ ...valid, compareAtPrice: '' })).toEqual({
      name: 'Tote Bag',
      description: '',
      price_idr: 75000,
      compare_at_price_idr: null,
      stock: 5,
      is_published: true,
    })
  })
})
