import { describe, expect, it } from 'vitest'
import { formatPageRanges, parsePageRanges } from '../../src/core/pageRanges'

describe('parsePageRanges', () => {
  it('parses single pages and ranges into sorted zero-based indices', () => {
    expect(parsePageRanges('7, 1-3', 10)).toEqual([0, 1, 2, 6])
  })

  it('supports open-ended ranges', () => {
    expect(parsePageRanges('8-', 10)).toEqual([7, 8, 9])
    expect(parsePageRanges('-2', 10)).toEqual([0, 1])
  })

  it('removes duplicates and ignores empty parts and spaces', () => {
    expect(parsePageRanges(' 2 - 4 ,, 3 ,', 5)).toEqual([1, 2, 3])
  })

  it.each([
    ['', /at least one page/],
    ['abc', /not a valid/],
    ['0', /start at 1/],
    ['5-3', /backwards/],
    ['12', /does not exist/],
  ])('rejects %j', (input, message) => {
    expect(() => parsePageRanges(input, 10)).toThrow(message)
  })
})

describe('formatPageRanges', () => {
  it('compacts consecutive pages', () => {
    expect(formatPageRanges([6, 0, 1, 2, 9])).toBe('1-3, 7, 10')
  })
})
