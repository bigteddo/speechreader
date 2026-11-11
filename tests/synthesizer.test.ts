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

describe('wrapHtmlTags escaping', () => {
    it('escapes markup in plain text so it renders as text', () => {
        const Synth = new Synthesizer('a && b')

        expect(Synth.wrapHtmlTags()).toEqual(
            '<span class="rsx-1">a</span> <span class="rsx-2">&amp;&amp;</span> <span class="rsx-3">b</span>',
        )
    })

    it('escapes all of & < > " \'', () => {
        const Synth = new Synthesizer(`c>d a<b e&"'f`)

        expect(Synth.wrapHtmlTags()).toEqual(
            '<span class="rsx-1">c&gt;d</span> <span class="rsx-2">a&lt;b</span> <span class="rsx-3">e&amp;&quot;&#39;f</span>',
        )
    })

    it('does not let entity-encoded tags in HTML input turn back into live markup', () => {
        ;(global as any).DOMParser = class {
            parseFromString() {
                // Mirrors what a browser does: textContent decodes &lt;img …&gt; to <img …>
                return { body: { textContent: '<img src=x onerror=alert(1)>' } }
            }
        }
        try {
            const Synth = new Synthesizer('<p>&lt;img src=x onerror=alert(1)&gt;</p>')
            const out = Synth.wrapHtmlTags()

            expect(out).not.toContain('<img')
            expect(out).toEqual(
                '<span class="rsx-1">&lt;img</span> <span class="rsx-2">src=x</span> <span class="rsx-3">onerror=alert(1)&gt;</span>',
            )
        } finally {
            delete (global as any).DOMParser
        }
    })

    it('escapes a raw <img> payload that reaches the word list', () => {
        const Synth = new Synthesizer('')
        ;(Synth as any).wordRanges = [{ word: '<img src=x onerror=alert(1)>', index: 0, start: 0, end: 28 }]

        expect(Synth.wrapHtmlTags()).toEqual('<span class="rsx-1">&lt;img src=x onerror=alert(1)&gt;</span>')
    })
})
