import { PDFDocument } from 'pdf-lib'

export type ImageKind = 'png' | 'jpg'
export type PageSize = 'fit' | 'a4' | 'letter'
export type Orientation = 'auto' | 'portrait' | 'landscape'

export interface ImagesToPdfOptions {
  pageSize: PageSize
  orientation: Orientation
  /** Margin around each image, in millimetres. */
  marginMm: number
}

export const defaultImagesToPdfOptions: ImagesToPdfOptions = {
  pageSize: 'fit',
  orientation: 'auto',
  marginMm: 0,
}

// Page sizes in PDF points (1/72 inch), portrait.
const PAGE_SIZES: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}

const MM_TO_PT = 72 / 25.4

/** Detects PNG or JPEG from the file's magic bytes; returns null for anything else. */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg'
  }
  return null
}

/**
 * Creates a PDF with one image per page. Images are scaled down (never up
 * beyond their natural size on "fit") and centred inside the margins.
 */
export async function imagesToPdf(
  images: Uint8Array[],
  options: ImagesToPdfOptions = defaultImagesToPdfOptions,
): Promise<Uint8Array> {
  if (images.length === 0) throw new Error('Add at least one image.')

  const doc = await PDFDocument.create()
  const margin = Math.max(0, options.marginMm) * MM_TO_PT

  for (const [index, bytes] of images.entries()) {
    const kind = detectImageKind(bytes)
    if (!kind) throw new Error(`Image ${index + 1} is not a PNG or JPEG.`)
    const image = kind === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)

    const landscapeImage = image.width > image.height
    let pageWidth: number
    let pageHeight: number
    if (options.pageSize === 'fit') {
      pageWidth = image.width + 2 * margin
      pageHeight = image.height + 2 * margin
    } else {
      const [w, h] = PAGE_SIZES[options.pageSize]
      const landscape =
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && landscapeImage)
      ;[pageWidth, pageHeight] = landscape ? [h, w] : [w, h]
    }

    const boxWidth = Math.max(1, pageWidth - 2 * margin)
    const boxHeight = Math.max(1, pageHeight - 2 * margin)
    const scale = Math.min(boxWidth / image.width, boxHeight / image.height, 1)
    const width = image.width * scale
    const height = image.height * scale

    const page = doc.addPage([pageWidth, pageHeight])
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    })
  }

  return doc.save()
}
