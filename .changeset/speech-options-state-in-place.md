---
"speechreader": minor
---

- Speech options: `rate`, `pitch`, `volume` and `voice` via the constructor's third argument, `setOptions()`, or per-`play()` overrides. They apply to every utterance, including in chunks mode, and the `estimate` fallback timing scales with `rate`.
- `getVoices()` (also `Synthesizer.getVoices()`) resolves with the available voices, waiting for `voiceschanged` when Chrome loads them late.
- `onStateChange(handler)` emits `'playing' | 'paused' | 'stopped' | 'ended' | 'error'`, plus `state`, `isPlaying` and `isPaused` getters.
- `highlight(container, { inPlace: true })` wraps words inside the container's existing markup, so rich content such as rendered markdown can be highlighted without losing its formatting.
