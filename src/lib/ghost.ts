// ---------------------------------------------------------------------------
// 고스트 레이싱 — a constant-pace pace-setter derived from your best prior run.
// Pure logic only (no React). SessionResult stores no per-second curve, so the
// ghost races at a fixed pace: your best score in the current mode.
// ---------------------------------------------------------------------------

import type { PracticeMode, SessionResult } from '../types'
import { countStrokes } from './hangul'
import { sessionScore, isRanked } from './stats'

/** The unit a mode's score (and thus the ghost pace) is measured in. */
export type GhostUnit = 'cpm' | 'wpm'

/** 한국어 ranks by 타수(CPM); English and 복합 rank by WPM. */
export function ghostUnit(mode: PracticeMode): GhostUnit {
  return mode === 'ko' ? 'cpm' : 'wpm'
}

// Fallback pace, matching how `sessionScore` ranks each mode: 한국어 is CPM(타/분),
// English and 복합 are WPM.
const DEFAULT_CPM_PACE = 300
const DEFAULT_WPM_PACE = 40

/**
 * The ghost's pace in units/min — the same metric `sessionScore` ranks by:
 * 한국어 = 타수(CPM), English/복합 = WPM. Uses your best ranked run in this
 * mode, else a sane default.
 */
export function pickGhostPace(
  sessions: SessionResult[],
  profileId: string | null,
  mode: PracticeMode,
): number {
  const fallback = mode === 'ko' ? DEFAULT_CPM_PACE : DEFAULT_WPM_PACE
  if (!profileId) return fallback
  const mine = sessions.filter(
    (s) => s.profileId === profileId && s.mode === mode && isRanked(s),
  )
  if (mine.length === 0) return fallback
  return Math.max(...mine.map(sessionScore))
}

/**
 * Total units the ghost must cover for a target, in the pace's unit: CPM counts
 * 타수(jamo keystrokes); WPM counts characters (later scaled ×5 as words).
 */
export function ghostTotalUnits(target: string, unit: GhostUnit): number {
  return unit === 'cpm' ? countStrokes(target) : target.replace(/[\n\r]/g, '').length
}

/** Ghost progress (0..1) at `elapsedMs`, given its constant `pace` (units/min). */
export function ghostProgress(
  pace: number,
  elapsedMs: number,
  totalUnits: number,
  unit: GhostUnit,
): number {
  if (totalUnits <= 0 || pace <= 0) return 0
  // CPM is already 타수/min. WPM is words/min; one "word" is 5 characters.
  const unitsPerMin = unit === 'cpm' ? pace : pace * 5
  const done = (unitsPerMin * elapsedMs) / 60_000
  return Math.min(1, done / totalUnits)
}
