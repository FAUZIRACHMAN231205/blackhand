import { fireEvent, render, screen } from '@testing-library/react'
import {
  Button,
  CatalogCard,
  EmptyState,
  FilterTabs,
  PageHeader,
  Price,
  TabLinks,
  Tag,
  TextField,
} from '@/app/component/ui'

// Red fill or border. Every button also carries `outline-accent-text` for the
// keyboard focus ring, which is meant to be on all of them.
const RED_SURFACE = /\b(bg|border)-accent\b/

describe('Button', () => {
  it('is a plain button by default, never a form submit by accident', () => {
    render(<Button>Simpan</Button>)
    expect(screen.getByRole('button', { name: 'Simpan' })).toHaveAttribute('type', 'button')
  })

  it('becomes a link when given an href', () => {
    render(<Button href="/gallery">Lihat karya</Button>)
    expect(screen.getByRole('link', { name: 'Lihat karya' })).toHaveAttribute('href', '/gallery')
  })

  it('uses the accent only for the buy variant', () => {
    render(
      <>
        <Button variant="buy">Beli</Button>
        <Button variant="primary">Lanjut</Button>
      </>
    )
    expect(screen.getByRole('button', { name: 'Beli' }).className).toMatch(RED_SURFACE)
    expect(screen.getByRole('button', { name: 'Lanjut' }).className).not.toMatch(RED_SURFACE)
  })

  it('marks delete as dashed, not red', () => {
    render(<Button variant="danger">Hapus</Button>)
    const button = screen.getByRole('button', { name: 'Hapus' })
    expect(button.className).toMatch(/border-dashed/)
    expect(button.className).not.toMatch(RED_SURFACE)
  })

  it('disables itself and reports busy while loading', () => {
    const onClick = jest.fn()
    render(
      <Button loading onClick={onClick}>
        Menyiapkan
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Menyiapkan' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Tag', () => {
  it('uses red only for a discount', () => {
    render(
      <>
        <Tag variant="sale">−25%</Tag>
        <Tag variant="solid">Terjual</Tag>
      </>
    )
    expect(screen.getByText('−25%').className).toMatch(/bg-accent/)
    expect(screen.getByText('Terjual').className).toMatch(/bg-ink/)
  })
})

describe('Price', () => {
  it('formats rupiah', () => {
    render(<Price amount={15000} />)
    expect(screen.getByText('Rp 15.000')).toBeInTheDocument()
  })

  it('strikes through the original only when it is a real discount', () => {
    const { rerender, container } = render(<Price amount={75000} compareAt={100000} />)
    expect(container.querySelector('s')).toHaveTextContent('Harga awal Rp 100.000')

    rerender(<Price amount={75000} compareAt={75000} />)
    expect(container.querySelector('s')).toBeNull()

    rerender(<Price amount={75000} compareAt={null} />)
    expect(container.querySelector('s')).toBeNull()
  })
})

describe('CatalogCard', () => {
  it('links the whole card and names the image after the work', () => {
    render(
      <CatalogCard href="/gallery/w1" imageUrl="https://x/y.jpg" title="Zidan Anyun" meta="Paintings" aside="Terjual" />
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/gallery/w1')
    expect(screen.getByRole('img', { name: 'Zidan Anyun' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Zidan Anyun' })).toBeInTheDocument()
  })

  it('shows a placeholder when there is no image yet', () => {
    render(<CatalogCard href="/shop/p1" imageUrl={null} title="Tote Bag" />)
    expect(screen.queryByRole('img', { name: 'Tote Bag' })).toBeNull()
  })
})

describe('TextField', () => {
  it('labels the input and shows the hint while there is no error', () => {
    render(<TextField id="phone" label="Nomor HP" hint="Untuk kurir." />)
    const input = screen.getByLabelText('Nomor HP')
    expect(input).toHaveAttribute('aria-describedby', 'phone-hint')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('ties the error to the input and replaces the hint', () => {
    render(<TextField id="phone" label="Nomor HP" hint="Untuk kurir." error="Nomor HP harus 8–15 digit." />)
    const input = screen.getByLabelText('Nomor HP')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'phone-error')
    expect(screen.getByText('Nomor HP harus 8–15 digit.')).toHaveAttribute('id', 'phone-error')
    expect(screen.queryByText('Untuk kurir.')).toBeNull()
  })
})

describe('FilterTabs', () => {
  const items = [
    { value: null, label: 'Semua' },
    { value: 'Paintings', label: 'Paintings' },
  ]

  it('marks the active filter and reports a change', () => {
    const onChange = jest.fn()
    render(<FilterTabs label="Kategori" items={items} value={null} onChange={onChange} />)

    expect(screen.getByRole('group', { name: 'Kategori' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Paintings' }))
    expect(onChange).toHaveBeenCalledWith('Paintings')
  })

  it('does nothing when the active filter is pressed again', () => {
    const onChange = jest.fn()
    render(<FilterTabs label="Kategori" items={items} value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Semua' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('TabLinks', () => {
  it('links every tab and marks the open one as the current page', () => {
    render(
      <TabLinks
        label="Bagian akun"
        current="/account/orders"
        items={[
          { href: '/account', label: 'Koleksi' },
          { href: '/account/orders', label: 'Pesanan' },
        ]}
      />
    )
    expect(screen.getByRole('navigation', { name: 'Bagian akun' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pesanan' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Koleksi' })).not.toHaveAttribute('aria-current')
  })
})

describe('PageHeader and EmptyState', () => {
  it('gives the page its single h1', () => {
    render(<PageHeader eyebrow="Toko" title="Merchandise" description="Ongkir flat." />)
    expect(screen.getByRole('heading', { level: 1, name: 'Merchandise' })).toBeInTheDocument()
  })

  it('says what will appear and offers the way forward', () => {
    render(<EmptyState title="Belum ada pesanan" action={<Button href="/shop">Lihat toko</Button>} />)
    expect(screen.getByRole('heading', { name: 'Belum ada pesanan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lihat toko' })).toHaveAttribute('href', '/shop')
  })
})
