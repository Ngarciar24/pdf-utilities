import { useState } from 'react'
import { readFile } from '../core/browser'
import { getPageCount } from '../core/loadPdf'
import { errorMessage, type Status } from './ui'

export interface LoadedPdf {
  name: string
  size: number
  bytes: Uint8Array
  pageCount: number
}

/** State for tools that work on one PDF at a time. */
export function useSinglePdf(setStatus: (status: Status) => void) {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null)

  async function load(file: File) {
    setStatus(null)
    try {
      const bytes = await readFile(file)
      const pageCount = await getPageCount(bytes, file.name)
      setPdf({ name: file.name, size: file.size, bytes, pageCount })
    } catch (error) {
      setPdf(null)
      setStatus({ kind: 'error', message: errorMessage(error) })
    }
  }

  return { pdf, load, clear: () => setPdf(null) }
}
