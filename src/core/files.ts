import { zipSync } from 'fflate'

/** Strips the extension from a file name: "report.final.pdf" -> "report.final". */
export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

/** Zips files in memory. Names are made unique so nothing is overwritten. */
export function zipFiles(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  for (const { name, bytes } of files) {
    let unique = name
    for (let n = 2; unique in entries; n++) {
      const dot = name.lastIndexOf('.')
      unique = dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`
    }
    // PDFs and images are already compressed; storing is faster and barely larger.
    entries[unique] = bytes
  }
  return zipSync(entries, { level: 0 })
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
