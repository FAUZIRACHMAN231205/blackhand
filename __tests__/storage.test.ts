/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}))

const remove = jest.fn()
jest.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: { storage: { from: () => ({ remove: (...a: unknown[]) => remove(...a) }) } },
}))

import { storagePathFromPublicUrl, removeStoredImages, previewKey } from '@/app/lib/storage'

const BASE = 'https://proj.supabase.co/storage/v1/object/public'

describe('storagePathFromPublicUrl', () => {
  it('reads the path inside the work-images bucket by default', () => {
    expect(storagePathFromPublicUrl(`${BASE}/work-images/works/w1/a-preview.jpg?t=1`)).toBe('works/w1/a-preview.jpg')
  })

  it('reads a path inside another bucket when asked', () => {
    expect(storagePathFromPublicUrl(`${BASE}/product-images/products/p1/x.jpg`, 'product-images')).toBe('products/p1/x.jpg')
  })

  it('ignores URLs from a different bucket', () => {
    expect(storagePathFromPublicUrl(`${BASE}/product-images/products/p1/x.jpg`)).toBeNull()
  })
})

describe('removeStoredImages', () => {
  beforeEach(() => {
    remove.mockReset().mockResolvedValue({ error: null })
  })

  it('removes every preview it is given', async () => {
    // Regression: passing the parser straight to .map() fed the array index in
    // as the bucket name (0, 1, …), so no file was ever matched or removed.
    await removeStoredImages([
      `${BASE}/work-images/works/w1/a-preview.jpg`,
      `${BASE}/work-images/works/w1/b-preview.jpg`,
      null,
    ])

    expect(remove).toHaveBeenCalledWith(['works/w1/a-preview.jpg', 'works/w1/b-preview.jpg'])
  })
})

describe('previewKey', () => {
  it('names a single, clean preview per original', () => {
    expect(previewKey('w1', '123-abc')).toBe('works/w1/123-abc-preview.jpg')
  })
})
