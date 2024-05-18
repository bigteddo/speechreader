
import { Synthesizer } from '../dist'

describe('wrapHtmlTags', () => {
    it('should wrap words with html tags', () => {
        const Synth = new Synthesizer('The quick brown fox')

        const result = Synth.wrapHtmlTags()

        const expected =
            '<span class="rsx-1">The</span> <span class="rsx-2">quick</span> <span class="rsx-3">brown</span> <span class="rsx-4">fox</span>'
        expect(result).toEqual(expected)
    })

})

