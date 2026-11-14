import nextConfig from '@/next.config'
import { ACCOUNT_TABS, LEGACY_REDIRECTS, MAIN_NAV, isActivePath } from '@/app/lib/routes'

describe('site map', () => {
  it('puts artworks first in the main menu', () => {
    expect(MAIN_NAV.map((l) => l.label)).toEqual(['Karya', 'Toko', 'Manifesto'])
  })

  it('opens Akun on the Koleksi tab', () => {
    expect(ACCOUNT_TABS.map((t) => [t.label, t.href])).toEqual([
      ['Koleksi', '/account'],
      ['Pesanan', '/account/orders'],
      ['Profil', '/account/profile'],
    ])
  })
})

describe('retired addresses', () => {
  const destinationOf = Object.fromEntries(LEGACY_REDIRECTS.map((r) => [r.source, r.destination]))

  it.each([
    ['/works', '/gallery'],
    ['/works/:id', '/gallery/:id'],
    ['/dashboard', '/account'],
    ['/albums', '/account'],
    ['/orders', '/account/orders'],
    ['/settings', '/account/profile'],
  ])('%s still leads to %s', (from, to) => {
    expect(destinationOf[from]).toBe(to)
  })

  it('redirects permanently, through next.config', async () => {
    const redirects = await nextConfig.redirects!()
    expect(redirects).toHaveLength(LEGACY_REDIRECTS.length)
    for (const r of redirects) expect(r).toMatchObject({ permanent: true })
  })

  it('never sends one old address to another old one', () => {
    const sources = new Set(LEGACY_REDIRECTS.map((r) => r.source))
    for (const r of LEGACY_REDIRECTS) expect(sources.has(r.destination)).toBe(false)
  })
})

describe('isActivePath', () => {
  it('matches the page and the pages beneath it', () => {
    expect(isActivePath('/gallery', '/gallery')).toBe(true)
    expect(isActivePath('/gallery/abc', '/gallery')).toBe(true)
  })

  it('does not match a page that only shares a prefix', () => {
    expect(isActivePath('/galleryx', '/gallery')).toBe(false)
    expect(isActivePath(null, '/gallery')).toBe(false)
  })
})
