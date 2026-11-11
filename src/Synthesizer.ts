export interface WordRange {
    word: string
    index: number
    start: number
    end: number
}

export interface WordBoundaryEvent {
    wordIndex: number
    word: string
    charIndex: number
}

export type WordBoundaryHandler = (event: WordBoundaryEvent) => void

export type HighlightColor = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'teal'

export interface HighlightOptions {
    className?: string
    color?: HighlightColor
    fallback?: 'none' | 'estimate'
    wordsPerSecond?: number
}

export type ReadingMode = 'boundary' | 'chunks'

export const HIGHLIGHT_PALETTE: Record<HighlightColor, { bg: string; fg: string }> = {
    blue: { bg: '#2563eb', fg: '#ffffff' },
    green: { bg: '#16a34a', fg: '#ffffff' },
    purple: { bg: '#9333ea', fg: '#ffffff' },
    amber: { bg: '#d97706', fg: '#ffffff' },
    rose: { bg: '#e11d48', fg: '#ffffff' },
    teal: { bg: '#0d9488', fg: '#ffffff' },
}

const STYLE_ELEMENT_ID = 'rsx-highlight-palette'

function injectPaletteCSS() {
    if (typeof document === 'undefined') {
        return
    }
    if (document.getElementById(STYLE_ELEMENT_ID)) {
        return
    }
    const css = Object.entries(HIGHLIGHT_PALETTE)
        .map(([color, { bg, fg }]) => `.rsx-highlight--${color} { background: ${bg} !important; color: ${fg} !important; }`)
        .join('\n')
    const style = document.createElement('style')
    style.id = STYLE_ELEMENT_ID
    style.textContent = css
    document.head.appendChild(style)
}

export interface PlayOptions {
    mode?: ReadingMode
}

export function computeWordRanges(text: string): WordRange[] {
    const ranges: WordRange[] = []
    const pattern = /\S+/g
    let index = 0
    let match = pattern.exec(text)
    while (match !== null) {
        ranges.push({
            word: match[0],
            index,
            start: match.index,
            end: match.index + match[0].length,
        })
        index += 1
        match = pattern.exec(text)
    }
    return ranges
}

export function wordRangeAt(ranges: WordRange[], charIndex: number): WordRange | null {
    if (ranges.length === 0) {
        return null
    }
    if (charIndex <= ranges[0].start) {
        return ranges[0]
    }
    let low = 0
    let high = ranges.length - 1
    while (low < high) {
        const mid = (low + high + 1) >> 1
        if (ranges[mid].start <= charIndex) {
            low = mid
        } else {
            high = mid - 1
        }
    }
    return ranges[low]
}

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])
}

const ESTIMATE_GRACE_MS = 1500
const PROBE_TIMEOUT_MS = 800

export class Synthesizer {
    private static boundarySupported: boolean | null = null
    private utter: any = null
    private timer: any
    private text: string
    locale: string
    private wordRanges: WordRange[]
    private boundaryHandlers = new Set<WordBoundaryHandler>()
    private highlightEl: HTMLElement | null = null
    private highlightClassName = 'rsx-highlight'
    private highlightColor: HighlightColor | null = null
    private fallback: 'none' | 'estimate' = 'none'
    private wordsPerSecond = 2.5
    private currentWordIndex = -1
    private receivedBoundary = false
    private estimateDelayTimer: any = null
    private estimateTimer: any = null
    private mode: ReadingMode = 'boundary'
    private chunkIndex = 0
    private chunkActive = false

    constructor(text: string = '', locale: string = 'en-US') {
        if (this.isHTML(text)) {
            this.text = this.stripHTML(text)
        } else {
            this.text = text
        }

        this.locale = locale
        this.wordRanges = computeWordRanges(this.text)
    }

    play(options: PlayOptions = {}) {
        if (speechSynthesis) {
            speechSynthesis.cancel()
        }
        this.utter = null
        this.resetTracking()
        const requestedMode = options.mode ?? 'boundary'

        if (requestedMode === 'chunks') {
            this.mode = 'chunks'
            this.chunkIndex = 0
            this.chunkActive = true
            setTimeout(() => {
                if (this.chunkActive) {
                    this.speakNextChunk()
                }
            }, 0)
            return
        }

        if (this.highlightEl === null) {
            this.mode = 'boundary'
            this.startBoundaryMode()
            return
        }

        this.probeBoundarySupport((supported) => {
            if (this.utter !== null) {
                return
            }
            if (supported || this.fallback === 'estimate') {
                this.mode = 'boundary'
                this.startBoundaryMode()
            } else {
                this.mode = 'chunks'
                this.chunkIndex = 0
                this.chunkActive = true
                setTimeout(() => {
                    if (this.chunkActive) {
                        this.speakNextChunk()
                    }
                }, 0)
            }
        })
    }

    private startBoundaryMode() {
        const utterance = new SpeechSynthesisUtterance(this.text)
        utterance.lang = this.locale
        utterance.addEventListener(
            'end',
            () => {
                if (this.utter !== utterance) {
                    return
                }
                this.onFinished()
            },
            { passive: true },
        )
        utterance.addEventListener(
            'error',
            () => {
                if (this.utter !== utterance) {
                    return
                }
                this.onFinished()
            },
            { passive: true },
        )
        utterance.addEventListener(
            'boundary',
            (e: any) => {
                if (this.utter !== utterance) {
                    return
                }
                this.handleBoundary(e)
            },
            { passive: true },
        )
        this.utter = utterance
        setTimeout(() => {
            if (this.utter === utterance) {
                speechSynthesis.speak(utterance)
            }
        }, 0)

        this.timer = setTimeout(() => this.pauseResumeTimer(), 10000)
        this.estimateDelayTimer = setTimeout(() => {
            this.estimateDelayTimer = null
            if (this.receivedBoundary || !this.utter) {
                return
            }
            if (!speechSynthesis || !speechSynthesis.speaking) {
                return
            }
            this.startEstimate()
        }, ESTIMATE_GRACE_MS)
    }

    private probeBoundarySupport(callback: (supported: boolean) => void) {
        if (Synthesizer.boundarySupported !== null) {
            callback(Synthesizer.boundarySupported)
            return
        }
        if (!speechSynthesis) {
            Synthesizer.boundarySupported = false
            callback(false)
            return
        }
        const probe = new SpeechSynthesisUtterance('a')
        probe.lang = this.locale
        probe.volume = 0
        let resolved = false
        const resolve = (supported: boolean, cache = true) => {
            if (resolved) return
            resolved = true
            if (cache) {
                Synthesizer.boundarySupported = supported
            }
            callback(supported)
        }
        probe.addEventListener('boundary', () => resolve(true), { passive: true })
        probe.addEventListener('end', () => resolve(false), { passive: true })
        probe.addEventListener('error', () => resolve(false, false), { passive: true })
        setTimeout(() => {
            if (!resolved) {
                speechSynthesis.cancel()
                resolve(false)
            }
        }, PROBE_TIMEOUT_MS)
        speechSynthesis.speak(probe)
    }

    private pauseResumeTimer() {
        speechSynthesis.pause()
        setTimeout(() => {
            speechSynthesis.resume()
        }, 0)
        this.timer = setTimeout(() => this.pauseResumeTimer(), 10000)
    }

    pause() {
        if (speechSynthesis) {
            clearTimeout(this.timer)
            speechSynthesis.pause()
        }
    }

    resume() {
        if (speechSynthesis) {
            speechSynthesis.resume()
            if (this.mode === 'boundary') {
                this.timer = setTimeout(() => this.pauseResumeTimer(), 1000)
            }
        }
    }

    stop() {
        if (speechSynthesis) {
            clearTimeout(this.timer)
            speechSynthesis.cancel()
        }
        this.utter = null
        this.chunkActive = false
        this.onFinished()
    }

    private speakNextChunk() {
        if (!this.chunkActive) {
            return
        }
        const range = this.wordRanges[this.chunkIndex]
        if (!range) {
            this.onFinished()
            return
        }
        const utterance = new SpeechSynthesisUtterance(range.word)
        utterance.lang = this.locale
        utterance.addEventListener(
            'end',
            () => {
                if (this.utter !== utterance || !this.chunkActive) {
                    return
                }
                this.chunkIndex += 1
                this.speakNextChunk()
            },
            { passive: true },
        )
        utterance.addEventListener(
            'error',
            (e: any) => {
                if (this.utter !== utterance || !this.chunkActive) {
                    return
                }
                const reason = e && e.error
                if (reason === 'interrupted' || reason === 'canceled' || reason === 'not-allowed') {
                    // Speech was cancelled or blocked: the whole read is over.
                    this.onFinished()
                    return
                }
                // A single word failed to synthesize: skip it rather than stall the queue.
                this.chunkIndex += 1
                this.speakNextChunk()
            },
            { passive: true },
        )
        this.utter = utterance
        this.applyHighlight(range.index)
        this.emitBoundary({
            wordIndex: range.index,
            word: range.word,
            charIndex: range.start,
        })
        speechSynthesis.speak(utterance)
    }

    onWordBoundary(handler: WordBoundaryHandler): () => void {
        this.boundaryHandlers.add(handler)
        return () => {
            this.boundaryHandlers.delete(handler)
        }
    }

    highlight(container: HTMLElement | null, options: HighlightOptions = {}) {
        this.highlightEl = container ?? null
        if (options.className) {
            this.highlightClassName = options.className
        }
        if (options.color) {
            this.highlightColor = options.color
            injectPaletteCSS()
        } else if (options.color !== undefined) {
            this.highlightColor = null
        }
        if (options.fallback) {
            this.fallback = options.fallback
        }
        if (options.wordsPerSecond) {
            this.wordsPerSecond = options.wordsPerSecond
        }
        if (container) {
            container.querySelectorAll(`.${this.highlightClassName}`).forEach((el) => {
                el.classList.remove(this.highlightClassName)
                this.clearAllColorModifiers(el as HTMLElement)
            })
        }
        this.applyHighlight(this.currentWordIndex, true)
        return this
    }

    private highlightColorClass(): string | null {
        return this.highlightColor ? `${this.highlightClassName}--${this.highlightColor}` : null
    }

    private clearAllColorModifiers(el: HTMLElement) {
        for (const color of Object.keys(HIGHLIGHT_PALETTE) as HighlightColor[]) {
            el.classList.remove(`${this.highlightClassName}--${color}`)
        }
    }

    private handleBoundary(e: any) {
        const name = e && e.name ? e.name : 'word'
        if (name !== 'word') {
            return
        }
        const charIndex = typeof e.charIndex === 'number' ? e.charIndex : 0
        const range = wordRangeAt(this.wordRanges, charIndex)
        if (!range) {
            return
        }
        this.receivedBoundary = true
        this.stopEstimate()
        this.applyHighlight(range.index)
        this.emitBoundary({
            wordIndex: range.index,
            word: range.word,
            charIndex,
        })
    }

    private emitBoundary(event: WordBoundaryEvent) {
        this.boundaryHandlers.forEach((handler) => handler(event))
    }

    private applyHighlight(index: number, force = false) {
        if (!force && index === this.currentWordIndex) {
            return
        }
        const el = this.highlightEl
        if (el) {
            if (this.currentWordIndex >= 0) {
                const prev = el.querySelector(`.rsx-${this.currentWordIndex + 1}`) as HTMLElement | null
                if (prev) {
                    prev.classList.remove(this.highlightClassName)
                    this.clearAllColorModifiers(prev)
                }
            }
            if (index >= 0) {
                const next = el.querySelector(`.rsx-${index + 1}`) as HTMLElement | null
                if (next) {
                    next.classList.add(this.highlightClassName)
                    const colorClass = this.highlightColorClass()
                    if (colorClass) {
                        next.classList.add(colorClass)
                    }
                }
            }
        }
        this.currentWordIndex = index
    }

    private resetTracking() {
        this.stopEstimate()
        this.receivedBoundary = false
        this.applyHighlight(-1)
    }

    private onFinished() {
        clearTimeout(this.timer)
        this.utter = null
        this.stopEstimate()
        this.chunkActive = false
        this.applyHighlight(-1)
        this.emitBoundary({ wordIndex: -1, word: '', charIndex: 0 })
    }

    private startEstimate() {
        if (this.estimateTimer !== null) {
            return
        }
        const intervalMs = Math.max(25, Math.round(1000 / this.wordsPerSecond))
        this.estimateTimer = setInterval(() => {
            if (!speechSynthesis || !speechSynthesis.speaking || speechSynthesis.paused) {
                return
            }
            const next = this.currentWordIndex + 1
            if (next >= this.wordRanges.length) {
                this.stopEstimate()
                return
            }
            this.applyHighlight(next)
        }, intervalMs)
    }

    private stopEstimate() {
        if (this.estimateDelayTimer !== null) {
            clearTimeout(this.estimateDelayTimer)
            this.estimateDelayTimer = null
        }
        if (this.estimateTimer !== null) {
            clearInterval(this.estimateTimer)
            this.estimateTimer = null
        }
    }

    private stripHTML(html: string) {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        return doc.body.textContent || ''
    }

    private isHTML(text: string): boolean {
        const htmlTagPattern = /<\w*(\s.*?(\='.*?'|=\".*?\")*?)?(\s\/)?>/i
        return htmlTagPattern.test(text)
    }

    wrapHtmlTags(): string {
        return this.wordRanges
            .map((range) => `<span class="rsx-${range.index + 1}">${escapeHtml(range.word)}</span>`)
            .join(' ')
    }
}
