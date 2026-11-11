# README

speechreader use the SpeechSynthesisUtterance interface of the Web Speech API 
and provider a ready to use wrapper class to start adding TTS functionality to your project.
This library is meant to be added on  PROJECT RUNNING ON A WEB BROWSER.

## Installation

With [npm](https://npmjs.com/) installed, run  :

```
$ npm install speechreader
```

## Usage

Import the synthesizer class 

```js
import { Synthesizer } from 'speechreader'
```

Use the Synthesizer to read text 
```js
 const synthesizer = new Synthesizer('I am a little tea pot')
 synthesizer.play()
```

Use the Synthesizer to read HTML text
```js
 const synthesizer = new Synthesizer('<html><h1>I am a little tea pot</h1></html>')
 synthesizer.play()
```

Set speech synthesizer locale
```js
 const synthesizer = new Synthesizer('I am a little tea pot','en-US')
 synthesizer.play()
```

Pause text reading
```js
 synthesizer.pause()
```

resume text reading
```js
 synthesizer.resume()
```

stop text reading
```js
  synthesizer.stop()
```

Check for browser support before showing TTS controls. `isSupported()` never
throws, even where the Web Speech API doesn't exist (SSR, some embedded browsers):

```js
  import { Synthesizer } from 'speechreader'

  if (Synthesizer.isSupported()) {
    // show the "read aloud" button
  }
```

If speech isn't supported, `play()` does nothing and immediately reports that
reading has ended (`wordIndex: -1`, see below).

### One reader at a time

The browser has a single speech queue, so only one `Synthesizer` can speak at
a time. Calling `play()` on one instance stops any other instance that is
playing: that instance clears its highlight and emits `wordIndex: -1`, so its
UI resets. Calling `stop()`, `pause()` or `resume()` on an instance that
isn't playing doesn't affect the one that is.

## Highlight words while reading

The synthesizer exposes the Web Speech API `boundary` event so the currently
spoken word can be highlighted in your page.

### 1. Wrap the text in per-word spans

`wrapHtmlTags()` returns the text with each word wrapped in a
`<span class="rsx-N">`:

```js
  const synthesizer = new Synthesizer('I am a little tea pot')
  document.getElementById('reader').innerHTML = synthesizer.wrapHtmlTags()
```

### 2. Bind a container and play

`highlight(container)` toggles an `rsx-highlight` class on the span of the
currently spoken word:

```js
  synthesizer.highlight(document.getElementById('reader'))
  synthesizer.play()
```

### Choose a highlight color

The library ships a small accessible palette. Pass a `color` to `highlight()`
and it applies a BEM modifier (e.g. `rsx-highlight--blue`) plus injects the
matching stylesheet, so it works with no extra CSS:

```js
  synthesizer.highlight(el, { color: 'green' })
```

Available colors: `blue` (default), `green`, `purple`, `amber`, `rose`, `teal`.
The palette is also exported for building your own pickers:

```js
  import { HIGHLIGHT_PALETTE } from 'speechreader'
  // HIGHLIGHT_PALETTE.blue = { bg: '#2563eb', fg: '#ffffff' }
```

To use your own color instead of the palette, omit `color` and style the
`rsx-highlight` class yourself:

```css
  .rsx-highlight {
    background: #2563eb;
    color: #fff;
  }
```

Options:

```js
  synthesizer.highlight(el, {
    className: 'current-word', // class to toggle (default: 'rsx-highlight')
    color: 'green',            // palette color (default: none, you style it)
    fallback: 'estimate',      // 'none' (default) or 'estimate'
    wordsPerSecond: 2.5,       // rate used by the estimate fallback
  })
```

### Reacting to word boundaries directly

If you want to drive the highlighting yourself (e.g. in a React app),
subscribe to `onWordBoundary`:

```js
  const unsubscribe = synthesizer.onWordBoundary((e) => {
    // e = { wordIndex, word, charIndex }
    // wordIndex is -1 when reading ends: normally, via stop(), on a
    // speech error (including interruption), or when another instance
    // starts playing
  })
  unsubscribe() // optional: stop receiving events
```

### Choosing a reading mode

`play()` accepts an optional reading mode:

```js
  // default: one utterance, words tracked with `boundary` events
  synthesizer.play()

  // one utterance per word, tracked with each utterance's `end` event
  synthesizer.play({ mode: 'chunks' })
```

`boundary` mode (the default) produces natural, continuous prosody but
depends on the `boundary` event, which is only fired by some speech engines —
notably Chrome/Edge on Windows and macOS. Firefox, Safari, iOS and Chrome on
Linux (eSpeak backend) do not fire `boundary` events. In those cases the
library detects this before it starts speaking and reads in `chunks` mode so
the highlight still moves — no restart, no manual switching required. If you
would prefer the timer-based `estimate` fallback instead (approximate, can
drift), set `fallback: 'estimate'` in `highlight()`.

`chunks` mode reads one word at a time (slightly choppier intonation) and
tracks the spoken word using each utterance's `end` event, which every
speech-synthesis-capable browser fires. It also makes the long-utterance
keep-alive workaround unnecessary.

On browsers without `boundary` events, you can also opt into the `estimate`
fallback of `highlight()` for a timer-based approximation — it is approximate
and can drift, but avoids the choppiness of per-word utterances.

Render the HTML produced by `wrapHtmlTags()` (not your original markup): the
span numbering must match the text that is actually spoken.

## Security

`wrapHtmlTags()` HTML-escapes every word (`&`, `<`, `>`, `"`, `'`), so from
**2.0.1** on its output is safe to assign to `innerHTML`, even for imported,
user-supplied or LLM-generated text.

On **2.0.0**, don't use `wrapHtmlTags()` with untrusted text. HTML input is
stripped with `DOMParser`, which decodes entities, so `&lt;img onerror=…&gt;`
became a live `<img>` tag in the output. Upgrade to 2.0.1 or later.

## Running the examples

There is a manual test page at `examples/synthesizer.html` that loads the
built library (`dist/index.mjs`).

Start a dev server (builds the library, then serves the examples):

```
$ npm run build   # only needed the first time, or after editing src/
$ npm run dev
```

`npm run dev` starts a zero-dependency server at
<http://localhost:5173> and opens the synthesizer example directly at
<http://localhost:5173/examples/synthesizer.html>.

After changing source code in `src/`, rebuild and refresh the page:

```
$ npm run build
```

Tip: point the browser at the page and use the "test boundary support"
button to see whether your browser fires `boundary` events. On browsers
without support, the library automatically falls back to `chunks` mode.
