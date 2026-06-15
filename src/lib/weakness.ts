// ---------------------------------------------------------------------------
// keybr-style weakness analysis. Pure functions only (no React).
//
// Aggregates the characters a typist most often mistypes into "weak units":
//   - Korean: the constituent JAMO (e.g. ㅘ, ㄺ, ㅄ) of the errored syllables.
//   - English: the lowercased letters/keys.
// Then builds an adaptive drill that hammers those weak units using real words
// drawn from the literary passages (falling back to synthesized Korean
// syllables when too few real words contain the jamo).
// ---------------------------------------------------------------------------

import type { Language, SessionResult } from '../types'
import { decomposeToStrokes, isHangulChar } from './hangul'
import { ALL_PASSAGES } from '../data'

export interface WeakUnit {
  unit: string
  count: number
}

/** How many of the profile's most recent same-language sessions to analyze. */
const RECENT_WINDOW = 40

/**
 * The weak jamo (Korean) / letters (English) for a profile, sorted by how often
 * they appeared inside a mistyped character, most-missed first.
 */
export function weakUnits(
  sessions: SessionResult[],
  profileId: string | null,
  language: Language,
  topN = 8,
): WeakUnit[] {
  if (!profileId) return []
  const relevant = sessions
    .filter((s) => s.profileId === profileId && s.language === language && s.errorChars && s.errorChars.length > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, RECENT_WINDOW)

  const counts = new Map<string, number>()
  for (const s of relevant) {
    for (const ch of s.errorChars ?? []) {
      const units = unitsForChar(ch, language)
      for (const u of units) counts.set(u, (counts.get(u) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([unit, count]) => ({ unit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

/** Map one errored target character to its weak unit(s). */
function unitsForChar(ch: string, language: Language): string[] {
  if (language === 'ko') {
    if (!isHangulChar(ch)) return []
    return decomposeToStrokes(ch)
  }
  // English: a single typed key. Keep only letters, lowercased.
  const lower = ch.toLowerCase()
  return /[a-z]/.test(lower) ? [lower] : []
}

/** Does this word "exercise" any of the weak units? */
function wordHasWeakUnit(word: string, units: Set<string>, language: Language): boolean {
  if (language === 'ko') {
    for (const ch of word) {
      if (!isHangulChar(ch)) continue
      for (const jamo of decomposeToStrokes(ch)) {
        if (units.has(jamo)) return true
      }
    }
    return false
  }
  for (const ch of word.toLowerCase()) {
    if (units.has(ch)) return true
  }
  return false
}

/**
 * Build a practice string focused on the weak units, sourcing real words from
 * the literary passages of that language. Each picked word is repeated a few
 * times (mirroring src/lib/drill.ts). Returns '' when there's nothing to drill.
 */
export function buildWeaknessDrill(units: WeakUnit[], language: Language, repeats = 3): string {
  if (units.length === 0) return ''
  const unitSet = new Set(units.map((u) => u.unit))

  const seen = new Set<string>()
  const words: string[] = []
  for (const p of ALL_PASSAGES) {
    if (p.language !== language) continue
    for (const raw of p.text.split(/\s+/)) {
      // Strip surrounding punctuation; keep letters/Hangul (and inner apostrophes/hyphens for English).
      const word = raw.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
      if (word.length < 2 || seen.has(word)) continue
      if (wordHasWeakUnit(word, unitSet, language)) {
        seen.add(word)
        words.push(word)
        if (words.length >= 14) break
      }
    }
    if (words.length >= 14) break
  }

  // Korean fallback: synthesize simple syllables when too few real words found.
  if (language === 'ko' && words.length < 6) {
    for (const syl of synthesizeKoSyllables(units)) {
      if (!seen.has(syl)) {
        seen.add(syl)
        words.push(syl)
      }
    }
  }

  if (words.length === 0) return ''
  const out: string[] = []
  for (const w of words.slice(0, 14)) {
    for (let r = 0; r < repeats; r++) out.push(w)
  }
  return out.join(' ')
}

// Compose a syllable from initial+medial(+final) so a weak jamo gets drilled even
// when no real word contains it. Picks a neutral partner jamo for each.
const FILLER_INITIAL = 'ㄱ'
const FILLER_MEDIAL = 'ㅏ'
const FILLER_FINAL = ''
const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const MEDIALS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const FINALS = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

function composeSyllable(initial: string, medial: string, final: string): string {
  const li = INITIALS.indexOf(initial)
  const mi = MEDIALS.indexOf(medial)
  const fi = FINALS.indexOf(final)
  if (li < 0 || mi < 0 || fi < 0) return ''
  return String.fromCharCode(0xac00 + (li * 21 + mi) * 28 + fi)
}

function synthesizeKoSyllables(units: WeakUnit[]): string[] {
  const out: string[] = []
  for (const { unit } of units) {
    let syl = ''
    if (INITIALS.includes(unit)) syl = composeSyllable(unit, FILLER_MEDIAL, FILLER_FINAL)
    else if (MEDIALS.includes(unit)) syl = composeSyllable(FILLER_INITIAL, unit, FILLER_FINAL)
    else if (FINALS.includes(unit)) syl = composeSyllable(FILLER_INITIAL, FILLER_MEDIAL, unit)
    if (syl) out.push(syl)
  }
  return out
}
