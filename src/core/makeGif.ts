import type { GifJob, GifWorkerMessage } from '../workers/gif.worker'

export type { Fit, GifJob } from '../workers/gif.worker'

/**
 * Encodes a GIF in a background worker so the page stays responsive.
 * Aborting the signal stops the work immediately.
 */
export function makeGif(job: GifJob, onProgress?: (done: number, total: number) => void, signal?: AbortSignal): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/gif.worker.ts', import.meta.url), { type: 'module' })
    const stop = () => {
      worker.terminate()
      reject(new DOMException('Cancelled', 'AbortError'))
    }
    if (signal?.aborted) return stop()
    signal?.addEventListener('abort', stop, { once: true })

    worker.onmessage = (event: MessageEvent<GifWorkerMessage>) => {
      const message = event.data
      if (message.type === 'progress') return onProgress?.(message.done, message.total)
      signal?.removeEventListener('abort', stop)
      worker.terminate()
      if (message.type === 'done') resolve(message.bytes)
      else reject(new Error(message.message))
    }
    worker.onerror = (event) => {
      signal?.removeEventListener('abort', stop)
      worker.terminate()
      reject(new Error(event.message || 'Could not create the GIF.'))
    }
    worker.postMessage(job)
  })
}
