import { Synthesizer, WordBoundaryEvent } from '../src'
import { FakeUtterance, installSpeechMock } from './helpers'

const FINISHED = { wordIndex: -1, word: '', charIndex: 0 }

describe('utterance error events', () => {
    let mock: ReturnType<typeof installSpeechMock>

    beforeAll(() => {
        jest.useFakeTimers()
        mock = installSpeechMock()
    })

    afterAll(() => {
        jest.useRealTimers()
    })

    beforeEach(() => {
        ;(Synthesizer as any).boundarySupported = true
    })

    afterEach(() => {
        FakeUtterance.reset()
        mock.speak.mockClear()
        mock.cancel.mockClear()
        jest.clearAllTimers()
    })

    function listen(synth: Synthesizer) {
        const events: WordBoundaryEvent[] = []
        synth.onWordBoundary((e) => events.push(e))
        return events
    }

    describe('boundary mode', () => {
        it.each(['synthesis-failed', 'interrupted', 'canceled'])('finishes cleanly on "%s"', (error) => {
            const synth = new Synthesizer('The quick brown fox')
            const events = listen(synth)
            synth.play()
            jest.advanceTimersByTime(1)

            const utterance = FakeUtterance.lastReal()
            utterance.fire('boundary', { name: 'word', charIndex: 4 })
            utterance.fire('error', { error })

            expect(events).toEqual([{ wordIndex: 1, word: 'quick', charIndex: 4 }, FINISHED])

            // A trailing end event after the error must not emit a second -1.
            utterance.fire('end')
            expect(events.filter((e) => e.wordIndex === -1)).toHaveLength(1)
        })

        it('clears the highlight on error', () => {
            const synth = new Synthesizer('a b')
            synth.play()
            jest.advanceTimersByTime(1)
            FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 2 })
            expect((synth as any).currentWordIndex).toBe(1)

            FakeUtterance.lastReal().fire('error', { error: 'interrupted' })
            expect((synth as any).currentWordIndex).toBe(-1)
        })

        it('ignores the stale cancel error from a previous play() of the same instance', () => {
            const synth = new Synthesizer('a b')
            const events = listen(synth)
            synth.play()
            jest.advanceTimersByTime(1)
            const first = FakeUtterance.lastReal()

            synth.play()
            jest.advanceTimersByTime(1)
            first.fire('error', { error: 'interrupted' })

            expect(events).toEqual([])
        })
    })

    describe('chunks mode', () => {
        it.each(['synthesis-failed', 'interrupted', 'canceled'])('stops reading cleanly on "%s"', (error) => {
            const synth = new Synthesizer('a b c')
            const events = listen(synth)
            synth.play({ mode: 'chunks' })
            jest.advanceTimersByTime(1)

            FakeUtterance.last().fire('error', { error })

            expect(events.map((e) => e.wordIndex)).toEqual([0, -1])
            expect(mock.speak).toHaveBeenCalledTimes(1)
        })
    })

    describe('boundary probe', () => {
        it('does not cache "unsupported" when the probe errors', () => {
            ;(Synthesizer as any).boundarySupported = null
            const synth = new Synthesizer('a b')
            synth.highlight({ querySelector: () => null, querySelectorAll: () => [] } as any)
            synth.play()

            const probe = FakeUtterance.last()
            expect(probe.volume).toBe(0)
            probe.fire('error', { error: 'interrupted' })

            expect((Synthesizer as any).boundarySupported).toBeNull()
            synth.stop()
        })
    })
})
