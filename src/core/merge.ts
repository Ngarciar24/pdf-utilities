import { PDFDocument } from 'pdf-lib'
import { loadPdf } from './loadPdf'

export interface NamedPdf {
  name: string
  bytes: Uint8Array
}

/** Concatenates all pages of the given PDFs, in order. */
export async function mergePdfs(pdfs: NamedPdf[]): Promise<Uint8Array> {
  if (pdfs.length === 0) throw new Error('Add at least one PDF.')

  const merged = await PDFDocument.create()
  for (const { name, bytes } of pdfs) {
    const source = await loadPdf(bytes, name)
    const pages = await merged.copyPages(source, source.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }
  return merged.save()
}
