/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}))

// An in-memory otp_request_log that understands exactly the queries the limiter
// makes, so windows of minutes and days can be tested without waiting.
type Row = { id: number; ip_hash: string; created_at: string }
let table: Row[] = []
let nextId = 1
let failInserts = false
let queries = 0

jest.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => {
      queries++
      const filters: ((r: Row) => boolean)[] = []
      let op: 'select' | 'delete' = 'select'
      let insertRow: Omit<Row, 'id'> | null = null
      const run = () => {
        if (op === 'delete') {
          table = table.filter((r) => !filters.every((f) => f(r)))
          return { data: null, error: null }
        }
        return { data: table.filter((r) => filters.every((f) => f(r))), error: null }
      }
      const q = {
        insert: (row: Omit<Row, 'id'>) => ((insertRow = row), q),
        select: () => q,
        delete: () => ((op = 'delete'), q),
        eq: (col: keyof Row, val: unknown) => (filters.push((r) => r[col] === val), q),
        gte: (col: keyof Row, val: string) => (filters.push((r) => r[col] >= val), q),
        lt: (col: keyof Row, val: string) => (filters.push((r) => r[col] < val), q),
        single: async () => {
          if (failInserts) return { data: null, error: { message: 'relation "otp_request_log" does not exist' } }
          const row = { id: nextId++, ...insertRow! }
          table.push(row)
          return { data: { id: row.id }, error: null }
        },
        then: (resolve: (v: unknown) => void) => resolve(run()),
      }
      return q
    },
  },
}))

import { checkOtpIpLimit, clientIp, IP_LIMITS } from '@/app/lib/otpIpLimit'

const MIN = 60 * 1000
const T0 = Date.UTC(2026, 8, 22, 9, 0, 0)
const at = (minutes: number) => T0 + minutes * MIN

beforeEach(() => {
  table = []
  nextId = 1
  failInserts = false
  queries = 0
  process.env.OTP_PEPPER = 'test-pepper'
})

describe('clientIp', () => {
  it('prefers the address the proxy reports in x-real-ip', () => {
    const h = new Headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1' })
    expect(clientIp(h)).toBe('203.0.113.7')
  })

  it('falls back to the first (client) hop of x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.2' }))).toBe('198.51.100.1')
  })

  it('reports nothing when no proxy header is present', () => {
    expect(clientIp(new Headers())).toBeNull()
  })
})

describe('checkOtpIpLimit', () => {
  it('matches the documented limits', () => {
    expect(IP_LIMITS).toEqual([
      { windowMs: 10 * MIN, max: 5 },
      { windowMs: 24 * 60 * MIN, max: 20 },
    ])
  })

  it('allows five requests in ten minutes and refuses the sixth', async () => {
    for (let m = 0; m < 5; m++) {
      expect(await checkOtpIpLimit('203.0.113.7', at(m))).toEqual({ ok: true })
    }
    // The oldest (minute 0) frees a slot at minute 10: five minutes from now.
    expect(await checkOtpIpLimit('203.0.113.7', at(5))).toEqual({ ok: false, retryAfterSeconds: 300 })
  })

  it('lets the network back in exactly when the oldest request ages out', async () => {
    for (let m = 0; m < 5; m++) await checkOtpIpLimit('203.0.113.7', at(m))

    expect((await checkOtpIpLimit('203.0.113.7', at(9.99))).ok).toBe(false)
    expect((await checkOtpIpLimit('203.0.113.7', at(10) + 1)).ok).toBe(true)
  })

  it('does not let refused retries extend the lockout', async () => {
    for (let m = 0; m < 5; m++) await checkOtpIpLimit('203.0.113.7', at(m))
    for (let i = 0; i < 10; i++) {
      expect((await checkOtpIpLimit('203.0.113.7', at(6))).ok).toBe(false)
    }

    expect(table).toHaveLength(5)
    expect((await checkOtpIpLimit('203.0.113.7', at(10) + 1)).ok).toBe(true)
  })

  it('caps a network at twenty requests a day even when spread out', async () => {
    // One every 11 minutes never trips the 10-minute window.
    for (let i = 0; i < 20; i++) {
      expect((await checkOtpIpLimit('203.0.113.7', at(i * 11))).ok).toBe(true)
    }
    const refused = await checkOtpIpLimit('203.0.113.7', at(20 * 11))

    expect(refused.ok).toBe(false)
    // Free again when the first request (minute 0) is a day old.
    expect(refused).toEqual({ ok: false, retryAfterSeconds: (24 * 60 - 20 * 11) * 60 })
  })

  it('counts each network separately', async () => {
    for (let m = 0; m < 5; m++) await checkOtpIpLimit('203.0.113.7', at(m))

    expect((await checkOtpIpLimit('203.0.113.7', at(5))).ok).toBe(false)
    expect((await checkOtpIpLimit('198.51.100.1', at(5))).ok).toBe(true)
  })

  it('stores a keyed hash, never the address itself', async () => {
    await checkOtpIpLimit('203.0.113.7', at(0))

    expect(table[0].ip_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(table)).not.toContain('203.0.113.7')
  })

  it('forgets requests older than a day', async () => {
    await checkOtpIpLimit('203.0.113.7', at(0))
    await checkOtpIpLimit('198.51.100.1', at(24 * 60 + 1))

    expect(table).toHaveLength(1)
  })

  it('allows the request without touching the database when the address is unknown', async () => {
    expect(await checkOtpIpLimit(null, at(0))).toEqual({ ok: true })
    expect(queries).toBe(0)
  })

  it('fails open, loudly, when the log table is missing', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    failInserts = true

    expect(await checkOtpIpLimit('203.0.113.7', at(0))).toEqual({ ok: true })
    expect(consoleError).toHaveBeenCalledWith(expect.stringMatching(/DATABASE_MIGRATION_OTP_IP_LIMIT/), expect.anything())
    consoleError.mockRestore()
  })
})
