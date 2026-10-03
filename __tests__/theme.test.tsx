import { act, render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/app/context/ThemeContext'
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from '@/app/lib/theme'

/** Pretend the device is in light or dark mode. */
function mockSystem(dark: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: dark && query.includes('dark'),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))
}

/** Run the pre-paint script exactly as the browser would. */
function runInitScript() {
  new Function(THEME_INIT_SCRIPT)()
}

const root = () => document.documentElement

beforeEach(() => {
  localStorage.clear()
  root().classList.remove('dark')
  root().style.colorScheme = ''
  document.head.innerHTML = '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">'
})

describe('pre-paint theme script', () => {
  it('applies a stored dark choice before anything renders', () => {
    mockSystem(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    runInitScript()
    expect(root().classList.contains('dark')).toBe(true)
    expect(root().style.colorScheme).toBe('dark')
  })

  it('lets a stored light choice win over a dark device', () => {
    mockSystem(true)
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    runInitScript()
    expect(root().classList.contains('dark')).toBe(false)
  })

  it('follows the device when nothing was chosen', () => {
    mockSystem(true)
    runInitScript()
    expect(root().classList.contains('dark')).toBe(true)
  })

  it('never throws, even when storage is blocked', () => {
    mockSystem(false)
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(runInitScript).not.toThrow()
    getItem.mockRestore()
  })
})

function Probe() {
  const { isDark, toggleTheme } = useTheme()
  return <button onClick={toggleTheme}>{isDark ? 'dark' : 'light'}</button>
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    mockSystem(false)
    jest.useFakeTimers()
  })
  afterEach(() => jest.useRealTimers())

  it('reads the theme the pre-paint script already applied', async () => {
    root().classList.add('dark')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(await screen.findByRole('button')).toHaveTextContent('dark')
  })

  it('toggles the page, remembers the choice and recolours the browser chrome', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)

    await act(async () => screen.getByRole('button').click())

    expect(root().classList.contains('dark')).toBe(true)
    expect(root().style.colorScheme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#020617')
    expect(screen.getByRole('button')).toHaveTextContent('dark')
  })

  it('switches without a fade, then gives transitions back', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    const freezeCount = () =>
      [...document.head.querySelectorAll('style')].filter((s) => s.textContent?.includes('transition:none')).length

    await act(async () => screen.getByRole('button').click())
    expect(freezeCount()).toBe(1)

    act(() => jest.runAllTimers())
    expect(freezeCount()).toBe(0)
  })
})
