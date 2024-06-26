export class Synthesizer {
    private utter: any = null
    private timer: any
    private text: string
    locale: string

    constructor(text: string = '', locale: string = 'en-US') {
        if (this.isHTML(text)) {
            this.text = this.stripHTML(text)
        } else {
            this.text = text
        }

        this.locale = locale
    }

    play() {
        if (speechSynthesis) {
            speechSynthesis.cancel()
        }
        this.utter = new SpeechSynthesisUtterance(this.text)
        this.utter.lang =  this.locale
        this.utter.addEventListener(
            'end',
            () => {
                clearTimeout(this.timer)
            },
            { passive: true },
        )
        setTimeout(() => {
            speechSynthesis.speak(this.utter)
        }, 0)

        this.timer = setTimeout(() => this.pauseResumeTimer(), 10000)
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
            this.timer = setTimeout(() => this.pauseResumeTimer(), 1000)
        }
    }

    stop() {
        if (speechSynthesis) {
            clearTimeout(this.timer)
            speechSynthesis.cancel()
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
        let words = this.text.split(' ')

        words = words.map((word, index) => {
            const classNumber = index + 1
            return `<span class="rsx-${classNumber}">${word}</span>`
        })

        return words.join(' ')
    }
}
