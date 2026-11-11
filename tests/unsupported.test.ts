import { Synthesizer, WordBoundaryEvent, isSupported } from '../src'
import { installSpeechMock } from './helpers'

describe('environments without speech synthesis', () => {
    beforeEach(() => {
        delete (global as any).speechSynthesis
        delete (global as any).SpeechSynthesisUtterance
        ;(Synthesizer as any).boundarySupported = null
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('isSupported() is false and does not throw', () => {
        expect(() => isSupported()).not.toThrow()
        expect(isSupported()).toBe(false)
        expect(Synthesizer.isSupported()).toBe(false)
    })

    it('isSupported() is true once the API exists', () => {
        installSpeechMock()
        expect(isSupported()).toBe(true)
        expect(Synthesizer.isSupported()).toBe(true)
    })

    it.each([undefined, 'chunks'] as const)('play/pause/resume/stop do not throw (mode %s)', (mode) => {
        const synth = new Synthesizer('a b c')
        const events: WordBoundaryEvent[] = []
        synth.onWordBoundary((e) => events.push(e))

        expect(() => {
            synth.play(mode ? { mode } : {})
            jest.runOnlyPendingTimers()
            synth.pause()
            synth.resume()
            jest.runOnlyPendingTimers()
            synth.stop()
        }).not.toThrow()
        // play() reports an immediate finish so the app's UI does not stay "playing".
        expect(events[0]).toEqual({ wordIndex: -1, word: '', charIndex: 0 })
    })

    it('play() with a highlight container does not throw', () => {
        const synth = new Synthesizer('a b')
        synth.highlight({ querySelector: () => null, querySelectorAll: () => [] } as any)
        expect(() => {
            synth.play()
            jest.runOnlyPendingTimers()
        }).not.toThrow()
    })
})
