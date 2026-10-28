import { GifReader } from 'omggif'
import { describe, expect, it } from 'vitest'
import { blendRgba, buildTimeline, encodeGif, gifSize, samplePixels, timelineDuration, type GifTiming } from '../../src/core/gif'

const base: GifTiming = { frameMs: 500, pauseMs: 0, loop: 'forever', pingPong: false, crossfadeSteps: 0 }

const order = (timing: Partial<GifTiming>, count = 3) =>
  buildTimeline(count, { ...base, ...timing }).map((f) => (f.mix === 0 ? f.from : `${f.from}>${f.to}`))

describe('buildTimeline', () => {
  it('shows each image once with the chosen delay', () => {
    const frames = buildTimeline(3, base)
    expect(frames.map((f) => f.from)).toEqual([0, 1, 2])
    expect(frames.every((f) => f.delayMs === 500)).toBe(true)
  })

  it('adds the pause to the last frame only when looping', () => {
    expect(buildTimeline(2, { ...base, pauseMs: 1500 }).map((f) => f.delayMs)).toEqual([500, 2000])
    expect(buildTimeline(2, { ...base, pauseMs: 1500, loop: 'once' }).map((f) => f.delayMs)).toEqual([500, 500])
  })

  it('plays back and forth without repeating the turning points', () => {
    expect(order({ pingPong: true }, 4)).toEqual([0, 1, 2, 3, 2, 1])
    expect(order({ pingPong: true, loop: 'once' }, 4)).toEqual([0, 1, 2, 3, 2, 1, 0])
  })

  it('inserts blended frames between images, wrapping around when looping', () => {
    expect(order({ crossfadeSteps: 1 }, 2)).toEqual([0, '0>1', 1, '1>0'])
    expect(order({ crossfadeSteps: 1, loop: 'once' }, 2)).toEqual([0, '0>1', 1])
    const mixes = buildTimeline(2, { ...base, crossfadeSteps: 3, loop: 'once' }).map((f) => f.mix)
    expect(mixes).toEqual([0, 0.25, 0.5, 0.75, 0])
  })

  it('never goes below 20 ms and rounds to hundredths of a second', () => {
    expect(buildTimeline(1, { ...base, frameMs: 5 })[0].delayMs).toBe(20)
    expect(buildTimeline(1, { ...base, frameMs: 333 })[0].delayMs).toBe(330)
  })

  it('handles a single image and no images', () => {
    expect(order({ pingPong: true, crossfadeSteps: 2 }, 1)).toEqual([0])
    expect(buildTimeline(0, base)).toEqual([])
  })

  it('reports the total duration', () => {
    expect(timelineDuration(buildTimeline(3, { ...base, pauseMs: 1000 }))).toBe(2500)
  })
})

describe('helpers', () => {
  it('blends pixels linearly', () => {
    const out = blendRgba(new Uint8ClampedArray([0, 100, 200, 255]), new Uint8ClampedArray([100, 100, 0, 255]), 0.25)
    expect([...out]).toEqual([25, 100, 150, 255])
  })

  it('samples every n-th pixel', () => {
    const rgba = new Uint8ClampedArray(10 * 4).map((_, i) => Math.floor(i / 4))
    expect([...samplePixels(rgba, 4)]).toEqual([0, 0, 0, 0, 3, 3, 3, 3, 6, 6, 6, 6, 9, 9, 9, 9])
    expect(samplePixels(rgba, 10)).toBe(rgba)
  })

  it('keeps the first image shape', () => {
    expect(gifSize(1000, 500, 480)).toEqual({ width: 480, height: 240 })
    expect(gifSize(595, 842, 480)).toEqual({ width: 480, height: 679 })
  })
})

describe('encodeGif', () => {
  const W = 8
  const H = 6
  const solid = (r: number, g: number, b: number) => {
    const px = new Uint8ClampedArray(W * H * 4)
    for (let i = 0; i < px.length; i += 4) px.set([r, g, b, 255], i)
    return px
  }
  const images = [solid(255, 0, 0), solid(0, 0, 255)]

  async function encode(timing: Partial<GifTiming>, colors = 256) {
    const t = { ...base, ...timing }
    const bytes = await encodeGif(buildTimeline(images.length, t), async (i) => images[i], {
      width: W,
      height: H,
      colors,
      loop: t.loop,
    })
    return new GifReader(bytes)
  }

  function pixel(reader: GifReader, frame: number) {
    const out = new Uint8Array(W * H * 4)
    reader.decodeAndBlitFrameRGBA(frame, out)
    return [...out.slice(0, 3)]
  }

  it('writes a looping GIF with the right frames and delays', async () => {
    const gif = await encode({ frameMs: 250, pauseMs: 1000 })
    expect([gif.width, gif.height]).toEqual([W, H])
    expect(gif.numFrames()).toBe(2)
    expect(gif.loopCount()).toBe(0) // 0 = forever
    expect([gif.frameInfo(0).delay, gif.frameInfo(1).delay]).toEqual([25, 125]) // hundredths of a second
    expect(pixel(gif, 0)).toEqual([255, 0, 0])
    expect(pixel(gif, 1)).toEqual([0, 0, 255])
  })

  it('writes a GIF that plays once', async () => {
    const gif = await encode({ loop: 'once' })
    expect(gif.loopCount()).toBeNull()
  })

  it('encodes crossfade frames as a blend of both images', async () => {
    const gif = await encode({ crossfadeSteps: 1, loop: 'once' })
    expect(gif.numFrames()).toBe(3)
    const [r, g, b] = pixel(gif, 1)
    expect(g).toBe(0)
    expect(r).toBeGreaterThan(100)
    expect(r).toBeLessThan(160)
    expect(b).toBeGreaterThan(100)
    expect(b).toBeLessThan(160)
  })

  it('rejects images of the wrong size', async () => {
    await expect(
      encodeGif(buildTimeline(1, base), async () => new Uint8ClampedArray(4), { width: W, height: H, colors: 256, loop: 'forever' }),
    ).rejects.toThrow(/wrong size/)
  })
})
