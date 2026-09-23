/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('server-only', () => ({}))

const requireAdmin = jest.fn()
jest.mock('@/app/lib/apiAuth', () => ({ requireAdmin: () => requireAdmin() }))

// Enough works to span several pages, newest first.
const ALL = Array.from({ length: 45 }, (_, i) => ({ id: `w${i}`, title: `Work ${i}` }))
let range: [number, number] | null = null

jest.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        range: (from: number, to: number) => {
          range = [from, to]
          return Promise.resolve({ data: ALL.slice(from, to + 1), error: null, count: ALL.length })
        },
      }
      return q
    },
  },
}))

import { GET } from '@/app/api/admin/works/route'
import { ADMIN_WORKS_PAGE_SIZE as SIZE } from '@/app/lib/pagination'

const get = (query = '') =>
  GET(new NextRequest(`http://localhost/api/admin/works${query}`))

describe('GET /api/admin/works', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    range = null
    requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
  })

  it('returns the first page with the full total', async () => {
    const body = await (await get()).json()

    expect(range).toEqual([0, SIZE - 1])
    expect(body.works).toHaveLength(SIZE)
    expect(body.works[0].id).toBe('w0')
    expect(body).toMatchObject({ total: 45, hasMore: true })
  })

  it('continues where the previous page ended', async () => {
    const body = await (await get('?page=1')).json()

    expect(range).toEqual([SIZE, SIZE * 2 - 1])
    expect(body.works[0].id).toBe(`w${SIZE}`)
    expect(body.hasMore).toBe(true)
  })

  it('reports no more once the last page is served', async () => {
    const body = await (await get('?page=2')).json()

    expect(body.works).toHaveLength(45 - SIZE * 2)
    expect(body.hasMore).toBe(false)
  })

  it('treats a junk or negative page as the first one', async () => {
    for (const query of ['?page=-3', '?page=abc', '?page=']) {
      await get(query)
      expect(range).toEqual([0, SIZE - 1])
    }
  })

  it('refuses a non-admin before reading anything', async () => {
    const forbidden = Response.json({ error: 'Forbidden' }, { status: 403 })
    requireAdmin.mockResolvedValue({ error: forbidden })

    expect((await get()).status).toBe(403)
    expect(range).toBeNull()
  })
})
