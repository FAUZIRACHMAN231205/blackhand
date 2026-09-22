/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('server-only', () => ({}))

// The route builds its Resend client at import time, so the mock must not
// touch `send` until an email is actually sent.
const send = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: (...a: unknown[]) => send(...a) } })),
}))

const requestOtp = jest.fn()
jest.mock('@/app/lib/otp', () => ({ requestOtp: (...a: unknown[]) => requestOtp(...a) }))

// Keep the real clientIp so the route's header handling is exercised too.
const checkOtpIpLimit = jest.fn()
jest.mock('@/app/lib/otpIpLimit', () => ({
  ...jest.requireActual('@/app/lib/otpIpLimit'),
  checkOtpIpLimit: (...a: unknown[]) => checkOtpIpLimit(...a),
}))
jest.mock('@/app/lib/supabaseAdmin', () => ({ supabaseAdmin: {} }))

import { POST } from '@/app/api/auth/otp/request/route'

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest('http://localhost/api/auth/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/auth/otp/request', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requestOtp.mockResolvedValue({ ok: true, code: '123456' })
    send.mockResolvedValue({ error: null })
  })

  it('checks the limit against the address the proxy reports', async () => {
    checkOtpIpLimit.mockResolvedValue({ ok: true })

    const res = await post({ email: 'buyer@example.com' }, { 'x-real-ip': '203.0.113.7' })

    expect(res.status).toBe(200)
    expect(checkOtpIpLimit).toHaveBeenCalledWith('203.0.113.7')
    expect(requestOtp).toHaveBeenCalledWith('buyer@example.com')
  })

  it('refuses a limited network with 429 and Retry-After, sending nothing', async () => {
    checkOtpIpLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 290 })

    const res = await post({ email: 'buyer@example.com' }, { 'x-real-ip': '203.0.113.7' })

    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('290')
    expect((await res.json()).error).toMatch(/5 minutes/)
    expect(requestOtp).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('says "1 minute", not "1 minutes"', async () => {
    checkOtpIpLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 40 })

    expect((await (await post({ email: 'buyer@example.com' })).json()).error).toMatch(/1 minute\./)
  })

  it('rejects a malformed email before counting it against the network', async () => {
    const res = await post({ email: 'not-an-email' })

    expect(res.status).toBe(400)
    expect(checkOtpIpLimit).not.toHaveBeenCalled()
  })
})
