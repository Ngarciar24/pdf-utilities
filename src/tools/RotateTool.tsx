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
import { baseName, formatBytes } from '../core/files'
import { parsePageRanges } from '../core/pageRanges'
import { rotatePages, type Rotation } from '../core/rotate'

export function RotateTool() {
  const [status, setStatus] = useState<Status>(null)
  const { pdf, load, clear } = useSinglePdf(setStatus)
  const [rotation, setRotation] = useState<Rotation>(90)
  const [scope, setScope] = useState<'all' | 'some'>('all')
  const [ranges, setRanges] = useState('')
  const [busy, setBusy] = useState(false)

  async function run() {
    if (!pdf) return
    setBusy(true)
    setStatus(null)
    try {
      const indices = scope === 'all' ? undefined : parsePageRanges(ranges, pdf.pageCount)
      const out = await rotatePages(pdf.bytes, rotation, indices)
      const name = `${baseName(pdf.name)} (rotated).pdf`
      downloadBytes(out, name, 'application/pdf')
      const count = indices?.length ?? pdf.pageCount
      setStatus({ kind: 'success', message: `Rotated ${count} ${count === 1 ? 'page' : 'pages'}, saved ${name} (${formatBytes(out.length)}).` })
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="Rotate pages" description="Rotate every page, or just the ones you pick." />
      {pdf ? (
        <PdfSummary pdf={pdf} onClear={clear} />
      ) : (
        <Dropzone accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here" onFiles={([f]) => load(f)} />
      )}

      {pdf && (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Rotation (clockwise)">
              <RadioGroup
                name="rotation"
                value={rotation}
                onChange={setRotation}
                options={[
                  { value: 90, label: '90° ↻' },
                  { value: 180, label: '180°' },
                  { value: 270, label: '90° ↺' },
                ]}
              />
            </Field>
            <Field label="Pages">
              <RadioGroup
                name="rotate-scope"
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
                  aria-label="Pages to rotate"
                />
              )}
            </Field>
          </div>
          <Actions>
            <PrimaryButton busy={busy} disabled={scope === 'some' && ranges.trim() === ''} onClick={run}>
              Rotate &amp; download
            </PrimaryButton>
          </Actions>
        </>
      )}
      <StatusMessage status={status} />
    </div>
  )
}
