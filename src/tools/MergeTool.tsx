import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { SortableFileList, type ListItem } from '../components/SortableFileList'
import {
  Actions,
  PdfIcon,
  PrimaryButton,
  SecondaryButton,
  StatusMessage,
  ToolHeader,
  errorMessage,
  type Status,
} from '../components/ui'
import { downloadBytes, isPdf, readFile } from '../core/browser'
import { formatBytes } from '../core/files'
import { getPageCount } from '../core/loadPdf'
import { mergePdfs } from '../core/merge'

interface PdfItem extends ListItem {
  bytes: Uint8Array
}

let nextId = 0

export function MergeTool() {
  const [items, setItems] = useState<PdfItem[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  async function addFiles(files: File[]) {
    setStatus(null)
    const errors: string[] = []
    const added: PdfItem[] = []
    for (const file of files) {
      if (!isPdf(file)) {
        errors.push(`${file.name} is not a PDF.`)
        continue
      }
      try {
        const bytes = await readFile(file)
        const pages = await getPageCount(bytes, file.name)
        added.push({
          id: `pdf-${nextId++}`,
          name: file.name,
          detail: `${pages} ${pages === 1 ? 'page' : 'pages'} · ${formatBytes(file.size)}`,
          bytes,
        })
      } catch (error) {
        errors.push(errorMessage(error))
      }
    }
    setItems((prev) => [...prev, ...added])
    if (errors.length > 0) setStatus({ kind: 'error', message: errors.join(' ') })
  }

  async function merge() {
    setBusy(true)
    setStatus(null)
    try {
      const pdf = await mergePdfs(items.map(({ name, bytes }) => ({ name, bytes })))
      downloadBytes(pdf, 'merged.pdf', 'application/pdf')
      setStatus({ kind: 'success', message: `Merged ${items.length} files into merged.pdf (${formatBytes(pdf.length)}).` })
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="Merge PDFs" description="Combine several PDFs into one. Drag the files into the order you want." />
      <Dropzone accept="application/pdf,.pdf" label="Drop PDFs here" onFiles={addFiles} />
      <SortableFileList items={items} onChange={setItems} icon={PdfIcon} />
      {items.length > 0 && (
        <Actions>
          <PrimaryButton busy={busy} disabled={items.length < 2} onClick={merge}>
            Merge {items.length} PDFs
          </PrimaryButton>
          <SecondaryButton onClick={() => setItems([])}>Clear all</SecondaryButton>
          {items.length < 2 && <span className="text-sm text-slate-500">Add at least one more PDF.</span>}
        </Actions>
      )}
      <StatusMessage status={status} />
    </div>
  )
}
