import { degrees } from 'pdf-lib'
import { loadPdf } from './loadPdf'

export type Rotation = 90 | 180 | 270

/**
 * Rotates pages clockwise by the given angle, on top of any rotation they
 * already have. With no indices, every page is rotated.
 */
export async function rotatePages(
  bytes: Uint8Array,
  rotation: Rotation,
  indices?: number[],
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes)
  const pages = doc.getPages()
  const targets = indices ?? pages.map((_, i) => i)
  for (const i of targets) {
    const page = pages[i]
    if (!page) throw new Error(`Page ${i + 1} does not exist; the document has ${pages.length} pages.`)
    const current = page.getRotation().angle
    page.setRotation(degrees((((current + rotation) % 360) + 360) % 360))
  }
  return doc.save()
}
