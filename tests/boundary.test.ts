import { Synthesizer, WordBoundaryEvent } from '../src'
import { FakeUtterance, installSpeechMock } from './helpers'

describe('onWordBoundary', () => {
    let mock: ReturnType<typeof installSpeechMock>

    beforeAll(() => {
        mock = installSpeechMock()
        ;(Synthesizer as any).boundarySupported = true
    })

    afterEach(() => {
        FakeUtterance.reset()
        mock.speaking = true
        mock.paused = false
    })

    it('emits mapped word events and a terminal event on end', (done) => {
        const synth = new Synthesizer('The quick brown fox')
        const events: WordBoundaryEvent[] = []
        const unsubscribe = synth.onWordBoundary((e) => events.push(e))
        synth.play()
        setTimeout(() => {
            const utterance = FakeUtterance.lastReal()
            utterance.fire('boundary', { name: 'word', charIndex: 4 })
            utterance.fire('boundary', { name: 'word', charIndex: 16 })
            utterance.fire('boundary', { name: 'sentence', charIndex: 0 })

            expect(events).toEqual([
                { wordIndex: 1, word: 'quick', charIndex: 4 },
                { wordIndex: 3, word: 'fox', charIndex: 16 },
            ])

            utterance.fire('end')
            expect(events[events.length - 1]).toEqual({ wordIndex: -1, word: '', charIndex: 0 })

            unsubscribe()
            synth.stop()
            done()
        }, 20)
    })

    it('stops emitting after unsubscribe', (done) => {
        const synth = new Synthesizer('The quick brown fox')
        let count = 0
        const unsubscribe = synth.onWordBoundary(() => count++)
        unsubscribe()
        synth.play()
        setTimeout(() => {
            FakeUtterance.lastReal().fire('boundary', { name: 'word', charIndex: 0 })
            expect(count).toBe(0)
            synth.stop()
            done()
        }, 20)
    })

    it('ignores stale utterance events after stop', (done) => {
        const synth = new Synthesizer('The quick brown fox')
        const events: WordBoundaryEvent[] = []
        synth.onWordBoundary((e) => events.push(e))
        synth.play()
        setTimeout(() => {
            const utterance = FakeUtterance.lastReal()
            utterance.fire('boundary', { name: 'word', charIndex: 0 })
            expect(events).toHaveLength(1)

            synth.stop()
            expect(events).toHaveLength(2)

            utterance.fire('boundary', { name: 'word', charIndex: 4 })
            expect(events).toHaveLength(2)
            done()
        }, 20)
    })

    it('speak is not called with a stopped utterance', (done) => {
        mock.speak.mockClear()
        const synth = new Synthesizer('The quick brown fox')
        synth.play()
        synth.stop()
        setTimeout(() => {
            expect(mock.speak).not.toHaveBeenCalled()
            done()
        }, 20)
    })
})
