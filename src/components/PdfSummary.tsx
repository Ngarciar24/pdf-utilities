import { formatBytes } from '../core/files'
import type { LoadedPdf } from './useSinglePdf'
import { PdfIcon, SecondaryButton } from './ui'

export function PdfSummary({ pdf, onClear }: { pdf: LoadedPdf; onClear: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      {PdfIcon}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{pdf.name}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pdf.pageCount} {pdf.pageCount === 1 ? 'page' : 'pages'} · {formatBytes(pdf.size)}
        </p>
      </div>
      <SecondaryButton onClick={onClear}>Choose another</SecondaryButton>
    </div>
  )
}
