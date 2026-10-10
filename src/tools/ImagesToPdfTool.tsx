import { useEffect, useRef, useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { SortableFileList, type ListItem } from '../components/SortableFileList'
import {
  Actions,
  Field,
  PrimaryButton,
  RadioGroup,
  SecondaryButton,
  StatusMessage,
  ToolHeader,
  errorMessage,
  inputClass,
  type Status,
} from '../components/ui'
import { downloadBytes, readImageAsPngOrJpeg } from '../core/browser'
import { baseName, formatBytes } from '../core/files'
import { imagesToPdf, type Orientation, type PageSize } from '../core/imagesToPdf'

interface ImageItem extends ListItem {
  file: File
  previewUrl: string
}

let nextId = 0

export function ImagesToPdfTool() {
  const [items, setItems] = useState<ImageItem[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('fit')
  const [orientation, setOrientation] = useState<Orientation>('auto')
  const [marginMm, setMarginMm] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  // Release preview URLs when items are removed or the tool unmounts.
  const urls = useRef(new Set<string>())
  useEffect(() => {
    const current = new Set(items.map((i) => i.previewUrl))
    for (const url of urls.current) if (!current.has(url)) URL.revokeObjectURL(url)
    urls.current = current
  }, [items])
  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  function addFiles(files: File[]) {
    setStatus(null)
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length < files.length) {
      setStatus({ kind: 'error', message: 'Some files were skipped because they are not images.' })
    }
    setItems((prev) => [
      ...prev,
      ...images.map((file) => ({
        id: `img-${nextId++}`,
        name: file.name,
        detail: formatBytes(file.size),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ])
  }

  async function create() {
    setBusy(true)
    setStatus(null)
    try {
      const images = await Promise.all(items.map((i) => readImageAsPngOrJpeg(i.file)))
      const pdf = await imagesToPdf(images, { pageSize, orientation, marginMm })
      const name = items.length === 1 ? `${baseName(items[0].name)}.pdf` : 'images.pdf'
      downloadBytes(pdf, name, 'application/pdf')
      setStatus({ kind: 'success', message: `Created ${name} (${items.length} pages, ${formatBytes(pdf.length)}).` })
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ToolHeader title="Images → PDF" description="Turn PNG, JPG and other images into a PDF, one image per page." />
      <Dropzone accept="image/*" label="Drop images here" hint="PNG, JPG, WebP, GIF…" onFiles={addFiles} />
      <SortableFileList items={items} onChange={setItems} />

      {items.length > 0 && (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Page size">
              <RadioGroup
                name="page-size"
                value={pageSize}
                onChange={setPageSize}
                options={[
                  { value: 'fit', label: 'Fit image' },
                  { value: 'a4', label: 'A4' },
                  { value: 'letter', label: 'Letter' },
                ]}
              />
            </Field>
            {pageSize !== 'fit' && (
              <Field label="Orientation">
                <RadioGroup
                  name="orientation"
                  value={orientation}
                  onChange={setOrientation}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'portrait', label: 'Portrait' },
                    { value: 'landscape', label: 'Landscape' },
                  ]}
                />
              </Field>
            )}
            <Field label="Margin (mm)">
              <input
                type="number"
                min={0}
                max={50}
                value={marginMm}
                onChange={(e) => setMarginMm(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputClass} w-24`}
                aria-label="Margin in millimetres"
              />
            </Field>
          </div>

          <Actions>
            <PrimaryButton busy={busy} onClick={create}>
              Create PDF
            </PrimaryButton>
            <SecondaryButton onClick={() => setItems([])}>Clear all</SecondaryButton>
          </Actions>
        </>
      )}
      <StatusMessage status={status} />
    </div>
  )
}
