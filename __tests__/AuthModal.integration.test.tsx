import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AuthModal from '@/app/component/AuthModal'
import { ToastProvider } from '@/app/context/ToastContext'

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn(), forward: jest.fn(), refresh: jest.fn() }),
}))

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response)
}

// The app always renders the modal inside ToastProvider (root layout).
function renderModal(isOpen = true) {
  const onClose = jest.fn()
  const utils = render(
    <ToastProvider>
      <AuthModal isOpen={isOpen} onClose={onClose} />
    </ToastProvider>
  )
  return { ...utils, onClose }
}

async function submitEmail(email = 'buyer@example.com') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.click(screen.getByRole('button', { name: 'Kirim kode' }))
}

describe('AuthModal', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    push.mockReset()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('renders no dialog while closed', () => {
    renderModal(false)
    // The toast live region is always mounted (so messages get announced);
    // the sign-in dialog itself must not be.
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens on the email step', () => {
    renderModal()

    expect(screen.getByRole('heading', { name: 'Masuk', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lanjut dengan Google/i })).toBeInTheDocument()
    const email = screen.getByLabelText('Email') as HTMLInputElement
    expect(email.type).toBe('email')
  })

  it('closes from the close button and from the backdrop', () => {
    const { onClose, container } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    fireEvent.click(container.querySelector('[data-backdrop]') as Element)

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('starts Google sign-in as a full-page redirect', () => {
    // jsdom can't navigate and says so on the console; that's expected here.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: /Lanjut dengan Google/i }))

    expect(screen.getByRole('button', { name: /Menghubungkan/i })).toBeDisabled()
    consoleError.mockRestore()
  })

  it('requests a code and moves to the code step', async () => {
    fetchMock.mockReturnValue(jsonResponse({ success: true }))
    renderModal()

    await submitEmail('buyer@example.com')

    expect(await screen.findByRole('heading', { name: 'Masukkan kode' })).toBeInTheDocument()
    expect(screen.getByText('Kode 6 digit sudah dikirim ke buyer@example.com.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@example.com' }),
    })
  })

  it('stays on the email step and shows the server error when sending fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockReturnValue(jsonResponse({ error: 'Terlalu banyak permintaan' }, false))
    renderModal()

    await submitEmail()

    expect(await screen.findByText('Terlalu banyak permintaan')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Masuk', level: 2 })).toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('keeps only digits in the code field, up to six', async () => {
    fetchMock.mockReturnValue(jsonResponse({ success: true }))
    renderModal()
    await submitEmail()

    const code = (await screen.findByLabelText('Kode')) as HTMLInputElement
    fireEvent.change(code, { target: { value: '12a3-45678' } })

    expect(code.value).toBe('123456')
  })

  it('verifies the code, closes, and goes to the account page', async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ success: true }))
    fetchMock.mockReturnValueOnce(jsonResponse({ user: { id: 'user-1' } }))
    const { onClose } = renderModal()
    await submitEmail('buyer@example.com')

    fireEvent.change(await screen.findByLabelText('Kode'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/account'))
    expect(onClose).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@example.com', code: '123456' }),
    })
  })

  it('shows the error and stays open when the code is wrong', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockReturnValueOnce(jsonResponse({ success: true }))
    fetchMock.mockReturnValueOnce(jsonResponse({ error: 'Kode salah' }, false))
    const { onClose } = renderModal()
    await submitEmail()

    fireEvent.change(await screen.findByLabelText('Kode'), { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByText('Kode salah')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('goes back to the email step to use a different address', async () => {
    fetchMock.mockReturnValue(jsonResponse({ success: true }))
    renderModal()
    await submitEmail()

    fireEvent.click(await screen.findByRole('button', { name: /Ganti email/i }))

    expect(screen.getByRole('heading', { name: 'Masuk', level: 2 })).toBeInTheDocument()
  })
})
