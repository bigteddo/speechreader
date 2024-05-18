"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Synthesizer = void 0;
const jsdom_1 = require("jsdom");
class Synthesizer {
    constructor(text = '', locale = 'en-US') {
        this.utter = null;
        if (this.isHTML(text)) {
            this.text = this.stripHTML(text);
        }
        else {
            this.text = text;
        }
        this.locale = locale;
    }
    play() {
        speechSynthesis.cancel();
        this.utter = new SpeechSynthesisUtterance(this.text);
        this.utter.lang = 'en-US';
        this.utter.addEventListener('end', () => {
            clearTimeout(this.timer);
        }, { passive: true });
        //IMPORTANT!! Do not remove: Logging the object out fixes some onend firing issues.
        console.log(this.utter.lang);
        // Placing the speak invocation inside a callback fixes ordering and onend issues
        setTimeout(() => {
            speechSynthesis.speak(this.utter);
        }, 0);
        this.timer = setTimeout(() => this.pauseResumeTimer(), 1000);
    }
    pauseResumeTimer() {
        speechSynthesis.pause();
        //IMPORTANT!! Do not remove: Logging the object out fixes some onend firing issues.
        console.log(this.utter.lang);
        // Placing the speak invocation inside a callback fixes ordering and onend issues
        setTimeout(() => {
            speechSynthesis.resume();
        }, 0);
        this.timer = setTimeout(() => this.pauseResumeTimer(), 1000);
    }
    pause() {
        clearTimeout(this.timer);
        speechSynthesis.pause();
    }
    resume() {
        speechSynthesis.resume();
        this.timer = setTimeout(() => this.pauseResumeTimer(), 1000);
    }
    /*    private stripHTML(html: string) {
            const doc = new DOMParser().parseFromString(html, 'text/html')
            return doc.body.textContent || ''
        }*/
    stripHTML(html) {
        const dom = new jsdom_1.JSDOM(html);
        return dom.window.document.body.textContent || '';
    }
    isHTML(text) {
        const htmlTagPattern = /<\w*(\s.*?(\='.*?'|=\".*?\")*?)?(\s\/)?>/i;
        return htmlTagPattern.test(text);
    }
    wrapHtmlTags() {
        let words = this.text.split(' ');
        words = words.map((word, index) => {
            const classNumber = index + 1;
            return `<span class="rsx-${classNumber}">${word}</span>`;
        });
        return words.join(' ');
    }
}
exports.Synthesizer = Synthesizer;
