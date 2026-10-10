/**
 * Parses a human page selection like "1-3, 7, 10-" into sorted, unique,
 * zero-based page indices. Pages are 1-based in the input; an open range
 * ("10-") runs to the last page and "-3" starts at the first page.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const text = input.trim()
  if (text === '') throw new Error('Enter at least one page, e.g. "1-3, 5".')

  const pages = new Set<number>()
  for (const rawPart of text.split(',')) {
    const part = rawPart.trim()
    if (part === '') continue

    const match = /^(\d*)\s*-\s*(\d*)$/.exec(part)
    let start: number
    let end: number
    if (match) {
      start = match[1] === '' ? 1 : Number(match[1])
      end = match[2] === '' ? pageCount : Number(match[2])
    } else if (/^\d+$/.test(part)) {
      start = end = Number(part)
    } else {
      throw new Error(`"${part}" is not a valid page or range.`)
    }

    if (start < 1 || end < 1) throw new Error(`Pages start at 1 ("${part}").`)
    if (start > end) throw new Error(`Range "${part}" is backwards.`)
    if (end > pageCount) {
      throw new Error(`Page ${end} does not exist; the document has ${pageCount} pages.`)
    }
    for (let p = start; p <= end; p++) pages.add(p - 1)
  }

  if (pages.size === 0) throw new Error('Enter at least one page, e.g. "1-3, 5".')
  return [...pages].sort((a, b) => a - b)
}

/** Formats zero-based indices back into a compact 1-based string, e.g. "1-3, 7". */
export function formatPageRanges(indices: number[]): string {
  const sorted = [...new Set(indices)].sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++
    const end = sorted[i]
    parts.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`)
  }
  return parts.join(', ')
}
