import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { detectImageKind, imagesToPdf } from '../../src/core/imagesToPdf'
import { fixture } from './helpers'

const png = fixture('landscape.png') // 400x300
const jpg = fixture('portrait.jpg') // 300x400

async function sizes(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())])
}

describe('detectImageKind', () => {
  it('recognises PNG and JPEG by content', () => {
    expect(detectImageKind(png)).toBe('png')
    expect(detectImageKind(jpg)).toBe('jpg')
    expect(detectImageKind(new TextEncoder().encode('%PDF-1.7'))).toBeNull()
  })
})

describe('imagesToPdf', () => {
  it('creates one page per image, sized to the image by default', async () => {
    const pdf = await imagesToPdf([png, jpg])
    expect(await sizes(pdf)).toEqual([
      [400, 300],
      [300, 400],
    ])
  })

  it('adds margins around fitted images', async () => {
    const pdf = await imagesToPdf([png], { pageSize: 'fit', orientation: 'auto', marginMm: 10 })
    // 10 mm = 28.35 pt on each side
    expect(await sizes(pdf)).toEqual([[457, 357]])
  })

  it('uses A4 and picks orientation from the image in auto mode', async () => {
    const pdf = await imagesToPdf([png, jpg], { pageSize: 'a4', orientation: 'auto', marginMm: 0 })
    expect(await sizes(pdf)).toEqual([
      [842, 595],
      [595, 842],
    ])
  })

  it('honours a forced orientation', async () => {
    const pdf = await imagesToPdf([png], {
      pageSize: 'letter',
      orientation: 'portrait',
      marginMm: 0,
    })
    expect(await sizes(pdf)).toEqual([[612, 792]])
  })

  it('rejects empty input and unsupported files', async () => {
    await expect(imagesToPdf([])).rejects.toThrow(/at least one image/)
    await expect(imagesToPdf([new Uint8Array([1, 2, 3])])).rejects.toThrow(/not a PNG or JPEG/)
  })
})
