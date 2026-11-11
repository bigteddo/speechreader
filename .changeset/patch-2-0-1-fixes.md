---
"speechreader": patch
---

- **Security:** `wrapHtmlTags()` now HTML-escapes each word. Previously, entity-encoded markup in HTML input (e.g. `&lt;img onerror=…&gt;`) was decoded by `stripHTML()` and inserted into the spans as live HTML.
- Utterance `error` events (including `interrupted` and `canceled`) now end the read cleanly: the highlight is cleared and the `wordIndex: -1` event is emitted. In chunks mode, an error stops reading cleanly instead of stalling the queue.
- Accessing the speech API no longer throws a `ReferenceError` where it does not exist (SSR, unsupported browsers). New `Synthesizer.isSupported()` static (also exported as `isSupported()`).
- Starting playback on one `Synthesizer` now stops any other instance that is playing, so it clears its highlight and emits `wordIndex: -1`. An idle instance's `stop()`/`pause()`/`resume()` no longer affect another instance's speech.
- Fill in the package `description` and `keywords`.
