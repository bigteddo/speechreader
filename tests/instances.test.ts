import { Synthesizer, WordBoundaryEvent } from '../src'
import { FakeUtterance, installSpeechMock } from './helpers'

const FINISHED = { wordIndex: -1, word: '', charIndex: 0 }

describe('multiple instances', () => {
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
        mock.cancel.mockClear()
        mock.pause.mockClear()
        mock.resume.mockClear()
        jest.clearAllTimers()
    })

    function setup(text: string) {
        const synth = new Synthesizer(text)
        const events: WordBoundaryEvent[] = []
        synth.onWordBoundary((e) => events.push(e))
        return { synth, events }
    }

    it('starting B stops A: A clears its highlight and emits -1', () => {
        const a = setup('one two')
        const b = setup('three four')
        a.synth.play()
        jest.advanceTimersByTime(1)
        const aUtterance = FakeUtterance.lastReal()
        aUtterance.fire('boundary', { name: 'word', charIndex: 4 })
        expect((a.synth as any).currentWordIndex).toBe(1)

        b.synth.play()

        expect(a.events).toEqual([{ wordIndex: 1, word: 'two', charIndex: 4 }, FINISHED])
        expect((a.synth as any).currentWordIndex).toBe(-1)
        expect(b.events).toEqual([])

        // A's late cancel error / end must not emit again.
        aUtterance.fire('error', { error: 'interrupted' })
        aUtterance.fire('end')
        expect(a.events.filter((e) => e.wordIndex === -1)).toHaveLength(1)

        jest.advanceTimersByTime(1)
        FakeUtterance.lastReal().fire('end')
        expect(b.events).toEqual([FINISHED])
    })

    it('stops a chunks-mode instance when another takes over', () => {
        const a = setup('a b c')
        const b = setup('x y')
        a.synth.play({ mode: 'chunks' })
        jest.advanceTimersByTime(1)

        b.synth.play({ mode: 'chunks' })
        jest.advanceTimersByTime(1)

        expect(a.events.map((e) => e.wordIndex)).toEqual([0, -1])
        expect(b.events.map((e) => e.wordIndex)).toEqual([0])
        expect(FakeUtterance.last().text).toBe('x')
    })

    it('does not stop an instance that already finished', () => {
        const a = setup('a')
        const b = setup('b')
        a.synth.play()
        jest.advanceTimersByTime(1)
        FakeUtterance.lastReal().fire('end')
        expect(a.events).toEqual([FINISHED])

        b.synth.play()
        expect(a.events).toEqual([FINISHED])
    })

    it("an idle instance's stop/pause/resume do not touch another instance's speech", () => {
        const a = setup('a b')
        const b = setup('c d')
        a.synth.play()
        jest.advanceTimersByTime(1)
        b.synth.play()
        jest.advanceTimersByTime(1)
        mock.cancel.mockClear()

        a.synth.pause()
        a.synth.resume()
        a.synth.stop()

        expect(mock.cancel).not.toHaveBeenCalled()
        expect(mock.pause).not.toHaveBeenCalled()
        expect(mock.resume).not.toHaveBeenCalled()

        b.synth.stop()
        expect(mock.cancel).toHaveBeenCalledTimes(1)
    })

    it('stop() during the boundary probe prevents playback from starting later', () => {
        ;(Synthesizer as any).boundarySupported = null
        const a = setup('a b')
        a.synth.highlight({ querySelector: () => null, querySelectorAll: () => [] } as any)
        a.synth.play()
        const probe = FakeUtterance.last()
        a.synth.stop()

        probe.fire('boundary')
        jest.advanceTimersByTime(1)

        expect(FakeUtterance.instances).toHaveLength(1)
        expect(a.events).toEqual([FINISHED])
    })
})
