# speechreader

## 2.0.0

### Major Changes

- Rewritten in TypeScript; the legacy JavaScript sources were removed. The package now ships CommonJS, ESM and type declarations from `dist/`.

### Minor Changes

- Word highlighting while reading: `highlight(container, options)` toggles a class on the `rsx-N` span of the word being spoken, with optional `color` presets from the exported `HIGHLIGHT_PALETTE` and an opt-in `estimate` fallback timed by `wordsPerSecond`.
- `onWordBoundary(handler)` subscribes to `{ wordIndex, word, charIndex }` events, ending with `wordIndex: -1`; it returns an unsubscribe function.
- Reading modes: `play({ mode: 'boundary' })` (the default) follows the engine's `boundary` events, and `play({ mode: 'chunks' })` speaks one utterance per word for browsers that don't fire them (Firefox, Safari, Linux). With a highlight container bound, the default mode probes for boundary support and falls back to chunks automatically.
- Exported `computeWordRanges(text)` and `wordRangeAt(ranges, charIndex)` helpers.

### Patch Changes

- `wrapHtmlTags` no longer creates empty spans for repeated whitespace.

## 1.1.3

### Patch Changes

- 1931dc7: update readme and remove unused tests

## 1.1.2

### Patch Changes

- cc779af: updates in ci/cd pipeline

## 1.1.1

### Patch Changes

- 93416a8: add safety checks for instances of synthesizer before running actions and readme
- f53f0e0: fix ci pipeline
- 6640a4d: update CICD workflow

## 1.1.0

### Minor Changes

- d650582: nothing

### Patch Changes

- 841db41: add README conditional to avoid collision when using the synthesizer class
