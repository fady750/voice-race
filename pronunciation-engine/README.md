# Local Arabic phoneme comparison engine

This folder is deliberately independent of the game UI and gameplay. It is a deterministic comparison layer, **not** speech-to-text and not an audio model.

## What it does

`phonemizeArabic()` accepts fully vocalized Arabic and produces a compact phoneme reference with consonants, short/long vowels, tanween, sukoon, and doubled consonants for shadda.

`evaluatePronunciation()` accepts that reference plus phonemes from an acoustic model/forced aligner and returns a structured result containing substitutions, insertion/deletion, haraka/tanween, shadda, and madd errors. It never treats a browser transcript as proof of pronunciation.

Run the deterministic comparator benchmark:

```powershell
node pronunciation-engine/benchmark.mjs
```

It contains exactly 10 fully vocalized prompts and 39 synthetic phoneme cases. These tests validate the comparison rules only; they are not audio-model accuracy claims.

## Model boundary

Recommended local adapters:

1. **Quran Muaalem v3.2** for Hafs Qur'an material. Its QPS/multi-level output includes phonemes and tajweed attributes, and the code/model are MIT-licensed. It needs a local Python runtime; its published 0.6B F32 model is not a browser-native model.
2. **An IqraEval-trained MSA phoneme recognizer** for fully vocalized non-Qur'anic MSA lessons. IqraEval supplies the relevant phoneme benchmark/phonetizer; do not treat it as a single production model.

The adapter must send tokens such as:

```js
{ id: "D", kind: "consonant", durationMs: 78, confidence: 0.91 }
```

and preserve `startMs`/`durationMs` when available. The comparator uses the child’s own median vowel/consonant duration to judge madd/shadda ratios, avoiding rigid millisecond thresholds. Low model confidence returns `needsRetry` rather than a wrong verdict.

## Not yet proven

No child recordings or local acoustic model weights are bundled with this repository. Therefore the benchmark output only proves that `expected ض, detected ظ` and similar structured cases are classified correctly once a phoneme model supplies that observation. It does not prove that a model hears a child’s ض/ظ distinction. Before integration, run every benchmark prompt with correct and controlled-wrong recordings from speaker-disjoint children, varied microphones/noise, and report false acceptance/rejection by phoneme.
