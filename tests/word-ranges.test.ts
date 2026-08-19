import { computeWordRanges, wordRangeAt } from '../src'

describe('computeWordRanges', () => {
    it('computes word offsets', () => {
        expect(computeWordRanges('The quick brown fox')).toEqual([
            { word: 'The', index: 0, start: 0, end: 3 },
            { word: 'quick', index: 1, start: 4, end: 9 },
            { word: 'brown', index: 2, start: 10, end: 15 },
            { word: 'fox', index: 3, start: 16, end: 19 },
        ])
    })

    it('skips repeated whitespace without creating empty words', () => {
        const ranges = computeWordRanges('  a   b\tc\n')

        expect(ranges.map((r) => r.word)).toEqual(['a', 'b', 'c'])
        expect(ranges.map((r) => r.start)).toEqual([2, 6, 8])
        expect(ranges.map((r) => r.index)).toEqual([0, 1, 2])
    })

    it('returns an empty array for empty text', () => {
        expect(computeWordRanges('')).toEqual([])
        expect(computeWordRanges('   ')).toEqual([])
    })
})

describe('wordRangeAt', () => {
    const ranges = computeWordRanges('The quick brown fox')

    it('finds the word at an exact start offset', () => {
        expect(wordRangeAt(ranges, 0)?.word).toBe('The')
        expect(wordRangeAt(ranges, 4)?.word).toBe('quick')
        expect(wordRangeAt(ranges, 16)?.word).toBe('fox')
    })

    it('clamps whitespace offsets to the previous word', () => {
        expect(wordRangeAt(ranges, 9)?.word).toBe('quick')
        expect(wordRangeAt(ranges, 15)?.word).toBe('brown')
    })

    it('clamps offsets before the first word and after the last word', () => {
        expect(wordRangeAt(ranges, -5)?.word).toBe('The')
        expect(wordRangeAt(ranges, 999)?.word).toBe('fox')
    })

    it('returns null for empty ranges', () => {
        expect(wordRangeAt([], 0)).toBeNull()
    })
})
