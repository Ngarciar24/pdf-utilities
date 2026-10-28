import { GIFEncoder, applyPalette, quantize } from 'gifenc'

export interface GifTiming {
  /** How long each image stays on screen. */
  frameMs: number
  /** Extra time on the last frame before the animation starts over. */
  pauseMs: number
  loop: 'forever' | 'once'
  /** Play forwards, then backwards (boomerang). */
  pingPong: boolean
  /** Number of in-between frames that blend one image into the next; 0 for a hard cut. */
  crossfadeSteps: number
}

/** One frame of the output: image `from`, blended towards image `to` by `mix` (0 to 1). */
export interface TimelineFrame {
  from: number
  to: number
  mix: number
  delayMs: number
}

/** Browsers show frames faster than 20 ms at 100 ms instead, so never go below it. */
export const MIN_DELAY_MS = 20
/** Pixels used to choose each frame's colours (see samplePixels). */
const PALETTE_SAMPLE_PIXELS = 65_536

/** Duration of each blended in-between frame. */
export const CROSSFADE_FRAME_MS = 40

/** GIF stores delays in hundredths of a second. */
function roundDelay(ms: number): number {
  return Math.max(MIN_DELAY_MS, Math.round(ms / 10) * 10)
}

/** Works out the sequence of output frames for `count` input images. */
export function buildTimeline(count: number, timing: GifTiming): TimelineFrame[] {
  if (count < 1) return []

  // Order in which the images are shown.
  const order = [...Array(count).keys()]
  if (timing.pingPong && count > 1) {
    // Back down again; when looping, stop before the first image because the loop shows it next.
    const end = timing.loop === 'forever' ? 1 : 0
    for (let i = count - 2; i >= end; i--) order.push(i)
  }

  const steps = Math.max(0, Math.floor(timing.crossfadeSteps))
  const frames: TimelineFrame[] = []
  for (let k = 0; k < order.length; k++) {
    const current = order[k]
    const isLast = k === order.length - 1
    const next = isLast ? (timing.loop === 'forever' ? order[0] : null) : order[k + 1]

    let delay = timing.frameMs
    if (isLast && timing.loop === 'forever') delay += timing.pauseMs
    frames.push({ from: current, to: current, mix: 0, delayMs: roundDelay(delay) })

    if (next !== null && next !== current && steps > 0) {
      for (let s = 1; s <= steps; s++) {
        frames.push({ from: current, to: next, mix: s / (steps + 1), delayMs: roundDelay(CROSSFADE_FRAME_MS) })
      }
    }
  }
  return frames
}

/** Total length of one pass through the timeline, in milliseconds. */
export function timelineDuration(frames: TimelineFrame[]): number {
  return frames.reduce((sum, f) => sum + f.delayMs, 0)
}

/** Linear blend of two RGBA buffers of the same size. */
export function blendRgba(a: Uint8ClampedArray, b: Uint8ClampedArray, mix: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(a.length)
  const keep = 1 - mix
  for (let i = 0; i < a.length; i++) out[i] = a[i] * keep + b[i] * mix
  return out
}

/**
 * Every n-th pixel, so that at most `maxPixels` remain. Choosing the palette
 * from a sample is several times faster and looks practically the same.
 */
export function samplePixels(rgba: Uint8ClampedArray, maxPixels: number): Uint8ClampedArray {
  const pixels = rgba.length / 4
  const stride = Math.ceil(pixels / maxPixels)
  if (stride <= 1) return rgba
  const out = new Uint8ClampedArray(Math.ceil(pixels / stride) * 4)
  for (let p = 0, o = 0; p < pixels; p += stride, o += 4) out.set(rgba.subarray(p * 4, p * 4 + 4), o)
  return out
}

/** Output size: `width` wide, with the height following the first image's shape. */
export function gifSize(firstWidth: number, firstHeight: number, width: number): { width: number; height: number } {
  const w = Math.max(1, Math.round(width))
  return { width: w, height: Math.max(1, Math.round((w * firstHeight) / firstWidth)) }
}

export interface EncodeOptions {
  width: number
  height: number
  /** Palette size per frame, 2–256. Fewer colours make smaller files. */
  colors: number
  loop: 'forever' | 'once'
  onProgress?: (done: number, total: number) => void
}

/**
 * Encodes a timeline into GIF bytes. `getImage(i)` returns input image i as
 * RGBA pixels of exactly width × height; it is called lazily so that only a
 * couple of images need to be in memory at a time.
 */
export async function encodeGif(
  timeline: TimelineFrame[],
  getImage: (index: number) => Promise<Uint8ClampedArray>,
  options: EncodeOptions,
): Promise<Uint8Array> {
  if (timeline.length === 0) throw new Error('Add at least one image.')
  const expected = options.width * options.height * 4
  const cache = new Map<number, Uint8ClampedArray>()

  async function image(index: number) {
    let pixels = cache.get(index)
    if (!pixels) {
      pixels = await getImage(index)
      if (pixels.length !== expected) throw new Error(`Image ${index + 1} has the wrong size.`)
      // A frame only ever needs its own image and the next one.
      if (cache.size >= 2) cache.delete(cache.keys().next().value!)
      cache.set(index, pixels)
    }
    return pixels
  }

  const gif = GIFEncoder()
  const colors = Math.min(256, Math.max(2, Math.round(options.colors)))
  for (const [i, frame] of timeline.entries()) {
    const from = await image(frame.from)
    const rgba = frame.mix > 0 ? blendRgba(from, await image(frame.to), frame.mix) : from
    const palette = quantize(samplePixels(rgba, PALETTE_SAMPLE_PIXELS), colors)
    gif.writeFrame(applyPalette(rgba, palette), options.width, options.height, {
      palette,
      delay: frame.delayMs,
      repeat: options.loop === 'forever' ? 0 : -1,
    })
    options.onProgress?.(i + 1, timeline.length)
  }
  gif.finish()
  return gif.bytes()
}
