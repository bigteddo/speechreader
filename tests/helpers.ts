export class FakeUtterance {
    static instances: FakeUtterance[] = []

    text: string
    lang = ''
    volume = 1
    rate = 1
    pitch = 1
    voice: any = null
    private listeners: Record<string, Array<(e: any) => void>> = {}

    constructor(text: string) {
        this.text = text
        FakeUtterance.instances.push(this)
    }

    static lastReal(): FakeUtterance {
        for (let i = this.instances.length - 1; i >= 0; i--) {
            if (this.instances[i].volume !== 0) {
                return this.instances[i]
            }
        }
        return this.last()
    }

    addEventListener(name: string, cb: (e: any) => void) {
        if (!this.listeners[name]) {
            this.listeners[name] = []
        }
        this.listeners[name].push(cb)
    }

    fire(name: string, e: any = {}) {
        const cbs = this.listeners[name]
        if (!cbs) {
            return
        }
        for (const cb of cbs) {
            cb(e)
        }
    }

    static last(): FakeUtterance {
        return this.instances[this.instances.length - 1]
    }

    static reset() {
        this.instances = []
    }
}

export interface FakeSpeechSynthesis {
    cancel: jest.Mock
    speak: jest.Mock
    pause: jest.Mock
    resume: jest.Mock
    getVoices: jest.Mock
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
    speaking: boolean
    paused: boolean
}

export function installSpeechMock(): FakeSpeechSynthesis {
    const mock: FakeSpeechSynthesis = {
        cancel: jest.fn(),
        speak: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        getVoices: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        speaking: true,
        paused: false,
    }
    ;(global as any).speechSynthesis = mock
    ;(global as any).SpeechSynthesisUtterance = FakeUtterance
    return mock
}
