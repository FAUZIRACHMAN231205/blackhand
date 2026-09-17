import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '@/app/hooks/useAuth'

// The session lives in an HttpOnly cookie the browser can't read, so the hook
// learns who is signed in by asking the server. These tests fake that server.

const mockUser = {
  id: 'user-1',
  email: 'buyer@example.com',
  full_name: 'Test Buyer',
  avatar_url: null,
  provider: 'email',
  role: 'user',
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response)
}

describe('useAuth', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('starts out loading with no user', () => {
    fetchMock.mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('loads the signed-in user from /api/auth/me', async () => {
    fetchMock.mockReturnValue(jsonResponse({ user: mockUser }))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me')
    expect(result.current.user).toEqual(mockUser)
  })

  it('reports no user when there is no session', async () => {
    fetchMock.mockReturnValue(jsonResponse({ user: null }))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('treats a failed session check as signed out rather than hanging', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockReturnValue(Promise.reject(new Error('offline')))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    consoleError.mockRestore()
  })

  it('logs out through the API and clears the user', async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ user: mockUser }))
    fetchMock.mockReturnValueOnce(jsonResponse({ success: true }))

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.user).toEqual(mockUser))

    await act(async () => {
      await result.current.logout()
    })

    expect(fetchMock).toHaveBeenLastCalledWith('/api/auth/logout', { method: 'POST' })
    expect(result.current.user).toBeNull()
  })

  it('picks up a new session when refreshed', async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ user: null }))
    fetchMock.mockReturnValueOnce(jsonResponse({ user: mockUser }))

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.user).toEqual(mockUser)
  })
})
