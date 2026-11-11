/**
 * @jest-environment jsdom
 */
import { Synthesizer, WordBoundaryEvent, computeWordRanges } from '../src'
import { FakeUtterance, installSpeechMock } from './helpers'

function container(html: string): HTMLElement {
    const el = document.createElement('div')
    el.innerHTML = html
    document.body.appendChild(el)
    return el
}

function highlighted(el: HTMLElement): string {
    return Array.from(el.querySelectorAll('.rsx-highlight'))
        .map((s) => s.textContent)
        .join('')
}

describe('highlight(container, { inPlace: true })', () => {
    let mock: ReturnType<typeof installSpeechMock>

    beforeAll(() => {
        jest.useFakeTimers()
        mock = installSpeechMock()
        ;(Synthesizer as any).boundarySupported = true
    })

    afterAll(() => {
        jest.useRealTimers()
    })

    afterEach(() => {
        FakeUtterance.reset()
        jest.clearAllTimers()
        document.body.innerHTML = ''
        mock.speaking = true
    })

    it('wraps words inside existing markup and keeps the structure', () => {
        const el = container('<p>Hello <strong>bold</strong> world</p><ul><li>one</li><li>two</li></ul><pre><code>x = 1</code></pre>')
        const synth = new Synthesizer().highlight(el, { inPlace: true })

        expect(el.querySelector('strong')!.innerHTML).toBe('<span class="rsx-2" data-rsx-word="">bold</span>')
        expect(el.querySelectorAll('li')).toHaveLength(2)
        expect(el.querySelector('pre > code')).not.toBeNull()
        expect(el.textContent).toBe('Hello bold worldonetwox = 1')

        const words = Array.from(el.querySelectorAll('[data-rsx-word]')).map((s) => `${s.className}:${s.textContent}`)
        expect(words).toEqual([
            'rsx-1:Hello',
            'rsx-2:bold',
            'rsx-3:world',
            'rsx-4:one',
            'rsx-5:two',
            'rsx-6:x',
            'rsx-7:=',
            'rsx-8:1',
        ])

        // Spoken text separates blocks, and stays in step with computeWordRanges.
        const spoken = (synth as any).text
        expect(spoken).toBe('Hello bold world one two x = 1')
        expect(computeWordRanges(spoken).map((r) => r.word)).toEqual(['Hello', 'bold', 'world', 'one', 'two', 'x', '=', '1'])
    })

    it('speaks the container text and highlights the word at each boundary', () => {
        const el = container('<p>The <em>quick</em> fox</p>')
        const synth = new Synthesizer('ignored').highlight(el, { inPlace: true, color: 'green' })
        const events: WordBoundaryEvent[] = []
        synth.onWordBoundary((e) => events.push(e))
        synth.play()
        jest.advanceTimersByTime(1)

        const utterance = FakeUtterance.lastReal()
        expect(utterance.text).toBe('The quick fox')
        utterance.fire('boundary', { name: 'word', charIndex: 4 })
        expect(highlighted(el)).toBe('quick')
        expect(el.querySelector('.rsx-highlight--green')!.textContent).toBe('quick')
        expect(events[0]).toEqual({ wordIndex: 1, word: 'quick', charIndex: 4 })

        utterance.fire('end')
        expect(highlighted(el)).toBe('')
    })

    it('highlights every piece of a word split by inline markup', () => {
        const el = container('<p>un<b>believ</b>able day</p>')
        const synth = new Synthesizer().highlight(el, { inPlace: true })
        expect(el.querySelectorAll('.rsx-1')).toHaveLength(3)

        synth.play()
        jest.advanceTimersByTime(1)
        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 0 })
        expect(highlighted(el)).toBe('unbelievable')
        expect(el.querySelector('b')!.textContent).toBe('believ')

        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 13 })
        expect(highlighted(el)).toBe('day')
        synth.stop()
    })

    it('treats <br> as a word separator and skips script/style', () => {
        const el = container('a<br>b<script>var s = 1</script><style>p{}</style> c')
        const synth = new Synthesizer().highlight(el, { inPlace: true })

        expect((synth as any).text).toBe('a b c')
        expect(el.querySelector('script')!.textContent).toBe('var s = 1')
        expect(el.querySelectorAll('[data-rsx-word]')).toHaveLength(3)
    })

    it('never turns decoded text back into markup', () => {
        const el = container('<p>a &lt;img src=x onerror=alert(1)&gt; &amp;&amp; b</p>')
        new Synthesizer().highlight(el, { inPlace: true })

        expect(el.querySelector('img')).toBeNull()
        expect(el.textContent).toBe('a <img src=x onerror=alert(1)> && b')
    })

    it('is idempotent: highlighting again re-wraps instead of nesting', () => {
        const el = container('<p>one <i>two</i></p>')
        const synth = new Synthesizer().highlight(el, { inPlace: true })
        const once = el.innerHTML
        synth.highlight(el, { inPlace: true })

        expect(el.innerHTML).toBe(once)
        expect(el.querySelectorAll('[data-rsx-word] [data-rsx-word]')).toHaveLength(0)
    })

    it('picks up content changes when highlight is called again', () => {
        const el = container('<p>old text</p>')
        const synth = new Synthesizer().highlight(el, { inPlace: true })
        el.querySelector('p')!.append(' more')
        synth.highlight(el, { inPlace: true })

        expect((synth as any).text).toBe('old text more')
        expect(el.querySelectorAll('[data-rsx-word]')).toHaveLength(3)
    })

    it('stops current playback before re-wrapping', () => {
        const el = container('<p>a b</p>')
        const synth = new Synthesizer().highlight(el, { inPlace: true })
        synth.play()
        synth.highlight(el, { inPlace: true })
        expect(synth.state).toBe('stopped')
    })

    it('works in chunks mode', () => {
        const el = container('<ol><li>first</li><li><b>second</b></li></ol>')
        const synth = new Synthesizer().highlight(el, { inPlace: true })
        synth.play({ mode: 'chunks' })
        jest.advanceTimersByTime(1)
        expect(FakeUtterance.last().text).toBe('first')
        expect(highlighted(el)).toBe('first')

        FakeUtterance.last().fire('end')
        expect(FakeUtterance.last().text).toBe('second')
        expect(highlighted(el)).toBe('second')
        synth.stop()
    })
})
