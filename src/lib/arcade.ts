// ---------------------------------------------------------------------------
// "산성비" (Acid Rain) — pure game logic for the falling-word typing game.
// No React, no DOM. The flagship arcade mode lives here as testable functions.
//
// Multi-target IME matching (the crux): many words fall at once but there is a
// single capture <textarea>. We lock onto exactly ONE word and validate the
// buffer against it — including a Korean syllable that is still mid-composition,
// reusing the same jamo-prefix logic the practice engine uses.
// ---------------------------------------------------------------------------

import type { Language } from '../types'
import { countStrokes, isCompositionCorrect } from './hangul'

export interface DroppingWord {
  id: number
  text: string
  x: number // 0..100, % across the field (center anchored)
  y: number // 0..100, % down the field; >= 100 means it hit the floor
}

/**
 * Does `buf` validly prefix `text`? All committed characters must match exactly;
 * the final character may be a Korean syllable still being composed, in which
 * case we accept any valid jamo-prefix of the target syllable.
 */
export function matchesPrefix(text: string, buf: string, composing: boolean, language: Language): boolean {
  const n = buf.length
  if (n === 0) return true
  if (n > text.length) return false
  for (let i = 0; i < n - 1; i++) {
    if (buf[i] !== text[i]) return false
  }
  const li = n - 1
  if (buf[li] === text[li]) return true
  if (language === 'ko' && composing) return isCompositionCorrect(text[li], buf[li])
  return false
}

export function isComplete(text: string, buf: string): boolean {
  return buf.length > 0 && buf === text
}

/**
 * Lock onto the most urgent word whose prefix matches the buffer: the lowest on
 * screen (largest y), ties broken by the oldest (smallest id) — fully
 * deterministic, so the reticle never jitters between equal candidates.
 */
export function pickTarget(
  words: DroppingWord[],
  buf: string,
  composing: boolean,
  language: Language,
): number | null {
  let best: DroppingWord | null = null
  for (const w of words) {
    if (!matchesPrefix(w.text, buf, composing, language)) continue
    if (!best || w.y > best.y || (w.y === best.y && w.id < best.id)) best = w
  }
  return best ? best.id : null
}

/** Points for destroying a word — longer/heavier words are worth more. */
export function wordPoints(text: string, language: Language): number {
  const strokes = language === 'ko' ? countStrokes(text) : text.length
  return 10 + strokes * 2
}

/** Difficulty rises with score. */
export function levelForScore(score: number): number {
  return Math.floor(score / 250)
}

/** Fall speed in % of field height per second. */
export function fallSpeed(level: number): number {
  return 5.5 + level * 1.4
}

/** Seconds between spawns (shrinks as the level climbs, floored). */
export function spawnInterval(level: number): number {
  return Math.max(0.85, 2.4 - level * 0.16)
}
