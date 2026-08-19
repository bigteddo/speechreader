---
"speechreader": minor
---

Add word highlighting while reading: `onWordBoundary` callback, `highlight(container, options)` with an opt-in `estimate` fallback, `play({ mode: 'chunks' })` to track words via per-word utterances in browsers that do not fire `boundary` events (Firefox, Safari, Linux), and exported `computeWordRanges`/`wordRangeAt` helpers. `wrapHtmlTags` no longer creates empty spans for repeated whitespace.
