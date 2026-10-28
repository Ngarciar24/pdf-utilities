/// <reference lib="webworker" />
import { encodeGif, type TimelineFrame } from '../core/gif'

export type Fit = 'contain' | 'cover'

export interface GifJob {
  images: Blob[]
  width: number
  height: number
  fit: Fit
  background: string
  timeline: TimelineFrame[]
  colors: number
  loop: 'forever' | 'once'
}

export type GifWorkerMessage =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; bytes: Uint8Array }
  | { type: 'error'; message: string }

declare const self: DedicatedWorkerGlobalScope

/** Draws an image onto a width × height canvas, letterboxed (contain) or cropped (cover). */
async function render(blob: Blob, job: GifJob, index: number): Promise<Uint8ClampedArray> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    throw new Error(`Image ${index + 1} could not be read.`)
  }
  const canvas = new OffscreenCanvas(job.width, job.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = job.background
  ctx.fillRect(0, 0, job.width, job.height)

  const scale = (job.fit === 'contain' ? Math.min : Math.max)(job.width / bitmap.width, job.height / bitmap.height)
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (job.width - w) / 2, (job.height - h) / 2, w, h)
  bitmap.close()
  return ctx.getImageData(0, 0, job.width, job.height).data
}

self.onmessage = async (event: MessageEvent<GifJob>) => {
  const job = event.data
  try {
    const bytes = await encodeGif(job.timeline, (i) => render(job.images[i], job, i), {
      width: job.width,
      height: job.height,
      colors: job.colors,
      loop: job.loop,
      onProgress: (done, total) => self.postMessage({ type: 'progress', done, total } satisfies GifWorkerMessage),
    })
    self.postMessage({ type: 'done', bytes } satisfies GifWorkerMessage, [bytes.buffer])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the GIF.'
    self.postMessage({ type: 'error', message } satisfies GifWorkerMessage)
  }
}
