import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Difficulty, Genre, Language, PracticeMode } from '../types'
import type { EngineResult } from '../hooks/useTypingEngine'
import { pickRandom } from '../data'
import { useAppStore } from '../store/useAppStore'

export type Screen = 'practice' | 'library' | 'results' | 'rankings' | 'profile'

export interface TestConfig {
  mode: PracticeMode
  genre: Genre | 'all'
  difficulty: Difficulty | 'all'
}

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
  config: TestConfig
  queue: string[]
  index: number
  drill: Drill | null
  runId: number
  lastResult: LastResult | null

  goHome: () => void
  openLibrary: (space?: PracticeMode) => void
  goRankings: () => void
  goProfile: () => void
  setConfig: (partial: Partial<TestConfig>) => void
  reroll: () => void
  startPassage: (id: string, space?: PracticeMode) => void
  startRandom: (space: PracticeMode) => void
  startMixed: () => void
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

function pickFor(cfg: TestConfig, excludeId?: string) {
  const language: Language | undefined = cfg.mode === 'mixed' ? undefined : cfg.mode
  return pickRandom({
    language,
    genre: cfg.genre === 'all' ? undefined : cfg.genre,
    difficulty: cfg.difficulty === 'all' ? undefined : cfg.difficulty,
    excludeId,
  })
}

const DEFAULT_CONFIG: TestConfig = { mode: 'ko', genre: 'all', difficulty: 'all' }

export function NavProvider({ children }: { children: ReactNode }) {
  const recordSession = useAppStore((s) => s.recordSession)

  const [screen, setScreen] = useState<Screen>('practice')
  const [config, setConfigState] = useState<TestConfig>(DEFAULT_CONFIG)
  const [queue, setQueue] = useState<string[]>(() => {
    const p = pickFor(DEFAULT_CONFIG)
    return p ? [p.id] : []
  })
  const [index, setIndex] = useState(0)
  const [drill, setDrill] = useState<Drill | null>(null)
  const [runId, setRunId] = useState(0)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)

  const bump = useCallback(() => setRunId((r) => r + 1), [])

  const startWith = useCallback(
    (cfg: TestConfig, excludeId?: string) => {
      const p = pickFor(cfg, excludeId)
      setQueue(p ? [p.id] : [])
      setIndex(0)
      setDrill(null)
      bump()
      setScreen('practice')
    },
    [bump],
  )

  const setConfig = useCallback(
    (partial: Partial<TestConfig>) => {
      setConfigState((prev) => {
        const cfg = { ...prev, ...partial }
        startWith(cfg)
        return cfg
      })
    },
    [startWith],
  )

  const reroll = useCallback(() => startWith(config, queue[index]), [startWith, config, queue, index])
  const goHome = useCallback(() => reroll(), [reroll])

  const openLibrary = useCallback((space?: PracticeMode) => {
    if (space) setConfigState((prev) => ({ ...prev, mode: space }))
    setScreen('library')
  }, [])
  const goRankings = useCallback(() => setScreen('rankings'), [])
  const goProfile = useCallback(() => setScreen('profile'), [])

  const startPassage = useCallback(
    (id: string, space?: PracticeMode) => {
      if (space) setConfigState((prev) => ({ ...prev, mode: space }))
      setQueue([id])
      setIndex(0)
      setDrill(null)
      bump()
      setScreen('practice')
    },
    [bump],
  )

  const startRandom = useCallback((space: PracticeMode) => setConfig({ mode: space }), [setConfig])
  const startMixed = useCallback(() => setConfig({ mode: 'mixed' }), [setConfig])

  const retry = useCallback(() => {
    bump()
    setScreen('practice')
  }, [bump])

  const next = useCallback(() => {
    setDrill(null)
    const cur = queue[index]
    const p = pickFor(config, cur)
    if (p) {
      setQueue((q) => [...q, p.id])
      setIndex((i) => i + 1)
    }
    bump()
    setScreen('practice')
  }, [queue, index, config, bump])

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
      screen, space: config.mode, config, queue, index, drill, runId, lastResult,
      goHome, openLibrary, goRankings, goProfile, setConfig, reroll,
      startPassage, startRandom, startMixed, retry, next, startDrill, finishPractice,
    }),
    [
      screen, config, queue, index, drill, runId, lastResult,
      goHome, openLibrary, goRankings, goProfile, setConfig, reroll,
      startPassage, startRandom, startMixed, retry, next, startDrill, finishPractice,
    ],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}
