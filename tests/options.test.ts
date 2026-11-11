import { Synthesizer, getVoices } from '../src'
import { FakeUtterance, installSpeechMock } from './helpers'

const voice = (name: string, voiceURI = name) => ({ name, voiceURI, lang: 'en-US' }) as any

describe('speech options', () => {
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
        mock.getVoices.mockImplementation(() => [voice('Alice'), voice('Bob', 'urn:bob')])
    })

    afterEach(() => {
        FakeUtterance.reset()
        jest.clearAllTimers()
        mock.speaking = true
        mock.paused = false
    })

    it('applies constructor options to the boundary-mode utterance', () => {
        const synth = new Synthesizer('a b', 'en-GB', { rate: 1.5, pitch: 0.8, volume: 0.5, voice: 'Alice' })
        synth.play()
        jest.advanceTimersByTime(1)

        const u = FakeUtterance.lastReal()
        expect(u.lang).toBe('en-GB')
        expect(u.rate).toBe(1.5)
        expect(u.pitch).toBe(0.8)
        expect(u.volume).toBe(0.5)
        expect(u.voice.name).toBe('Alice')
        synth.stop()
    })

    it('applies options to every chunk utterance', () => {
        const synth = new Synthesizer('a b', 'en-US', { rate: 2, pitch: 1.2 })
        synth.play({ mode: 'chunks' })
        jest.advanceTimersByTime(1)
        const first = FakeUtterance.last()
        first.fire('end')
        const second = FakeUtterance.last()

        for (const u of [first, second]) {
            expect(u.rate).toBe(2)
            expect(u.pitch).toBe(1.2)
        }
        synth.stop()
    })

    it('play() options override the defaults for that playback only', () => {
        const synth = new Synthesizer('a b', 'en-US', { rate: 1.5, pitch: 0.8 })
        synth.play({ rate: 3 })
        jest.advanceTimersByTime(1)
        expect(FakeUtterance.lastReal().rate).toBe(3)
        expect(FakeUtterance.lastReal().pitch).toBe(0.8)

        synth.play()
        jest.advanceTimersByTime(1)
        expect(FakeUtterance.lastReal().rate).toBe(1.5)
        synth.stop()
    })

    it('setOptions() updates the defaults', () => {
        const synth = new Synthesizer('a').setOptions({ volume: 0.3 })
        synth.play()
        jest.advanceTimersByTime(1)
        expect(FakeUtterance.lastReal().volume).toBe(0.3)
        synth.stop()
    })

    it('accepts a voice object, a voiceURI, and ignores an unknown voice name', () => {
        const bob = voice('Bob', 'urn:bob')
        const synth = new Synthesizer('a')

        synth.play({ voice: bob })
        jest.advanceTimersByTime(1)
        expect(FakeUtterance.lastReal().voice).toBe(bob)

        synth.play({ voice: 'urn:bob' })
        jest.advanceTimersByTime(1)
        expect(FakeUtterance.lastReal().voice.name).toBe('Bob')

        synth.play({ voice: 'Nobody' })
        jest.advanceTimersByTime(1)
        expect(FakeUtterance.lastReal().voice).toBeNull()
        synth.stop()
    })

    it('leaves utterance defaults alone when no options are given', () => {
        const synth = new Synthesizer('a')
        synth.play()
        jest.advanceTimersByTime(1)
        const u = FakeUtterance.lastReal()
        expect([u.rate, u.pitch, u.volume, u.voice]).toEqual([1, 1, 1, null])
        synth.stop()
    })

    it.each([
        [1, 500],
        [2, 250],
        [0.5, 1000],
    ])('estimate fallback timing scales with rate %s (step %sms)', (rate, stepMs) => {
        const synth = new Synthesizer('a b c d e f', 'en-US', { rate })
        synth.highlight({ querySelector: () => null, querySelectorAll: () => [] } as any, {
            fallback: 'estimate',
            wordsPerSecond: 2,
        })
        synth.play()
        jest.advanceTimersByTime(1)
        jest.advanceTimersByTime(1499) // grace period (1500ms from play()) before the estimate starts
        const index = () => (synth as any).currentWordIndex

        jest.advanceTimersByTime(stepMs - 1)
        expect(index()).toBe(-1)
        jest.advanceTimersByTime(1)
        expect(index()).toBe(0)
        jest.advanceTimersByTime(stepMs)
        expect(index()).toBe(1)
        synth.stop()
    })
})

describe('getVoices()', () => {
    let mock: ReturnType<typeof installSpeechMock>

    beforeEach(() => {
        jest.useFakeTimers()
        mock = installSpeechMock()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('resolves immediately when voices are already loaded', async () => {
        mock.getVoices.mockReturnValue([voice('Alice')])
        await expect(getVoices()).resolves.toEqual([voice('Alice')])
        expect(mock.addEventListener).not.toHaveBeenCalled()
    })

    it('waits for voiceschanged when voices load late (Chrome)', async () => {
        let loaded: any[] = []
        mock.getVoices.mockImplementation(() => loaded)
        const promise = Synthesizer.getVoices()

        expect(mock.addEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function))
        loaded = [voice('Late')]
        mock.addEventListener.mock.calls[0][1]()

        await expect(promise).resolves.toEqual([voice('Late')])
        expect(mock.removeEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function))
    })

    it('resolves with whatever is available after the timeout', async () => {
        mock.getVoices.mockReturnValue([])
        const promise = getVoices(100)
        jest.advanceTimersByTime(100)
        await expect(promise).resolves.toEqual([])
    })

    it('resolves with [] when speech synthesis is unsupported', async () => {
        delete (global as any).speechSynthesis
        await expect(getVoices()).resolves.toEqual([])
    })
})
