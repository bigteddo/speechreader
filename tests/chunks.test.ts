import { Synthesizer, WordBoundaryEvent } from '../src'
import { FakeUtterance, installSpeechMock } from './helpers'

describe('play({ mode: "chunks" })', () => {
    let mock: ReturnType<typeof installSpeechMock>

    beforeAll(() => {
        jest.useFakeTimers()
        mock = installSpeechMock()
    })

    afterAll(() => {
        jest.useRealTimers()
    })

    afterEach(() => {
        FakeUtterance.reset()
        mock.cancel.mockClear()
        mock.speak.mockClear()
        mock.pause.mockClear()
        mock.resume.mockClear()
        mock.speaking = true
        mock.paused = false
    })

    it('speaks one word per utterance and emits each word in order', () => {
        const synth = new Synthesizer('a b c')
        const events: WordBoundaryEvent[] = []
        synth.onWordBoundary((e) => events.push(e))
        synth.play({ mode: 'chunks' })

        jest.advanceTimersByTime(1)
        expect(mock.speak).toHaveBeenCalledTimes(1)
        expect(FakeUtterance.last().text).toBe('a')
        expect(events.map((e) => e.wordIndex)).toEqual([0])

        FakeUtterance.last().fire('end')
        expect(mock.speak).toHaveBeenCalledTimes(2)
        expect(FakeUtterance.last().text).toBe('b')
        expect(events.map((e) => e.wordIndex)).toEqual([0, 1])

        FakeUtterance.last().fire('end')
        expect(mock.speak).toHaveBeenCalledTimes(3)
        expect(FakeUtterance.last().text).toBe('c')
        expect(events.map((e) => e.wordIndex)).toEqual([0, 1, 2])

        FakeUtterance.last().fire('end')
        expect(mock.speak).toHaveBeenCalledTimes(3)
        expect(events.map((e) => e.wordIndex)).toEqual([0, 1, 2, -1])
    })

    it('stop() halts the chunk chain and ignores stale end events', () => {
        const synth = new Synthesizer('a b c')
        const events: WordBoundaryEvent[] = []
        synth.onWordBoundary((e) => events.push(e))
        synth.play({ mode: 'chunks' })
        jest.advanceTimersByTime(1)

        FakeUtterance.last().fire('end')
        const second = FakeUtterance.last()
        expect(mock.speak).toHaveBeenCalledTimes(2)
        expect(events.map((e) => e.wordIndex)).toEqual([0, 1])

        synth.stop()
        expect(events.map((e) => e.wordIndex)).toEqual([0, 1, -1])

        second.fire('end')
        expect(mock.speak).toHaveBeenCalledTimes(2)
        expect(events.map((e) => e.wordIndex)).toEqual([0, 1, -1])
    })

    it('does not run the keep-alive pause/resume timer', () => {
        const synth = new Synthesizer('a b c')
        synth.play({ mode: 'chunks' })
        jest.advanceTimersByTime(1)
        jest.advanceTimersByTime(15000)
        expect(mock.pause).not.toHaveBeenCalled()
        synth.stop()
    })

    it('follows the highlight across chunks and clears it at the end', () => {
        const words = ['a', 'b', 'c']
        const elements = words.map((word, i) => new FakeElement([`rsx-${i + 1}`]))
        const container = {
            elements,
            querySelector(selector: string) {
                const cls = selector.replace(/^\./, '')
                return elements.find((el) => el.classes.has(cls)) ?? null
            },
            querySelectorAll(selector: string) {
                const cls = selector.replace(/^\./, '')
                return elements.filter((el) => el.classes.has(cls))
            },
        }
        const synth = new Synthesizer('a b c')
        synth.highlight(container as unknown as HTMLElement)
        synth.play({ mode: 'chunks' })
        jest.advanceTimersByTime(1)

        expect(highlightedIndex(elements, 'rsx-highlight')).toBe(0)
        FakeUtterance.last().fire('end')
        expect(highlightedIndex(elements, 'rsx-highlight')).toBe(1)
        FakeUtterance.last().fire('end')
        FakeUtterance.last().fire('end')
        expect(highlightedIndex(elements, 'rsx-highlight')).toBe(-1)
        synth.stop()
    })

    it('finishes immediately for empty text', () => {
        const synth = new Synthesizer('')
        const events: WordBoundaryEvent[] = []
        synth.onWordBoundary((e) => events.push(e))
        synth.play({ mode: 'chunks' })
        jest.advanceTimersByTime(1)
        expect(mock.speak).not.toHaveBeenCalled()
        expect(events.map((e) => e.wordIndex)).toEqual([-1])
    })
})

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

function highlightedIndex(elements: FakeElement[], className: string): number {
    return elements.findIndex((el) => el.classes.has(className))
}
