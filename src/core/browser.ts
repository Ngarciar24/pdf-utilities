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
