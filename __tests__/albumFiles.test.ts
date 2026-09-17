/**
 * @jest-environment node
 */
import sharp from 'sharp'
import { unzipSync } from 'fflate'
import { PDFDocument } from 'pdf-lib'

jest.mock('server-only', () => ({}))
// Only the pure packing functions are under test; nothing here touches storage.
jest.mock('@/app/lib/supabaseAdmin', () => ({ supabaseAdmin: {} }))

import {
  buildAlbumZip,
  buildAlbumPdf,
  asJpeg,
  fileSlug,
  numberedName,
  mimeForExt,
  type LoadedAlbum,
} from '@/app/lib/albumFiles'

const JPEG_MAGIC = [0xff, 0xd8, 0xff]

function image(width: number, height: number, format: 'jpeg' | 'png') {
  const img = sharp({ create: { width, height, channels: 3, background: { r: 120, g: 40, b: 200 } } })
  return (format === 'jpeg' ? img.jpeg() : img.png()).toBuffer()
}

async function album(): Promise<LoadedAlbum> {
  return {
    title: 'Irreplaceable Pt. 2',
    originals: [
      { imageId: 'a', position: 1, ext: 'jpg', buffer: await image(400, 300, 'jpeg') },
      { imageId: 'b', position: 2, ext: 'jpeg', buffer: await image(300, 600, 'jpeg') },
      { imageId: 'c', position: 3, ext: 'png', buffer: await image(500, 500, 'png') },
    ],
  }
}

describe('file naming', () => {
  it('builds ASCII-only, filesystem-safe names', () => {
    expect(fileSlug('Irreplaceable Pt. 2')).toBe('irreplaceable-pt-2')
    expect(fileSlug('Café — Été / Noël')).toBe('cafe-ete-noel')
    expect(fileSlug('!!!')).toBe('album')
  })

  it('numbers files so they sort in album order', () => {
    expect(numberedName('Zidan Anyun', 3, 'jpg')).toBe('zidan-anyun-03.jpg')
  })

  it('maps extensions to MIME types', () => {
    expect(mimeForExt('jpeg')).toBe('image/jpeg')
    expect(mimeForExt('png')).toBe('image/png')
    expect(mimeForExt('exe')).toBe('application/octet-stream')
  })
})

describe('asJpeg', () => {
  it('passes a JPEG original through byte-for-byte', async () => {
    const { originals } = await album()
    expect((await asJpeg(originals[0])).equals(originals[0].buffer)).toBe(true)
  })

  it('converts other formats to JPEG', async () => {
    const { originals } = await album()
    const out = await asJpeg(originals[2])
    expect([...out.subarray(0, 3)]).toEqual(JPEG_MAGIC)
  })
})

describe('buildAlbumZip', () => {
  it('contains every image as a numbered JPEG, originals untouched', async () => {
    const a = await album()
    const entries = unzipSync(await buildAlbumZip(a))

    expect(Object.keys(entries)).toEqual([
      'irreplaceable-pt-2-01.jpg',
      'irreplaceable-pt-2-02.jpg',
      'irreplaceable-pt-2-03.jpg',
    ])
    expect(Buffer.from(entries['irreplaceable-pt-2-01.jpg']).equals(a.originals[0].buffer)).toBe(true)
    expect([...entries['irreplaceable-pt-2-03.jpg'].subarray(0, 3)]).toEqual(JPEG_MAGIC)
  })
})

describe('buildAlbumPdf', () => {
  it('puts one image on each page, shaped to that image', async () => {
    const pdf = await PDFDocument.load(await buildAlbumPdf(await album()))
    const sizes = pdf.getPages().map((p) => p.getSize())

    expect(pdf.getPageCount()).toBe(3)
    expect(pdf.getTitle()).toBe('Irreplaceable Pt. 2')
    // Landscape, portrait, square — long edge normalised to A4 (842pt).
    expect(sizes[0].width).toBeCloseTo(842)
    expect(sizes[0].height).toBeCloseTo(631.5)
    expect(sizes[1].height).toBeCloseTo(842)
    expect(sizes[1].width).toBeCloseTo(421)
    expect(sizes[2].width).toBeCloseTo(sizes[2].height)
  })
})
