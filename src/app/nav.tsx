import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Genre, Language, PracticeMode } from '../types'
import type { EngineResult } from '../hooks/useTypingEngine'
import { pickRandom, passagesFor } from '../data'
import { useAppStore } from '../store/useAppStore'

export type Screen = 'home' | 'library' | 'practice' | 'results' | 'rankings' | 'profile'

export interface Drill {
  text: string
  language: Language
  title: string
  sourceTextId: string
}

export interface PracticeMeta {
  mode: PracticeMode
  language: Language
  genre: Genre | 'drill'
  textId: string
  textTitle: string
  text: string
  isDrill: boolean
}

export interface LastResult {
  result: EngineResult
  meta: PracticeMeta
}

interface NavValue {
  screen: Screen
  space: PracticeMode
  queue: string[]
  index: number
  drill: Drill | null
  runId: number
  lastResult: LastResult | null

  goHome: () => void
  openLibrary: (space: PracticeMode) => void
  goRankings: () => void
  goProfile: () => void
  startPassage: (id: string, space?: PracticeMode) => void
  startRandom: (space: PracticeMode) => void
  startMixed: (count?: number) => void
  retry: () => void
  next: () => void
  startDrill: (drill: Drill) => void
  finishPractice: (result: EngineResult, meta: PracticeMeta) => void
}

const NavContext = createContext<NavValue | null>(null)

export function useNav(): NavValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Interleave Korean and English passages for a mixed-mode run. */
function buildMixedQueue(count: number): string[] {
  const half = Math.ceil(count / 2)
  const ko = shuffle(passagesFor({ language: 'ko' })).slice(0, half).map((p) => p.id)
  const en = shuffle(passagesFor({ language: 'en' })).slice(0, half).map((p) => p.id)
  const out: string[] = []
  for (let i = 0; i < half; i++) {
    if (ko[i]) out.push(ko[i])
    if (en[i]) out.push(en[i])
  }
  return out.slice(0, count)
}

export function NavProvider({ children }: { children: ReactNode }) {
  const recordSession = useAppStore((s) => s.recordSession)

  const [screen, setScreen] = useState<Screen>('home')
  const [space, setSpace] = useState<PracticeMode>('ko')
  const [queue, setQueue] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [drill, setDrill] = useState<Drill | null>(null)
  const [runId, setRunId] = useState(0)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)

  const bump = useCallback(() => setRunId((r) => r + 1), [])

  const goHome = useCallback(() => setScreen('home'), [])
  const goRankings = useCallback(() => setScreen('rankings'), [])
  const goProfile = useCallback(() => setScreen('profile'), [])

  const openLibrary = useCallback((s: PracticeMode) => {
    setSpace(s)
    setScreen('library')
  }, [])

  const startPassage = useCallback(
    (id: string, s?: PracticeMode) => {
      if (s) setSpace(s)
      setQueue([id])
      setIndex(0)
      setDrill(null)
      bump()
      setScreen('practice')
    },
    [bump],
  )

  const startRandom = useCallback(
    (s: PracticeMode) => {
      setSpace(s)
      const lang: Language | undefined = s === 'mixed' ? undefined : s
      const p = pickRandom({ language: lang })
      if (!p) return
      setQueue([p.id])
      setIndex(0)
      setDrill(null)
      bump()
      setScreen('practice')
    },
    [bump],
  )

  const startMixed = useCallback(
    (count = 6) => {
      setSpace('mixed')
      setQueue(buildMixedQueue(count))
      setIndex(0)
      setDrill(null)
      bump()
      setScreen('practice')
    },
    [bump],
  )

  const retry = useCallback(() => {
    bump()
    setScreen('practice')
  }, [bump])

  const next = useCallback(() => {
    setDrill(null)
    setIndex((i) => {
      const nextIdx = i + 1
      if (nextIdx < queue.length) {
        bump()
        return nextIdx
      }
      // endless mode: append a fresh passage matching the current space
      const lang: Language | undefined = space === 'mixed' ? (i % 2 === 0 ? 'en' : 'ko') : space
      const p = pickRandom({ language: lang, excludeId: queue[i] })
      if (p) setQueue((q) => [...q, p.id])
      bump()
      return nextIdx
    })
    setScreen('practice')
  }, [queue, space, bump])

  const startDrill = useCallback(
    (d: Drill) => {
      setDrill(d)
      bump()
      setScreen('practice')
    },
    [bump],
  )

  const finishPractice = useCallback(
    (result: EngineResult, meta: PracticeMeta) => {
      recordSession({
        mode: meta.mode,
        language: meta.language,
        genre: meta.genre,
        textId: meta.textId,
        textTitle: meta.textTitle,
        wpm: result.wpm,
        cpm: result.cpm,
        rawWpm: result.rawWpm,
        accuracy: result.accuracy,
        consistency: result.consistency,
        durationMs: result.durationMs,
        charCount: result.charCount,
        strokeCount: result.strokeCount,
        errorCount: result.errorCount,
        maxCombo: result.maxCombo,
        isDrill: meta.isDrill,
      })
      setLastResult({ result, meta })
      setScreen('results')
    },
    [recordSession],
  )

  const value = useMemo<NavValue>(
    () => ({
      screen, space, queue, index, drill, runId, lastResult,
      goHome, openLibrary, goRankings, goProfile,
      startPassage, startRandom, startMixed, retry, next, startDrill, finishPractice,
    }),
    [
      screen, space, queue, index, drill, runId, lastResult,
      goHome, openLibrary, goRankings, goProfile,
      startPassage, startRandom, startMixed, retry, next, startDrill, finishPractice,
    ],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}
