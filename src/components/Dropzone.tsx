import { useId, useRef, useState, type DragEvent } from 'react'

interface DropzoneProps {
  accept: string
  multiple?: boolean
  label: string
  hint?: string
  onFiles: (files: File[]) => void
}

export function Dropzone({ accept, multiple = true, label, hint, onFiles }: DropzoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const files = [...event.dataTransfer.files]
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        dragging
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
          : 'border-slate-300 hover:border-brand-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900'
      }`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <span className="font-medium">{label}</span>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        or <span className="text-brand-600 underline">browse</span>
        {hint ? ` · ${hint}` : ''}
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          if (files.length > 0) onFiles(files)
          // Allow choosing the same file again.
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
    </label>
  )
}
