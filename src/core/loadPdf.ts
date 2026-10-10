import { PDFDocument } from 'pdf-lib'

/** Loads a PDF, turning pdf-lib's errors into messages a user can act on. */
export async function loadPdf(bytes: Uint8Array, name = 'This file'): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/encrypt/i.test(message)) {
      throw new Error(`${name} is password-protected and can't be opened.`, { cause: error })
    }
    throw new Error(`${name} is not a valid PDF.`, { cause: error })
  }
}

export async function getPageCount(bytes: Uint8Array, name?: string): Promise<number> {
  return (await loadPdf(bytes, name)).getPageCount()
}
