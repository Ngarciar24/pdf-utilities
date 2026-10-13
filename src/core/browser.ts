/** Browser-only helpers: reading files and triggering downloads. */

export async function readFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}

export function downloadBytes(bytes: Uint8Array, fileName: string, type: string): void {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

/**
 * Returns PNG or JPEG bytes for any image the browser can decode. PNG and
 * JPEG pass through untouched; other formats (WebP, GIF, BMP, AVIF...) are
 * re-encoded as PNG via a canvas.
 */
export async function readImageAsPngOrJpeg(file: File): Promise<Uint8Array> {
  const bytes = await readFile(file)
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8
  if (isPng || isJpg) return bytes

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(`${file.name} is not an image your browser can read.`)
  }
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error(`Could not convert ${file.name}.`)
  return new Uint8Array(await blob.arrayBuffer())
}

export type ImageOutputFormat = 'original' | 'png' | 'jpg'

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

export function extensionForType(type: string): string {
  return EXTENSIONS[type] ?? 'png'
}

/**
 * Re-encodes an image as PNG or JPEG. Transparent areas become white in JPEG.
 * With 'original' the file is returned unchanged.
 */
export async function convertImage(
  file: Blob,
  format: ImageOutputFormat,
  quality = 0.92,
): Promise<{ bytes: Uint8Array; type: string; extension: string }> {
  if (format === 'original' || (format === 'png' && file.type === 'image/png') || (format === 'jpg' && file.type === 'image/jpeg')) {
    return { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type, extension: extensionForType(file.type) }
  }
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')!
  if (format === 'jpg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const type = format === 'png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  if (!blob) throw new Error('Could not convert the image.')
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type, extension: format }
}

/**
 * Reads images from the clipboard. Needs a user click and permission; browsers
 * that don't support it throw, and the caller should suggest Ctrl+V instead.
 */
export async function readClipboardImages(): Promise<Blob[]> {
  if (!navigator.clipboard?.read) {
    throw new Error('Your browser does not allow reading the clipboard from a button. Press Ctrl+V (⌘V on Mac) instead.')
  }
  let items: ClipboardItems
  try {
    items = await navigator.clipboard.read()
  } catch (error) {
    throw new Error('The browser blocked access to the clipboard. Press Ctrl+V (⌘V on Mac) instead.', { cause: error })
  }
  const blobs: Blob[] = []
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'))
    if (type) blobs.push(await item.getType(type))
  }
  if (blobs.length === 0) throw new Error('There is no image on the clipboard. Copy an image or take a screenshot first.')
  return blobs
}
