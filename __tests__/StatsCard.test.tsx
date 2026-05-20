import React from 'react'
import { render, screen } from '@testing-library/react'
import StatsCard from '@/app/component/StatsCard'
import { User } from 'lucide-react'

describe('StatsCard', () => {
  it('renders with title and value', () => {
    render(
      <StatsCard
        icon={<User size={20} />}
        title="Test Title"
        value="Test Value"
      />
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Value')).toBeInTheDocument()
  })

  it('renders with description when provided', () => {
    render(
      <StatsCard
        icon={<User size={20} />}
        title="Test Title"
        value="123"
        description="Test Description"
      />
    )

    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('renders without description when not provided', () => {
    const { container } = render(
      <StatsCard
        icon={<User size={20} />}
        title="Test Title"
        value="456"
      />
    )

    // Check that the description paragraph is not rendered
    const descriptions = container.querySelectorAll('p.text-gray-500')
    expect(descriptions.length).toBe(0)
  })

  it('renders icon correctly', () => {
    const { container } = render(
      <StatsCard
        icon={<User size={20} data-testid="icon" />}
        title="Test Title"
        value="789"
      />
    )

    const icon = container.querySelector('[data-testid="icon"]')
    expect(icon).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <StatsCard
        icon={<User size={20} />}
        title="Test Title"
        value="999"
        className="custom-class"
      />
    )

    const card = container.firstChild
    expect(card).toHaveClass('custom-class')
  })

  it('handles numeric values correctly', () => {
    render(
      <StatsCard
        icon={<User size={20} />}
        title="Count"
        value={42}
      />
    )

    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
