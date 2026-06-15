// ---------------------------------------------------------------------------
// Achievement badges — PURE derivation from existing data. No persisted unlock
// state: each badge's `test` runs against the profile's sessions + summary +
// streak on render, so badges light up automatically as the data grows.
// ---------------------------------------------------------------------------

import type { SessionResult } from '../types'
import type { ProfileSummary } from './stats'
import type { Streak } from '../store/useAppStore'
import { isRanked } from './stats'

export interface AchievementCtx {
  sessions: SessionResult[]
  summary: ProfileSummary
  streak: Streak
}

export interface Badge {
  id: string
  icon: string
  label: string
  desc: string
  test: (ctx: AchievementCtx) => boolean
}

export interface EvaluatedBadge extends Badge {
  unlocked: boolean
}

/** Ranked runs only — drills/custom shouldn't unlock speed/accuracy feats. */
const ranked = (s: SessionResult[]) => s.filter(isRanked)

export const BADGES: Badge[] = [
  {
    id: 'first-run',
    icon: '🎉',
    label: '첫 완주',
    desc: '첫 연습을 끝까지 완주했어요',
    test: ({ summary }) => summary.totalSessions >= 1,
  },
  {
    id: 'perfect',
    icon: '🎯',
    label: '완벽주의',
    desc: '정확도 100%로 완주했어요',
    test: ({ sessions }) => ranked(sessions).some((s) => s.accuracy >= 100),
  },
  {
    id: 'cpm-100',
    icon: '⚡',
    label: '100타 돌파',
    desc: '한국어 100타/분을 넘겼어요',
    test: ({ sessions }) => ranked(sessions).some((s) => s.mode === 'ko' && s.cpm >= 100),
  },
  {
    id: 'wpm-40',
    icon: '🚀',
    label: '40 WPM',
    desc: '영어 40 WPM을 넘겼어요',
    test: ({ sessions }) => ranked(sessions).some((s) => s.mode === 'en' && s.wpm >= 40),
  },
  {
    id: 'combo-50',
    icon: '🔗',
    label: '콤보 50',
    desc: '한 번에 50콤보를 달성했어요',
    test: ({ sessions }) => sessions.some((s) => s.maxCombo >= 50),
  },
  {
    id: 'strokes-10k',
    icon: '⌨️',
    label: '누적 1만 타',
    desc: '누적 1만 타를 입력했어요',
    test: ({ summary }) => summary.totalStrokes >= 10000,
  },
  {
    id: 'streak-7',
    icon: '🔥',
    label: '7일 연속',
    desc: '7일 연속으로 연습했어요',
    test: ({ streak }) => streak.best >= 7,
  },
  {
    id: 'drill-5',
    icon: '🛠️',
    label: '약점 정복',
    desc: '오답·약점 드릴을 5회 했어요',
    test: ({ sessions }) => sessions.filter((s) => s.isDrill).length >= 5,
  },
  {
    id: 'night-owl',
    icon: '🌙',
    label: '새벽 타이피스트',
    desc: '새벽(0~4시)에 연습했어요',
    test: ({ sessions }) =>
      sessions.some((s) => {
        const h = new Date(s.timestamp).getHours()
        return h >= 0 && h < 5
      }),
  },
  {
    id: 'sessions-50',
    icon: '🏅',
    label: '꾸준함 50',
    desc: '연습을 50회 완주했어요',
    test: ({ summary }) => summary.totalSessions >= 50,
  },
  {
    id: 'level-10',
    icon: '🌟',
    label: 'Lv.10',
    desc: '레벨 10에 도달했어요',
    test: ({ summary }) => summary.level >= 10,
  },
  {
    id: 'accuracy-95',
    icon: '💎',
    label: '안정의 95%',
    desc: '평균 정확도 95%를 넘겼어요',
    test: ({ summary }) => summary.avgAccuracy >= 95,
  },
]

export function evaluateAchievements(ctx: AchievementCtx): EvaluatedBadge[] {
  return BADGES.map((b) => ({ ...b, unlocked: b.test(ctx) }))
}
