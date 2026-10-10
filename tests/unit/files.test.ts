import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { baseName, formatBytes, zipFiles } from '../../src/core/files'

describe('files', () => {
  it('strips extensions', () => {
    expect(baseName('report.final.pdf')).toBe('report.final')
    expect(baseName('.hidden')).toBe('.hidden')
  })

  it('zips files and keeps duplicate names apart', () => {
    const zip = zipFiles([
      { name: 'a.pdf', bytes: new Uint8Array([1]) },
      { name: 'a.pdf', bytes: new Uint8Array([2]) },
    ])
    const entries = unzipSync(zip)
    expect(Object.keys(entries).sort()).toEqual(['a (2).pdf', 'a.pdf'])
    expect([...entries['a (2).pdf']]).toEqual([2])
  })

  it('formats sizes', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
