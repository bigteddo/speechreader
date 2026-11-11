# speechreader

## 2.0.0

### Major Changes

- Rewritten in TypeScript; the legacy JavaScript sources were removed. The package now ships CommonJS, ESM and type declarations from `dist/`.

### Minor Changes

- Add word highlighting while reading: `onWordBoundary` callback, `highlight(container, options)` with an opt-in `estimate` fallback, `play({ mode: 'chunks' })` to track words via per-word utterances in browsers that do not fire `boundary` events (Firefox, Safari, Linux), and exported `computeWordRanges`/`wordRangeAt` helpers.

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
