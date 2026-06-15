// ---------------------------------------------------------------------------
// Comprehensive activity record — derived purely from stored sessions.
// Answers "what games did I play, and how often?". No React, no side effects.
// ---------------------------------------------------------------------------

import type { SessionResult } from '../types'

export interface ActivityType {
  key: string
  label: string
  icon: string
  count: number
  lastPlayed: number
}

export interface DayCount {
  date: string // local 'YYYY-MM-DD'
  count: number
}

export interface ActivitySummary {
  totalPlays: number
  activeDays: number
  playsLast7: number
  playsLast30: number
  firstPlay: number
  lastPlay: number
  byType: ActivityType[]
  /** Plays per day for the last 14 days, oldest → newest (for a mini bar chart). */
  recentDaily: DayCount[]
}

function localDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Which "game" a session represents, with a friendly label + icon. */
export function classifyGame(s: SessionResult): { key: string; label: string; icon: string } {
  switch (s.genre) {
    case 'arcade':
      return { key: 'arcade', label: '산성비', icon: '🎯' }
    case 'drill':
      return { key: 'drill', label: '오답 드릴', icon: '🔁' }
    case 'custom':
      return { key: 'custom', label: '내 글', icon: '✍️' }
    case 'time':
      return { key: 'time', label: '시간 모드', icon: '⏱️' }
    case 'words':
      return { key: 'words', label: '단어 모드', icon: '🔤' }
    default: {
      const lang = s.mode === 'en' ? 'English' : s.mode === 'mixed' ? '복합' : '한국어'
      return { key: `passage:${s.mode}`, label: `${lang} 글`, icon: '📖' }
    }
  }
}

export function summarizeActivity(sessions: SessionResult[], now: number = Date.now()): ActivitySummary {
  const DAY = 86_400_000
  const byType = new Map<string, ActivityType>()
  const days = new Set<string>()
  let playsLast7 = 0
  let playsLast30 = 0
  let firstPlay = 0
  let lastPlay = 0

  for (const s of sessions) {
    const g = classifyGame(s)
    const t = byType.get(g.key) ?? { ...g, count: 0, lastPlayed: 0 }
    t.count += 1
    t.lastPlayed = Math.max(t.lastPlayed, s.timestamp)
    byType.set(g.key, t)

    days.add(localDate(s.timestamp))
    if (now - s.timestamp <= 7 * DAY) playsLast7++
    if (now - s.timestamp <= 30 * DAY) playsLast30++
    if (!firstPlay || s.timestamp < firstPlay) firstPlay = s.timestamp
    lastPlay = Math.max(lastPlay, s.timestamp)
  }

  // Last 14 days, oldest → newest.
  const recentDaily: DayCount[] = []
  const counts = new Map<string, number>()
  for (const s of sessions) {
    if (now - s.timestamp <= 14 * DAY) {
      const d = localDate(s.timestamp)
      counts.set(d, (counts.get(d) ?? 0) + 1)
    }
  }
  for (let i = 13; i >= 0; i--) {
    const d = localDate(now - i * DAY)
    recentDaily.push({ date: d, count: counts.get(d) ?? 0 })
  }

  return {
    totalPlays: sessions.length,
    activeDays: days.size,
    playsLast7,
    playsLast30,
    firstPlay,
    lastPlay,
    byType: [...byType.values()].sort((a, b) => b.count - a.count),
    recentDaily,
  }
}
