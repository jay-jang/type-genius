// ---------------------------------------------------------------------------
// Pure metric math. No React, no DOM — easy to reason about and test.
// ---------------------------------------------------------------------------

import { countStrokes } from './hangul'
import type { Language, WpmSample } from '../types'

const MINUTE = 60_000

/** Standard WPM: a "word" is 5 characters. */
export function grossWpm(chars: number, ms: number): number {
  if (ms <= 0 || chars <= 0) return 0
  return (chars / 5) / (ms / MINUTE)
}

/**
 * Characters/keystrokes per minute.
 * Korean → jamo-aware keystrokes (타수). English → plain characters.
 */
export function cpm(text: string, ms: number, language: Language): number {
  if (ms <= 0) return 0
  const units = language === 'ko' ? countStrokes(text) : text.replace(/[\n\r]/g, '').length
  return units / (ms / MINUTE)
}

export function accuracyPct(entered: number, errors: number): number {
  if (entered <= 0) return 100
  return Math.max(0, ((entered - errors) / entered) * 100)
}

/**
 * Consistency = how steady the raw speed was. 100 = metronome-steady.
 * Derived from the coefficient of variation of per-second raw WPM samples.
 */
export function consistencyFromSamples(samples: WpmSample[]): number {
  const xs = samples.map((s) => s.raw).filter((v) => v > 0)
  if (xs.length < 2) return 100
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  if (mean <= 0) return 0
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length
  const cv = Math.sqrt(variance) / mean
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)))
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m === 0) return `${s}초`
  return `${m}분 ${s}초`
}

export function formatTimeAgo(ts: number, now: number): string {
  const diff = Math.max(0, now - ts)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}일 전`
  const mon = Math.floor(day / 30)
  if (mon < 12) return `${mon}개월 전`
  return `${Math.floor(mon / 12)}년 전`
}

/** Speed metric to feature, per language. Korean shows 타수(CPM), English shows WPM. */
export function primarySpeed(language: Language, wpm: number, cpmValue: number): number {
  return language === 'ko' ? Math.round(cpmValue) : Math.round(wpm)
}

export function speedUnit(language: Language): string {
  return language === 'ko' ? '타/분' : 'WPM'
}
