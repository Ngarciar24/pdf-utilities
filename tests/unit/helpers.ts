import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts } from 'pdf-lib'

export function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))))
}

/** Builds a PDF whose pages have distinct widths (100, 110, 120, ...) so tests can tell them apart. */
export async function makePdf(pageCount: number, firstWidth = 100): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([firstWidth + i * 10, 200])
    page.drawText(`Page ${i + 1}`, { x: 10, y: 100, size: 12, font })
  }
  return doc.save()
}

export async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => Math.round(p.getWidth()))
}
