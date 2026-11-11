import { PlaybackState, Synthesizer } from '../src'
import { FakeUtterance, installSpeechMock } from './helpers'

describe('onStateChange / isPlaying / isPaused', () => {
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
        jest.clearAllTimers()
    })

    function setup(text = 'a b') {
        const synth = new Synthesizer(text)
        const states: PlaybackState[] = []
        const unsubscribe = synth.onStateChange((s) => states.push(s))
        return { synth, states, unsubscribe }
    }

    it('starts stopped', () => {
        const { synth, states } = setup()
        expect(synth.state).toBe('stopped')
        expect(synth.isPlaying).toBe(false)
        expect(synth.isPaused).toBe(false)
        expect(states).toEqual([])
    })

    it('playing → paused → playing → ended', () => {
        const { synth, states } = setup()
        synth.play()
        expect(synth.isPlaying).toBe(true)

        synth.pause()
        expect(synth.isPaused).toBe(true)
        expect(synth.isPlaying).toBe(false)

        synth.resume()
        expect(synth.isPlaying).toBe(true)

        jest.advanceTimersByTime(1)
        FakeUtterance.lastReal().fire('end')
        expect(states).toEqual(['playing', 'paused', 'playing', 'ended'])
        expect(synth.isPlaying).toBe(false)
    })

    it('ended in chunks mode after the last word', () => {
        const { synth, states } = setup('a')
        synth.play({ mode: 'chunks' })
        jest.advanceTimersByTime(1)
        FakeUtterance.last().fire('end')
        expect(states).toEqual(['playing', 'ended'])
    })

    it('stop() emits stopped once; stopping again does nothing', () => {
        const { synth, states } = setup()
        synth.play()
        synth.stop()
        synth.stop()
        expect(states).toEqual(['playing', 'stopped'])
    })

    it.each([
        ['synthesis-failed', 'error'],
        ['interrupted', 'stopped'],
        ['canceled', 'stopped'],
    ])('error "%s" → %s (both modes)', (error, expected) => {
        for (const mode of ['boundary', 'chunks'] as const) {
            const { synth, states } = setup()
            synth.play({ mode })
            jest.advanceTimersByTime(1)
            FakeUtterance.lastReal().fire('error', { error })
            expect(states).toEqual(['playing', expected])
        }
    })

    it('another instance taking over emits stopped on the first', () => {
        const a = setup()
        const b = setup()
        a.synth.play()
        b.synth.play()
        expect(a.states).toEqual(['playing', 'stopped'])
        expect(b.states).toEqual(['playing'])
        b.synth.stop()
    })

    it('pause/resume when not playing do not change state', () => {
        const { synth, states } = setup()
        synth.pause()
        synth.resume()
        expect(states).toEqual([])
    })

    it('restarting while playing stays playing without a duplicate event', () => {
        const { synth, states } = setup()
        synth.play()
        synth.play()
        expect(states).toEqual(['playing'])
        synth.stop()
    })

    it('unsubscribe stops notifications', () => {
        const { synth, states, unsubscribe } = setup()
        unsubscribe()
        synth.play()
        synth.stop()
        expect(states).toEqual([])
    })

    it('emits the -1 word event before the final state', () => {
        const { synth } = setup()
        const order: string[] = []
        synth.onWordBoundary((e) => order.push(`word ${e.wordIndex}`))
        synth.onStateChange((s) => order.push(s))
        synth.play()
        synth.stop()
        expect(order).toEqual(['playing', 'word -1', 'stopped'])
    })

    it('reports error when speech synthesis is unsupported', () => {
        const saved = (global as any).speechSynthesis
        delete (global as any).speechSynthesis
        try {
            const { synth, states } = setup()
            synth.play()
            expect(states).toEqual(['error'])
        } finally {
            ;(global as any).speechSynthesis = saved
        }
    })
})
