import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { Dropzone } from '../components/Dropzone'
import { PdfSummary } from '../components/PdfSummary'
import type { LoadedPdf } from '../components/useSinglePdf'
import {
  Actions,
  Field,
  PrimaryButton,
  RadioGroup,
  StatusMessage,
  ToolHeader,
  errorMessage,
  inputClass,
  type Status,
} from '../components/ui'
import { downloadBytes, readFile } from '../core/browser'
import { baseName, formatBytes, zipFiles } from '../core/files'
import { parsePageRanges } from '../core/pageRanges'
import { openPdf, renderPages, type ImageFormat } from '../core/pdfToImages'

interface OpenedPdf extends LoadedPdf {
  doc: PDFDocumentProxy
}

export function PdfToImagesTool() {
  const [status, setStatus] = useState<Status>(null)
  const [pdf, setPdf] = useState<OpenedPdf | null>(null)
  const [format, setFormat] = useState<ImageFormat>('png')
  const [dpi, setDpi] = useState(150)
  const [scope, setScope] = useState<'all' | 'some'>('all')
  const [ranges, setRanges] = useState('')
  const [progress, setProgress] = useState<string | null>(null)

  // Free pdf.js resources when the document is replaced or the tool closes.
  useEffect(() => () => void pdf?.doc.loadingTask.destroy(), [pdf])

  async function load(file: File) {
    setStatus(null)
    try {
      const bytes = await readFile(file)
      const doc = await openPdf(bytes, file.name)
      setPdf({ name: file.name, size: file.size, bytes, pageCount: doc.numPages, doc })
    } catch (error) {
      setPdf(null)
      setStatus({ kind: 'error', message: errorMessage(error) })
    }
  }

  async function run() {
    if (!pdf) return
    setStatus(null)
    setProgress('Starting…')
    try {
      const indices =
        scope === 'all' ? [...Array(pdf.pageCount).keys()] : parsePageRanges(ranges, pdf.pageCount)
      const pages = await renderPages(pdf.doc, indices, { format, dpi, quality: 0.92 }, (done, total) =>
        setProgress(`Converting page ${done} of ${total}…`),
      )
      const base = baseName(pdf.name)
      const width = String(pdf.pageCount).length
      const fileName = (index: number) => `${base} - page ${String(index + 1).padStart(width, '0')}.${format}`
      const total = pages.reduce((sum, p) => sum + p.bytes.length, 0)

      if (pages.length === 1) {
        const [page] = pages
        downloadBytes(page.bytes, fileName(page.index), format === 'png' ? 'image/png' : 'image/jpeg')
        setStatus({
          kind: 'success',
          message: `Saved ${fileName(page.index)} (${page.width}×${page.height} px, ${formatBytes(total)}).`,
        })
      } else {
        const zip = zipFiles(pages.map((p) => ({ name: fileName(p.index), bytes: p.bytes })))
        downloadBytes(zip, `${base} (images).zip`, 'application/zip')
        setStatus({ kind: 'success', message: `Converted ${pages.length} pages, downloaded as a zip (${formatBytes(zip.length)}).` })
      }
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) })
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="PDF → Images" description="Save PDF pages as PNG or JPG images." />
      {pdf ? (
        <PdfSummary pdf={pdf} onClear={() => setPdf(null)} />
      ) : (
        <Dropzone accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here" onFiles={([f]) => load(f)} />
      )}

      {pdf && (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Format">
              <RadioGroup
                name="image-format"
                value={format}
                onChange={setFormat}
                options={[
                  { value: 'png', label: 'PNG' },
                  { value: 'jpg', label: 'JPG' },
                ]}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {format === 'png' ? 'Sharpest; best for text and diagrams.' : 'Smaller files; best for photos.'}
              </p>
            </Field>
            <Field label="Resolution">
              <RadioGroup
                name="dpi"
                value={dpi}
                onChange={setDpi}
                options={[
                  { value: 72, label: 'Screen (72 dpi)' },
                  { value: 150, label: 'Standard (150 dpi)' },
                  { value: 300, label: 'Print (300 dpi)' },
                ]}
              />
            </Field>
            <Field label="Pages">
              <RadioGroup
                name="image-scope"
                value={scope}
                onChange={setScope}
                options={[
                  { value: 'all', label: 'All pages' },
                  { value: 'some', label: 'Selected pages' },
                ]}
              />
              {scope === 'some' && (
                <input
                  type="text"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  placeholder={`e.g. 1, 3-4 (of ${pdf.pageCount})`}
                  className={`${inputClass} max-w-xs`}
                  aria-label="Pages to convert"
                />
              )}
            </Field>
          </div>
          <Actions>
            <PrimaryButton busy={progress !== null} disabled={scope === 'some' && ranges.trim() === ''} onClick={run}>
              {progress ?? 'Convert to images'}
            </PrimaryButton>
          </Actions>
        </>
      )}
      <StatusMessage status={status} />
    </div>
  )
}
