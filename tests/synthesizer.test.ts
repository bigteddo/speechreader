import { Synthesizer } from '../src'

describe('wrapHtmlTags', () => {
    it('should wrap words with html tags', () => {
        const Synth = new Synthesizer('The quick brown fox')

        const result = Synth.wrapHtmlTags()

        const expected =
            '<span class="rsx-1">The</span> <span class="rsx-2">quick</span> <span class="rsx-3">brown</span> <span class="rsx-4">fox</span>'
        expect(result).toEqual(expected)
    })

    it('does not create empty spans for repeated whitespace', () => {
        const Synth = new Synthesizer('a  b\tc')

        expect(Synth.wrapHtmlTags()).toEqual(
            '<span class="rsx-1">a</span> <span class="rsx-2">b</span> <span class="rsx-3">c</span>',
        )
    })

    it('ignores leading and trailing whitespace', () => {
        const Synth = new Synthesizer('  hello  ')

        expect(Synth.wrapHtmlTags()).toEqual('<span class="rsx-1">hello</span>')
    })
})
