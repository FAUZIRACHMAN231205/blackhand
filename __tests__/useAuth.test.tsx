import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '@/app/hooks/useAuth'
import { supabase } from '@/app/lib/supabaseClient'

jest.mock('@/app/lib/supabaseClient')

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with loading state', () => {
    const mockUser = null
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    })
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: { unsubscribe: jest.fn() },
      },
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
  })

  it('fetches session on mount', async () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
    }

    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
    })
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: { unsubscribe: jest.fn() },
      },
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(supabase.auth.getSession).toHaveBeenCalled()
  })

  it('sets user when session exists', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    }

    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: mockUser } },
    })
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: { unsubscribe: jest.fn() },
      },
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
  })

  it('calls signOut when logout is invoked', async () => {
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    })
    ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({})
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: { unsubscribe: jest.fn() },
      },
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(result.current.user).toBe(null)
  })

  it('unsubscribes from auth state change on unmount', async () => {
    const unsubscribeMock = jest.fn()

    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    })
    ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: { unsubscribe: unsubscribeMock },
      },
    })

    const { unmount } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled()
    })

    unmount()

    // Note: Unsubscribe is called on unmount
    expect(unsubscribeMock).toHaveBeenCalled()
  })
})
