import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { getPageCount } from '../../src/core/loadPdf'
import { mergePdfs } from '../../src/core/merge'
import { rotatePages } from '../../src/core/rotate'
import { extractPages, splitEveryPage } from '../../src/core/split'
import { makePdf, pageWidths } from './helpers'

describe('mergePdfs', () => {
  it('concatenates pages in the given order', async () => {
    const a = await makePdf(2, 100) // widths 100, 110
    const b = await makePdf(3, 300) // widths 300, 310, 320
    const merged = await mergePdfs([
      { name: 'b.pdf', bytes: b },
      { name: 'a.pdf', bytes: a },
    ])
    expect(await pageWidths(merged)).toEqual([300, 310, 320, 100, 110])
  })

  it('names the file that failed to load', async () => {
    await expect(
      mergePdfs([{ name: 'broken.pdf', bytes: new TextEncoder().encode('nope') }]),
    ).rejects.toThrow(/broken\.pdf is not a valid PDF/)
  })
})

describe('split', () => {
  it('extracts the selected pages in order', async () => {
    const pdf = await makePdf(5)
    expect(await pageWidths(await extractPages(pdf, [4, 0, 2]))).toEqual([140, 100, 120])
  })

  it('rejects pages outside the document', async () => {
    await expect(extractPages(await makePdf(2), [5])).rejects.toThrow(/does not exist/)
  })

  it('splits every page into its own document', async () => {
    const parts = await splitEveryPage(await makePdf(3))
    expect(parts).toHaveLength(3)
    expect(await Promise.all(parts.map((p) => getPageCount(p)))).toEqual([1, 1, 1])
    expect(await pageWidths(parts[2])).toEqual([120])
  })
})

describe('rotatePages', () => {
  async function rotations(bytes: Uint8Array) {
    const doc = await PDFDocument.load(bytes)
    return doc.getPages().map((p) => p.getRotation().angle)
  }

  it('rotates all pages by default', async () => {
    expect(await rotations(await rotatePages(await makePdf(2), 90))).toEqual([90, 90])
  })

  it('rotates only selected pages and adds to existing rotation', async () => {
    const once = await rotatePages(await makePdf(3), 270, [1])
    const twice = await rotatePages(once, 180, [1, 2])
    expect(await rotations(twice)).toEqual([0, 90, 180])
  })
})
