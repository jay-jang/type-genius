# CLAUDE.md — Working agreement for TypeGenius

This file tells Claude (and any AI collaborator) how to work in this repo. It is
adapted from Andrej Karpathy's coding guidelines
(https://github.com/multica-ai/andrej-karpathy-skills). The four principles below
are the contract. Follow them on every change.

---

## The Four Principles

### 1. Think Before Coding
State your assumptions explicitly. If something is ambiguous, surface it instead
of silently guessing. Before writing code, be able to say in one sentence what
problem you are solving and how you'll know it works.

- Name the assumption, then proceed — don't bury a guess inside a diff.
- Prefer asking a short clarifying question over building the wrong thing.
- Call out tradeoffs ("local-first vs. backend", "exact CPM vs. approximate")
  rather than deciding them invisibly.

### 2. Simplicity First
Write the minimum code that solves the actual problem. Nothing speculative.

- No unrequested features, no premature abstraction, no "flexible" config that
  nobody asked for.
- **If 200 lines could be 50, rewrite it.** Fewer moving parts = fewer bugs.
- This project deliberately has **no backend and no UI framework dependencies**
  beyond React + Zustand. Sounds are synthesized (no audio files); charts are
  hand-rolled SVG (no chart lib); persistence is `localStorage`. Keep it that way
  unless a real need forces otherwise.

### 3. Surgical Changes
Touch only what you must. Every changed line should trace directly to the request.

- Match the existing patterns, naming, and file layout. Don't reformat or
  refactor unrelated code "while you're in there."
- Keep pure logic (`src/lib`) free of React; keep React components free of heavy
  logic. Respect that seam.
- If a change balloons beyond the request, stop and flag it.

### 4. Goal-Driven Execution
Turn the task into verifiable success criteria, then loop until they're met.

- Define "done" before starting (e.g. "Korean IME composition types correctly
  AND CPM counts jamo AND the mistake-drill replays the wrong words").
- Verify by running it: `npm run dev`, type in both Korean and English, finish a
  passage, check the results and rankings. Don't declare success on a guess.
- `npm run typecheck` must pass.

---

## What this project is

A local-first web app for **keyboard typing practice in Korean and English**,
using real literature (poems, novels, songs, nonfiction). Core features:

- Separate practice **spaces** per language (한국어 / English) plus a **복합(mixed)**
  mode that interleaves both.
- **Mistake-repeat drills**: after a run, the words you got wrong are collected
  into a focused drill you can replay.
- **Live metrics** (speed, accuracy, time, errors, combo) and a detailed results
  screen (WPM-over-time chart, consistency, etc.).
- **Ranking system** with **per-profile** stats, levels/XP, and per-space
  leaderboards.
- **Juicy feedback** ("타격감"): synthesized key sounds, particle bursts, screen
  shake on error, combo effects, completion confetti.

## Architecture (where things live)

```
src/
  types/            shared TypeScript domain types
  lib/              PURE logic — no React
    hangul.ts       Hangul jamo decomposition + 타수 (keystroke) counting
    metrics.ts      WPM/CPM/accuracy/consistency math
    stats.ts        leaderboard / summaries / XP derived from sessions
    drill.ts        builds the "repeat your mistakes" practice text
    sound.ts        Web Audio synth engine (singleton `sound`)
    effects.ts      DOM particle / confetti / shake helpers (Web Animations API)
  data/             static literary passages (generated.json + fallback.ts)
  store/            Zustand store, persisted to localStorage
  hooks/
    useTypingEngine.ts   the core engine: IME-aware input, metrics, completion
  app/nav.tsx       screen routing + practice-queue state (no router dep)
  components/       TopBar, TypingArea, LineChart
  pages/            Home, Library, Practice, Results, Rankings, Profile
  styles/global.css single design-system stylesheet (CSS variables)
```

## Critical correctness rules (don't regress these)

- **Korean IME**: the capture `<textarea>` is *uncontrolled* on purpose. React
  controlled inputs drop IME composition. Read `.value`, track composition via
  `compositionstart/end` + `nativeEvent.isComposing`. Only "commit" characters
  when NOT composing (plus the exact-match check that finishes a run when the
  final syllable is still mid-composition).
- **Korean metrics are 타수 (jamo keystrokes), not words.** Use
  `countStrokes`/`strokesForChar`. A syllable like 값 is 4 keystrokes. Korean
  ranks by CPM (타/분); English ranks by WPM.
- **Accuracy counts every committed attempt** (including re-typed corrections),
  so fixing a mistake still costs accuracy — that's intended.
- Effects/sound must respect `settings.effectsEnabled` / `settings.soundEnabled`.
  Audio must be (re)started from a user gesture (`sound.resume()`).

## Commands

```bash
npm install
npm run dev        # http://localhost:5173  ← primary way to run
npm run build      # production build to dist/
npm run preview    # serve the built dist/
npm run typecheck  # tsc --noEmit
```

## Definition of done for any change here

1. `npm run dev` runs and the changed flow works end-to-end by hand.
2. Korean AND English both still type, score, and finish correctly.
3. `npm run typecheck` is clean.
4. The diff is minimal and matches the four principles above.
