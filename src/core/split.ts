import { PDFDocument } from 'pdf-lib'
import { loadPdf } from './loadPdf'

/** Returns a new PDF containing only the given zero-based pages, in the given order. */
export async function extractPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  if (indices.length === 0) throw new Error('Select at least one page.')
  const source = await loadPdf(bytes)
  const count = source.getPageCount()
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= count) {
      throw new Error(`Page ${i + 1} does not exist; the document has ${count} pages.`)
    }
  }

  const out = await PDFDocument.create()
  const pages = await out.copyPages(source, indices)
  for (const page of pages) out.addPage(page)
  return out.save()
}

/** Splits a PDF into one single-page PDF per page. */
export async function splitEveryPage(bytes: Uint8Array): Promise<Uint8Array[]> {
  const source = await loadPdf(bytes)
  const results: Uint8Array[] = []
  for (const index of source.getPageIndices()) {
    const out = await PDFDocument.create()
    const [page] = await out.copyPages(source, [index])
    out.addPage(page)
    results.push(await out.save())
  }
  return results
}
