// The legacy build includes polyfills for JavaScript features that browsers
// shipped only recently; the modern build fails silently on older ones.
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

export type ImageFormat = 'png' | 'jpg'

export interface RenderOptions {
  format: ImageFormat
  /** Resolution in dots per inch; 72 is the PDF's natural size. */
  dpi: number
  /** JPEG quality between 0 and 1. Ignored for PNG. */
  quality: number
}

export interface RenderedPage {
  /** Zero-based page index. */
  index: number
  bytes: Uint8Array
  width: number
  height: number
}

// Browsers refuse canvases much larger than this; scale down instead of failing.
const MAX_SIDE = 16_384
const MAX_PIXELS = 100_000_000

const assetsUrl = `${import.meta.env.BASE_URL}pdfjs/`

/** Opens a PDF with pdf.js, turning its errors into messages a user can act on. */
export async function openPdf(bytes: Uint8Array, name = 'This file'): Promise<PDFDocumentProxy> {
  try {
    return await getDocument({
      // pdf.js takes ownership of the buffer it is given, so pass a copy.
      data: bytes.slice(),
      cMapUrl: `${assetsUrl}cmaps/`,
      standardFontDataUrl: `${assetsUrl}standard_fonts/`,
      wasmUrl: `${assetsUrl}wasm/`,
    }).promise
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new Error(`${name} is password-protected and can't be opened.`, { cause: error })
    }
    throw new Error(`${name} is not a valid PDF.`, { cause: error })
  }
}

/** Renders the given zero-based pages to PNG or JPEG images. */
export async function renderPages(
  doc: PDFDocumentProxy,
  indices: number[],
  options: RenderOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<RenderedPage[]> {
  const results: RenderedPage[] = []
  for (const [n, index] of indices.entries()) {
    const page = await doc.getPage(index + 1)
    let scale = options.dpi / 72
    const natural = page.getViewport({ scale: 1 })
    const limit = Math.min(
      MAX_SIDE / Math.max(natural.width, natural.height),
      Math.sqrt(MAX_PIXELS / (natural.width * natural.height)),
    )
    scale = Math.min(scale, limit)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))
    const context = canvas.getContext('2d')!
    // White background: PDF pages are paper, and JPEG has no transparency.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: context, viewport }).promise
    page.cleanup()

    const { width, height } = canvas
    const type = options.format === 'png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, options.quality))
    // Release the canvas memory right away; large pages use hundreds of MB.
    canvas.width = canvas.height = 0
    if (!blob) throw new Error(`Page ${index + 1} is too large to export as an image.`)

    results.push({ index, bytes: new Uint8Array(await blob.arrayBuffer()), width, height })
    onProgress?.(n + 1, indices.length)
  }
  return results
}
