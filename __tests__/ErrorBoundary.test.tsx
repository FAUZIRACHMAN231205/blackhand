import React from 'react'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '@/app/component/ErrorBoundary'

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })

  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Child Content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test Child Content')).toBeInTheDocument()
  })

  it('renders error UI when error is thrown', () => {
    const ThrowError = () => {
      throw new Error('Test error message')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByRole('heading', { name: 'Terjadi kesalahan' })).toBeInTheDocument()
    expect(screen.getByText(/gagal ditampilkan/)).toBeInTheDocument()
  })

  it('shows error details in expandable section', () => {
    const ThrowError = () => {
      throw new Error('Test error details')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const details = screen.getByText('Detail kesalahan')
    expect(details).toBeInTheDocument()
  })

  it('offers to try again or go home', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ke beranda' })).toHaveAttribute('href', '/')
  })
})
