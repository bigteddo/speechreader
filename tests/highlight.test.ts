import { Synthesizer } from '../src'
import { FakeUtterance, installSpeechMock } from './helpers'

class FakeElement {
    classes: Set<string>

    constructor(initial: string[]) {
        this.classes = new Set(initial)
    }

    get classList() {
        const self = this
        return {
            add: (c: string) => self.classes.add(c),
            remove: (c: string) => self.classes.delete(c),
            contains: (c: string) => self.classes.has(c),
        }
    }
}

class FakeContainer {
    elements: FakeElement[]

    constructor(words: string[]) {
        this.elements = words.map((word, i) => new FakeElement([`rsx-${i + 1}`]))
    }

    querySelector(selector: string): FakeElement | null {
        const cls = selector.replace(/^\./, '')
        return this.elements.find((el) => el.classes.has(cls)) ?? null
    }

    querySelectorAll(selector: string): FakeElement[] {
        const cls = selector.replace(/^\./, '')
        return this.elements.filter((el) => el.classes.has(cls))
    }
}

function highlightedIndex(container: FakeContainer, className: string): number {
    return container.elements.findIndex((el) => el.classes.has(className))
}

describe('highlight', () => {
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
        mock.speaking = true
        mock.paused = false
    })

    it('toggles the highlight class as boundaries arrive', () => {
        const container = new FakeContainer(['The', 'quick', 'brown', 'fox'])
        const synth = new Synthesizer('The quick brown fox')
        synth.highlight(container as unknown as HTMLElement)
        synth.play()
        jest.advanceTimersByTime(1)

        expect(highlightedIndex(container, 'rsx-highlight')).toBe(-1)

        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 0 })
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(0)

        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 4 })
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(1)
        expect(container.elements[0].classes.has('rsx-highlight')).toBe(false)

        FakeUtterance.lastReal().fire('end')
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(-1)
        synth.stop()
    })

    it('supports a custom highlight class', () => {
        const container = new FakeContainer(['a', 'b'])
        const synth = new Synthesizer('a b')
        synth.highlight(container as unknown as HTMLElement, { className: 'current-word' })
        synth.play()
        jest.advanceTimersByTime(1)

        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 2 })
        expect(highlightedIndex(container, 'current-word')).toBe(1)
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(-1)
        synth.stop()
    })

    it('applies the BEM color modifier when a highlight color is set', () => {
        const container = new FakeContainer(['a', 'b'])
        const synth = new Synthesizer('a b')
        synth.highlight(container as unknown as HTMLElement, { color: 'green' })
        synth.play()
        jest.advanceTimersByTime(1)

        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 2 })
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(1)
        expect(highlightedIndex(container, 'rsx-highlight--green')).toBe(1)
        expect(container.elements[1].classes.has('rsx-highlight--green')).toBe(true)

        FakeUtterance.lastReal().fire('end')
        expect(container.elements[1].classes.has('rsx-highlight--green')).toBe(false)
        synth.stop()
    })

    it('clears the highlight on stop', () => {
        const container = new FakeContainer(['a', 'b'])
        const synth = new Synthesizer('a b')
        synth.highlight(container as unknown as HTMLElement)
        synth.play()
        jest.advanceTimersByTime(1)

        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 0 })
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(0)

        synth.stop()
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(-1)
    })

    it('applies the current word when the container is bound mid-speech', () => {
        const container = new FakeContainer(['a', 'b', 'c'])
        const synth = new Synthesizer('a b c')
        synth.play()
        jest.advanceTimersByTime(1)

        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 2 })
        synth.highlight(container as unknown as HTMLElement)
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(1)
        synth.stop()
    })

    it('estimate fallback advances the highlight when no boundaries arrive', () => {
        const container = new FakeContainer(['a', 'b', 'c', 'd', 'e'])
        const synth = new Synthesizer('a b c d e')
        synth.highlight(container as unknown as HTMLElement, {
            fallback: 'estimate',
            wordsPerSecond: 20,
        })
        synth.play()
        jest.advanceTimersByTime(1)

        jest.advanceTimersByTime(1500)
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(-1)

        jest.advanceTimersByTime(200)
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(3)

        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 2 })
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(1)

        jest.advanceTimersByTime(10000)
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(1)
        synth.stop()
    })

    it('does not start the estimate when real boundaries arrive', () => {
        const container = new FakeContainer(['a', 'b'])
        const synth = new Synthesizer('a b')
        synth.highlight(container as unknown as HTMLElement, {
            fallback: 'estimate',
            wordsPerSecond: 100,
        })
        synth.play()
        jest.advanceTimersByTime(1)

        FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 0 })
        jest.advanceTimersByTime(2000)
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(0)
        synth.stop()
    })

    it('estimate pauses while speech is paused', () => {
        const container = new FakeContainer(['a', 'b', 'c'])
        const synth = new Synthesizer('a b c')
        synth.highlight(container as unknown as HTMLElement, {
            fallback: 'estimate',
            wordsPerSecond: 20,
        })
        synth.play()
        jest.advanceTimersByTime(1550)
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(0)

        mock.paused = true
        jest.advanceTimersByTime(1000)
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(0)

        mock.paused = false
        jest.advanceTimersByTime(100)
        expect(highlightedIndex(container, 'rsx-highlight')).toBe(2)
        synth.stop()
    })
})
