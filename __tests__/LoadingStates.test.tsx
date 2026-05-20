import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  LoadingSpinner,
  SkeletonCard,
  SkeletonGrid,
  DashboardSkeleton,
} from '@/app/component/LoadingStates'

describe('LoadingStates Components', () => {
  describe('LoadingSpinner', () => {
    it('renders spinner with loading text', () => {
      render(<LoadingSpinner />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('renders spinner animation element', () => {
      const { container } = render(<LoadingSpinner />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('SkeletonCard', () => {
    it('renders skeleton card', () => {
      const { container } = render(<SkeletonCard />)

      const card = container.querySelector('.animate-pulse')
      expect(card).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<SkeletonCard className="custom-class" />)

      const card = container.querySelector('.animate-pulse')
      expect(card).toHaveClass('custom-class')
    })

    it('renders multiple placeholder lines', () => {
      const { container } = render(<SkeletonCard />)

      const skeletonLines = container.querySelectorAll('.bg-gray-800')
      expect(skeletonLines.length).toBeGreaterThan(0)
    })
  })

  describe('SkeletonGrid', () => {
    it('renders default 4 skeleton cards', () => {
      const { container } = render(<SkeletonGrid />)

      const cards = container.querySelectorAll('.animate-pulse')
      expect(cards.length).toBe(4)
    })

    it('renders custom count of skeleton cards', () => {
      const { container } = render(<SkeletonGrid count={6} />)

      const cards = container.querySelectorAll('.animate-pulse')
      expect(cards.length).toBe(6)
    })

    it('applies custom className to container', () => {
      const { container } = render(<SkeletonGrid className="custom-grid" />)

      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('custom-grid')
    })
  })

  describe('DashboardSkeleton', () => {
    it('renders dashboard skeleton layout', () => {
      const { container } = render(<DashboardSkeleton />)

      const animatedElements = container.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBeGreaterThan(0)
    })

    it('renders main layout structure', () => {
      const { container } = render(<DashboardSkeleton />)

      expect(container.querySelector('.min-h-\\[100dvh\\]')).toBeInTheDocument()
      expect(container.querySelector('.grid')).toBeInTheDocument()
    })
  })
})
