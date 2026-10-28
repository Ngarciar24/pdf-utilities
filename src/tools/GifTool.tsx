import { useEffect, useMemo, useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { SortableFileList, type ListItem } from '../components/SortableFileList'
import { usePastedFiles, useRevokeUnusedUrls } from '../components/hooks'
import {
  Actions,
  Field,
  PrimaryButton,
  RadioGroup,
  SecondaryButton,
  StatusMessage,
  ToolHeader,
  errorMessage,
  type Status,
} from '../components/ui'
import { downloadBytes, isPdf, readFile } from '../core/browser'
import { baseName, formatBytes } from '../core/files'
import { buildTimeline, gifSize, timelineDuration, type GifTiming } from '../core/gif'
import { makeGif, type Fit, type GifJob } from '../core/makeGif'

interface Frame extends ListItem {
  blob: Blob
  previewUrl: string
  width: number
  height: number
}

let nextId = 0

const MAX_IMAGES = 300
const MAX_OUTPUT_FRAMES = 1500
/** PDF pages are rendered at this resolution; enough for the largest GIF width. */
const PDF_DPI = 100

/** Choices for "time per image", in seconds. */
const SPEEDS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5]

function formatSeconds(s: number): string {
  return `${Number(s.toFixed(2))} s`
}

export function GifTool() {
  const [frames, setFrames] = useState<Frame[]>([])
  const [status, setStatus] = useState<Status>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const [speedIndex, setSpeedIndex] = useState(SPEEDS.indexOf(0.5))
  const [pauseMs, setPauseMs] = useState(0)
  const [loop, setLoop] = useState<GifTiming['loop']>('forever')
  const [pingPong, setPingPong] = useState(false)
  const [crossfadeSteps, setCrossfadeSteps] = useState(0)
  const [width, setWidth] = useState(480)
  const [fit, setFit] = useState<Fit>('contain')
  const [background, setBackground] = useState('#ffffff')
  const [colors, setColors] = useState(256)

  // The last GIF built, with the job that produced it. It may be stale while a new one is building.
  const [built, setBuilt] = useState<{ job: GifJob; bytes?: Uint8Array; url?: string; error?: string } | null>(null)
  const [progress, setProgress] = useState<{ job: GifJob; text: string } | null>(null)

  usePastedFiles(addFiles)

  const frameMs = SPEEDS[speedIndex] * 1000
  const timeline = useMemo(
    () => buildTimeline(frames.length, { frameMs, pauseMs, loop, pingPong, crossfadeSteps }),
    [frames.length, frameMs, pauseMs, loop, pingPong, crossfadeSteps],
  )
  const tooManyFrames = timeline.length > MAX_OUTPUT_FRAMES
  const first = frames[0]

  // Everything the GIF depends on. A new object means the preview must be rebuilt.
  const job = useMemo<GifJob | null>(() => {
    if (!first || tooManyFrames) return null
    const size = gifSize(first.width, first.height, width)
    return { images: frames.map((f) => f.blob), ...size, fit, background, timeline, colors, loop }
  }, [frames, first, tooManyFrames, width, fit, background, timeline, colors, loop])

  const upToDate = built !== null && built.job === job
  const gifBytes = upToDate ? built.bytes : undefined
  const progressText = progress?.job === job ? progress.text : null
  useRevokeUnusedUrls([...frames.map((f) => f.previewUrl), ...(built?.url ? [built.url] : [])])

  // Rebuild the preview shortly after anything changes; cancel any build in progress.
  useEffect(() => {
    if (!job) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setProgress({ job, text: 'Preparing preview…' })
      try {
        const bytes = await makeGif(
          job,
          (done, total) => setProgress({ job, text: `Building GIF: frame ${done} of ${total}…` }),
          controller.signal,
        )
        const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/gif' }))
        setBuilt({ job, bytes, url })
      } catch (error) {
        if (controller.signal.aborted) return
        setBuilt({ job, error: errorMessage(error) })
      } finally {
        if (!controller.signal.aborted) setProgress(null)
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [job])

  async function addFiles(files: File[]) {
    setStatus(null)
    const errors: string[] = []
    const added: Frame[] = []
    for (const file of files) {
      try {
        if (isPdf(file)) added.push(...(await pdfFrames(file, setLoading)))
        else if (file.type.startsWith('image/')) added.push(await imageFrame(file, file.name))
        else errors.push(`${file.name} is not an image or PDF.`)
      } catch (error) {
        errors.push(errorMessage(error))
      }
    }
    setLoading(null)
    setFrames((prev) => {
      const room = MAX_IMAGES - prev.length
      if (added.length > room) errors.push(`Only the first ${MAX_IMAGES} images are used.`)
      return [...prev, ...added.slice(0, Math.max(0, room))]
    })
    if (errors.length > 0) setStatus({ kind: 'error', message: errors.join(' ') })
  }

  function download() {
    if (!gifBytes || !first) return
    const name = `${baseName(first.name.replace(/ – page \d+$/, ''))}.gif`
    downloadBytes(gifBytes, name, 'image/gif')
    setStatus({ kind: 'success', message: `Saved ${name} (${formatBytes(gifBytes.length)}).` })
  }

  const seconds = SPEEDS[speedIndex]
  const duration = timelineDuration(timeline) / 1000

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader
        title="Make a GIF"
        description="Turn images or PDF pages into an animated GIF. Choose the speed, looping and size, and see the result before you download it."
      />
      <Dropzone
        accept="image/*,application/pdf,.pdf"
        label="Drop images or PDFs here, or paste with Ctrl+V"
        hint="Each PDF page becomes a frame"
        onFiles={addFiles}
      />
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400" role="status">{loading}</p>}

      <SortableFileList items={frames} onChange={setFrames} />

      {frames.length > 0 && (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
            <div className="grid content-start gap-6 sm:grid-cols-2">
              <Field label="Speed">
                <input
                  type="range"
                  min={0}
                  max={SPEEDS.length - 1}
                  value={speedIndex}
                  onChange={(e) => setSpeedIndex(Number(e.target.value))}
                  aria-label="Time per image"
                  aria-valuetext={`${formatSeconds(seconds)} per image`}
                  className="w-full accent-brand-600"
                />
                <p className="text-sm">
                  <strong>{formatSeconds(seconds)}</strong> per image
                  <span className="text-slate-500 dark:text-slate-400"> · {Number((1 / seconds).toFixed(1))} images per second</span>
                </p>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400" aria-hidden>
                  <span>Faster</span>
                  <span>Slower</span>
                </div>
              </Field>

              <Field label="Repeat">
                <RadioGroup
                  name="gif-loop"
                  value={loop}
                  onChange={setLoop}
                  options={[
                    { value: 'forever', label: 'Loop forever' },
                    { value: 'once', label: 'Play once' },
                  ]}
                />
              </Field>

              <Field label="Direction">
                <RadioGroup
                  name="gif-direction"
                  value={pingPong ? 'pingpong' : 'forward'}
                  onChange={(v) => setPingPong(v === 'pingpong')}
                  options={[
                    { value: 'forward', label: 'Forwards' },
                    { value: 'pingpong', label: 'Back and forth' },
                  ]}
                />
              </Field>

              {loop === 'forever' && (
                <Field label="Pause before repeating">
                  <RadioGroup
                    name="gif-pause"
                    value={pauseMs}
                    onChange={setPauseMs}
                    options={[
                      { value: 0, label: 'None' },
                      { value: 1000, label: '1 s' },
                      { value: 2000, label: '2 s' },
                      { value: 3000, label: '3 s' },
                    ]}
                  />
                </Field>
              )}

              <Field label="Transition">
                <RadioGroup
                  name="gif-transition"
                  value={crossfadeSteps}
                  onChange={setCrossfadeSteps}
                  options={[
                    { value: 0, label: 'Cut' },
                    { value: 3, label: 'Quick fade' },
                    { value: 8, label: 'Slow fade' },
                  ]}
                />
                {crossfadeSteps > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fades add frames, so the file gets bigger.</p>
                )}
              </Field>

              <Field label="Width">
                <RadioGroup
                  name="gif-width"
                  value={width}
                  onChange={setWidth}
                  options={[320, 480, 640, 800].map((w) => ({ value: w, label: `${w} px` }))}
                />
              </Field>

              <Field label="Images with a different shape">
                <RadioGroup
                  name="gif-fit"
                  value={fit}
                  onChange={setFit}
                  options={[
                    { value: 'contain', label: 'Show whole image' },
                    { value: 'cover', label: 'Fill and crop' },
                  ]}
                />
                {fit === 'contain' && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="color"
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      className="h-7 w-10 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-slate-700"
                    />
                    Background colour
                  </label>
                )}
              </Field>

              <Field label="Quality">
                <RadioGroup
                  name="gif-colors"
                  value={colors}
                  onChange={setColors}
                  options={[
                    { value: 256, label: 'Best' },
                    { value: 128, label: 'Balanced' },
                    { value: 64, label: 'Smallest file' },
                  ]}
                />
              </Field>
            </div>

            <section aria-label="Preview" className="flex flex-col gap-3 self-start rounded-xl border lg:sticky lg:top-4 border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold">Preview</h3>
              <div className="flex min-h-40 items-center justify-center rounded-lg bg-[repeating-conic-gradient(#e2e8f0_0_25%,transparent_0_50%)] bg-[length:16px_16px] dark:bg-[repeating-conic-gradient(#1e293b_0_25%,transparent_0_50%)]">
                {built?.url ? (
                  <img
                    src={built.url}
                    alt="Animated preview of the GIF"
                    className={`max-h-96 max-w-full transition-opacity ${upToDate ? '' : 'opacity-50'}`}
                  />
                ) : (
                  <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">{progressText ?? 'Preparing preview…'}</p>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
                {timeline.length} frames · {job?.width}×{job?.height} px ·{' '}
                {loop === 'forever' ? `${Number(duration.toFixed(2))} s per loop` : `${Number(duration.toFixed(2))} s long`}
                {gifBytes && ` · ${formatBytes(gifBytes.length)}`}
                {!upToDate && built?.url && ' · updating…'}
              </p>
              {tooManyFrames && (
                <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                  That makes {timeline.length} frames, more than the {MAX_OUTPUT_FRAMES} allowed. Remove images or turn off the fade.
                </p>
              )}
              {upToDate && built.error && (
                <p role="alert" className="text-sm text-red-700 dark:text-red-300">{built.error}</p>
              )}
            </section>
          </div>

          <Actions>
            <PrimaryButton busy={!gifBytes && !built?.error && !tooManyFrames} disabled={!gifBytes} onClick={download}>
              {gifBytes || built?.error || tooManyFrames ? 'Download GIF' : 'Building GIF…'}
            </PrimaryButton>
            <SecondaryButton onClick={() => setFrames([])}>Clear all</SecondaryButton>
          </Actions>
        </>
      )}
      <StatusMessage status={status} />
    </div>
  )
}

async function imageFrame(blob: Blob, name: string): Promise<Frame> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    throw new Error(`${name} is not an image your browser can read.`)
  }
  const { width, height } = bitmap
  bitmap.close()
  return {
    id: `gif-${nextId++}`,
    name,
    detail: `${width}×${height}`,
    blob,
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
  }
}

async function pdfFrames(file: File, setLoading: (message: string | null) => void): Promise<Frame[]> {
  // pdf.js is large, so it is only loaded once a PDF is added.
  const { openPdf, renderPages } = await import('../core/pdfToImages')
  setLoading(`Reading ${file.name}…`)
  const doc = await openPdf(await readFile(file), file.name)
  try {
    const indices = [...Array(Math.min(doc.numPages, MAX_IMAGES)).keys()]
    const pages = await renderPages(doc, indices, { format: 'png', dpi: PDF_DPI, quality: 1 }, (done, total) =>
      setLoading(`Reading ${file.name}: page ${done} of ${total}…`),
    )
    const base = baseName(file.name)
    return Promise.all(
      pages.map((p) => imageFrame(new Blob([p.bytes as Uint8Array<ArrayBuffer>], { type: 'image/png' }), `${base} – page ${p.index + 1}`)),
    )
  } finally {
    void doc.loadingTask.destroy()
  }
}
