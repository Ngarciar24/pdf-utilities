import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { IconButton, SortableFileList, type ListItem } from '../components/SortableFileList'
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
import {
  convertImage,
  downloadBytes,
  extensionForType,
  readClipboardImages,
  readImageAsPngOrJpeg,
  type ImageOutputFormat,
} from '../core/browser'
import { baseName, formatBytes, zipFiles } from '../core/files'
import { imagesToPdf } from '../core/imagesToPdf'

interface PastedItem extends ListItem {
  blob: Blob
  previewUrl: string
}

let nextId = 0

function timestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`
}

export function PasteImageTool() {
  const [items, setItems] = useState<PastedItem[]>([])
  const [format, setFormat] = useState<ImageOutputFormat>('png')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  useRevokeUnusedUrls(items.map((i) => i.previewUrl))

  function add(blobs: Blob[], names?: string[]) {
    setStatus(null)
    const images = blobs.filter((b) => b.type.startsWith('image/'))
    if (images.length === 0) {
      setStatus({ kind: 'error', message: 'There is no image to paste. Copy an image or take a screenshot first.' })
      return
    }
    const stamp = timestamp()
    setItems((prev) => [
      ...prev,
      ...images.map((blob, i) => {
        const id = nextId++
        // Clipboard images are usually called "image.png"; give them a unique, dated name.
        const name =
          names?.[i] && !/^image\.\w+$/.test(names[i])
            ? baseName(names[i])
            : `Pasted image ${stamp}${images.length > 1 ? ` (${i + 1})` : ''}`
        return {
          id: `paste-${id}`,
          name: `${name}.${extensionForType(blob.type)}`,
          detail: formatBytes(blob.size),
          blob,
          previewUrl: URL.createObjectURL(blob),
        }
      }),
    ])
  }

  usePastedFiles((files) => add(files, files.map((f) => f.name)))

  async function pasteFromButton() {
    try {
      add(await readClipboardImages())
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) })
    }
  }

  async function exportItem(item: PastedItem) {
    const { bytes, type, extension } = await convertImage(item.blob, format)
    return { name: `${baseName(item.name)}.${extension}`, bytes, type }
  }

  async function downloadOne(item: PastedItem) {
    setStatus(null)
    try {
      const file = await exportItem(item)
      downloadBytes(file.bytes, file.name, file.type)
      setStatus({ kind: 'success', message: `Saved ${file.name} (${formatBytes(file.bytes.length)}).` })
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) })
    }
  }

  async function downloadAll() {
    if (items.length === 1) return downloadOne(items[0])
    setBusy(true)
    setStatus(null)
    try {
      const files = await Promise.all(items.map(exportItem))
      const zip = zipFiles(files)
      downloadBytes(zip, `Pasted images ${timestamp()}.zip`, 'application/zip')
      setStatus({ kind: 'success', message: `Saved ${files.length} images as a zip (${formatBytes(zip.length)}).` })
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  async function downloadPdf() {
    setBusy(true)
    setStatus(null)
    try {
      const images = await Promise.all(
        items.map((i) => readImageAsPngOrJpeg(new File([i.blob], i.name, { type: i.blob.type }))),
      )
      const pdf = await imagesToPdf(images)
      const name = items.length === 1 ? `${baseName(items[0].name)}.pdf` : `Pasted images ${timestamp()}.pdf`
      downloadBytes(pdf, name, 'application/pdf')
      setStatus({ kind: 'success', message: `Saved ${name} (${items.length} pages, ${formatBytes(pdf.length)}).` })
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader
        title="Paste image"
        description="Paste a screenshot or copied image and save it as a file. Press Ctrl+V (⌘V on Mac) anywhere on this page."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={pasteFromButton}
          className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-500/60 bg-brand-50/50 px-6 py-10 text-center hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none dark:bg-brand-500/5 dark:hover:bg-brand-500/10"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6m-6 0a1 1 0 0 0-1 1v1h8V5a1 1 0 0 0-1-1M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
          </svg>
          <span className="font-medium">Press Ctrl+V to paste</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">or click here to paste from the clipboard</span>
        </button>
        <div className="sm:w-1/3">
          <Dropzone accept="image/*" label="Or drop images" onFiles={(files) => add(files, files.map((f) => f.name))} />
        </div>
      </div>

      <SortableFileList
        items={items}
        onChange={setItems}
        actions={(item) => (
          <IconButton label={`Download ${item.name}`} onClick={() => downloadOne(item)}>
            <path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" />
          </IconButton>
        )}
      />

      {items.length > 0 && (
        <>
          <Field label="Save as">
            <RadioGroup
              name="paste-format"
              value={format}
              onChange={setFormat}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'jpg', label: 'JPG' },
                { value: 'original', label: 'Original format' },
              ]}
            />
          </Field>
          <Actions>
            <PrimaryButton busy={busy} onClick={downloadAll}>
              {items.length === 1 ? 'Download image' : `Download ${items.length} images (zip)`}
            </PrimaryButton>
            <SecondaryButton onClick={downloadPdf}>Save as PDF</SecondaryButton>
            <SecondaryButton onClick={() => setItems([])}>Clear all</SecondaryButton>
          </Actions>
        </>
      )}
      <StatusMessage status={status} />
    </div>
  )
}
