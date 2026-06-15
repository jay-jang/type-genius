// ---------------------------------------------------------------------------
// Derived analytics over the stored sessions. Pure functions only.
// ---------------------------------------------------------------------------

import type { PracticeMode, Profile, SessionResult } from '../types'

/** The headline speed used for ranking, per practice space. */
export function sessionScore(s: SessionResult): number {
  return s.mode === 'ko' ? s.cpm : s.wpm
}

export function scoreUnit(mode: PracticeMode): string {
  return mode === 'ko' ? '타/분' : 'WPM'
}

export const MODE_LABELS: Record<PracticeMode, string> = {
  ko: '한국어',
  en: 'English',
  mixed: '복합',
}

export interface ProfileSummary {
  totalSessions: number
  totalChars: number
  totalStrokes: number
  totalTimeMs: number
  avgAccuracy: number
  bestWpm: number
  bestCpm: number
  avgWpm: number
  level: number
  xp: number
  xpInLevel: number
  xpForNextLevel: number
}

export function sessionsForProfile(sessions: SessionResult[], profileId: string | null): SessionResult[] {
  if (!profileId) return []
  return sessions.filter((s) => s.profileId === profileId)
}

/**
 * Whether a session counts toward records, XP and leaderboards. Drills are short
 * and error-heavy by design; custom runs use arbitrary pasted text of unknown
 * difficulty — both would distort rankings, so they're excluded.
 */
export function isRanked(s: SessionResult): boolean {
  return !s.isDrill && s.genre !== 'custom' && s.genre !== 'arcade'
}

/** XP rewards length, speed and accuracy together. */
export function xpForSession(s: SessionResult): number {
  return Math.round((s.strokeCount / 5) * (s.accuracy / 100) * (1 + sessionScore(s) / 200))
}

export function levelFromXp(xp: number): { level: number; xpInLevel: number; xpForNextLevel: number } {
  // Each level costs progressively more XP. Smooth quadratic curve.
  const base = 600
  let level = 1
  let need = base
  let remaining = xp
  while (remaining >= need) {
    remaining -= need
    level++
    need = Math.round(base * level * 1.15)
  }
  return { level, xpInLevel: Math.round(remaining), xpForNextLevel: need }
}

export function summarize(sessions: SessionResult[]): ProfileSummary {
  if (sessions.length === 0) {
    return {
      totalSessions: 0, totalChars: 0, totalStrokes: 0, totalTimeMs: 0,
      avgAccuracy: 0, bestWpm: 0, bestCpm: 0, avgWpm: 0,
      level: 1, xp: 0, xpInLevel: 0, xpForNextLevel: 600,
    }
  }
  // Best / average / XP exclude drill runs (short, error-heavy by design) so
  // they don't inflate records or contradict the leaderboard. Totals keep all.
  const ranked = sessions.filter(isRanked)
  const totalChars = sessions.reduce((a, s) => a + s.charCount, 0)
  const totalStrokes = sessions.reduce((a, s) => a + s.strokeCount, 0)
  const totalTimeMs = sessions.reduce((a, s) => a + s.durationMs, 0)
  const avgAccuracy = ranked.length ? ranked.reduce((a, s) => a + s.accuracy, 0) / ranked.length : 0
  const avgWpm = ranked.length ? ranked.reduce((a, s) => a + s.wpm, 0) / ranked.length : 0
  const bestWpm = ranked.length ? Math.max(...ranked.map((s) => s.wpm)) : 0
  const bestCpm = ranked.length ? Math.max(...ranked.map((s) => s.cpm)) : 0
  const xp = ranked.reduce((a, s) => a + xpForSession(s), 0)
  const lvl = levelFromXp(xp)
  return {
    totalSessions: sessions.length,
    totalChars, totalStrokes, totalTimeMs,
    avgAccuracy, bestWpm, bestCpm, avgWpm,
    xp, ...lvl,
  }
}

export interface RankRow {
  profile: Profile
  best: number
  bestAccuracy: number
  sessions: number
  lastPlayed: number
}

/** Leaderboard for one practice space, best score per profile, ranked desc. */
export function leaderboard(
  sessions: SessionResult[],
  profiles: Profile[],
  mode: PracticeMode,
): RankRow[] {
  const rows: RankRow[] = []
  for (const profile of profiles) {
    const mine = sessions.filter((s) => s.profileId === profile.id && s.mode === mode && isRanked(s))
    if (mine.length === 0) continue
    rows.push({
      profile,
      best: Math.max(...mine.map(sessionScore)),
      bestAccuracy: Math.max(...mine.map((s) => s.accuracy)),
      sessions: mine.length,
      lastPlayed: Math.max(...mine.map((s) => s.timestamp)),
    })
  }
  return rows.sort((a, b) => b.best - a.best)
}

/** Score-over-time series for a profile (optionally one mode), oldest first. */
export function improvementSeries(
  sessions: SessionResult[],
  profileId: string,
  mode?: PracticeMode,
): { t: number; score: number; accuracy: number }[] {
  return sessions
    .filter((s) => s.profileId === profileId && (!mode || s.mode === mode) && isRanked(s))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((s) => ({ t: s.timestamp, score: Math.round(sessionScore(s)), accuracy: Math.round(s.accuracy) }))
}

export function recentSessions(sessions: SessionResult[], profileId: string, limit = 12): SessionResult[] {
  return sessions
    .filter((s) => s.profileId === profileId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}
