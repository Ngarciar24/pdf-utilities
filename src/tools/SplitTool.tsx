import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PdfSummary } from '../components/PdfSummary'
import { useSinglePdf } from '../components/useSinglePdf'
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
import { downloadBytes } from '../core/browser'
import { baseName, formatBytes, zipFiles } from '../core/files'
import { formatPageRanges, parsePageRanges } from '../core/pageRanges'
import { extractPages, splitEveryPage } from '../core/split'

type Mode = 'extract' | 'every'

export function SplitTool() {
  const [status, setStatus] = useState<Status>(null)
  const { pdf, load, clear } = useSinglePdf(setStatus)
  const [mode, setMode] = useState<Mode>('extract')
  const [ranges, setRanges] = useState('')
  const [busy, setBusy] = useState(false)

  async function run() {
    if (!pdf) return
    setBusy(true)
    setStatus(null)
    try {
      const base = baseName(pdf.name)
      if (mode === 'extract') {
        const indices = parsePageRanges(ranges, pdf.pageCount)
        const out = await extractPages(pdf.bytes, indices)
        const name = `${base} (pages ${formatPageRanges(indices).replace(/, /g, ',')}).pdf`
        downloadBytes(out, name, 'application/pdf')
        setStatus({ kind: 'success', message: `Saved ${indices.length} pages to ${name} (${formatBytes(out.length)}).` })
      } else {
        const parts = await splitEveryPage(pdf.bytes)
        const width = String(parts.length).length
        const zip = zipFiles(
          parts.map((bytes, i) => ({ name: `${base} - page ${String(i + 1).padStart(width, '0')}.pdf`, bytes })),
        )
        downloadBytes(zip, `${base} (split).zip`, 'application/zip')
        setStatus({ kind: 'success', message: `Split into ${parts.length} files, downloaded as a zip.` })
      }
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="Split PDF" description="Extract a set of pages, or split every page into its own file." />
      {pdf ? (
        <PdfSummary pdf={pdf} onClear={clear} />
      ) : (
        <Dropzone accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here" onFiles={([f]) => load(f)} />
      )}

      {pdf && (
        <>
          <Field label="Mode">
            <RadioGroup
              name="split-mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'extract', label: 'Extract pages' },
                { value: 'every', label: 'One file per page' },
              ]}
            />
          </Field>
          {mode === 'extract' && (
            <Field label="Pages">
              <input
                type="text"
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder={`e.g. 1-3, 5 (of ${pdf.pageCount})`}
                className={`${inputClass} max-w-xs`}
                aria-label="Pages to extract"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use commas and ranges: <code>1-3, 7, 10-</code>
              </p>
            </Field>
          )}
          <Actions>
            <PrimaryButton busy={busy} disabled={mode === 'extract' && ranges.trim() === ''} onClick={run}>
              {mode === 'extract' ? 'Extract pages' : `Split into ${pdf.pageCount} files`}
            </PrimaryButton>
          </Actions>
        </>
      )}
      <StatusMessage status={status} />
    </div>
  )
}
