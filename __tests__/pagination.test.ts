/**
 * @jest-environment node
 */
import { pageRange, splitPage, GALLERY_PAGE_SIZE, FEED_PAGE_SIZE } from '@/app/lib/pagination'

describe('pageRange', () => {
  it('starts at the top of the list', () => {
    expect(pageRange(0, 12)).toEqual([0, 12])
  })

  it('asks for one row past the page, to learn whether more exist', () => {
    const [from, to] = pageRange(0, 12)
    expect(to - from + 1).toBe(13)
  })

  it('carries on from where the previous page ended', () => {
    expect(pageRange(1, 12)).toEqual([12, 24])
    expect(pageRange(3, 6)).toEqual([18, 24])
  })
})

describe('splitPage', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => i)

  it('hands back a full page and says more remain when the extra row came', () => {
    expect(splitPage(rows(13), 12)).toEqual({ items: rows(12), hasMore: true })
  })

  it('says no more when the page came back exactly full', () => {
    expect(splitPage(rows(12), 12)).toEqual({ items: rows(12), hasMore: false })
  })

  it('handles a short last page and an empty one', () => {
    expect(splitPage(rows(5), 12)).toEqual({ items: rows(5), hasMore: false })
    expect(splitPage([], 12)).toEqual({ items: [], hasMore: false })
  })
})

describe('page sizes', () => {
  it('are whole positive numbers', () => {
    for (const size of [GALLERY_PAGE_SIZE, FEED_PAGE_SIZE]) {
      expect(Number.isInteger(size)).toBe(true)
      expect(size).toBeGreaterThan(0)
    }
  })
})
