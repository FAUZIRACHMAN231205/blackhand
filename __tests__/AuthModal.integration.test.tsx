import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AuthModal from '@/app/component/AuthModal'
import { supabase } from '@/app/lib/supabaseClient'

jest.mock('@/app/lib/supabaseClient')

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}))

describe('AuthModal Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    const mockOnClose = jest.fn()
    const { container } = render(<AuthModal isOpen={false} onClose={mockOnClose} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders when isOpen is true', () => {
    const mockOnClose = jest.fn()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText('Identity')).toBeInTheDocument()
  })

  it('shows Google login button', () => {
    const mockOnClose = jest.fn()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const googleButton = screen.getByText(/Continue with Google/i)
    expect(googleButton).toBeInTheDocument()
  })

  it('has email input field', () => {
    const mockOnClose = jest.fn()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByPlaceholderText('name@example.com') as HTMLInputElement
    expect(emailInput).toBeInTheDocument()
    expect(emailInput.type).toBe('email')
  })

  it('has continue button for email submission', () => {
    const mockOnClose = jest.fn()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const continueButtons = screen.getAllByText('Continue')
    expect(continueButtons.length).toBeGreaterThan(0)
  })

  it('closes modal on close button click', () => {
    const mockOnClose = jest.fn()
    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    // Find and click close button (X icon)
    const closeButton = screen.getByRole('button', { name: '' })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls Google OAuth when Google button clicked', async () => {
    const mockOnClose = jest.fn()
    ;(supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      error: null,
    })

    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const googleButton = screen.getByText(/Continue with Google/i)
    fireEvent.click(googleButton)

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalled()
    })
  })

  it('calls sendOTP when email submitted', async () => {
    const mockOnClose = jest.fn()
    ;(supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      error: null,
    })

    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByPlaceholderText('name@example.com')
    const continueButton = screen.getAllByText('Continue')[0]

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalled()
    })
  })

  it('transitions to OTP step after email submission', async () => {
    const mockOnClose = jest.fn()
    ;(supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      error: null,
    })

    render(<AuthModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByPlaceholderText('name@example.com')
    const continueButton = screen.getAllByText('Continue')[0]

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText('Enter code')).toBeInTheDocument()
    })
  })
})
