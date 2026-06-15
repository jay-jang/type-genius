import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Difficulty, Genre, Language, PracticeMode } from '../types'
import type { EngineResult } from '../hooks/useTypingEngine'
import { pickRandom } from '../data'
import { randomWords, randomWordStream } from '../data/words'
import { hangulRatio } from '../lib/hangul'
import { useAppStore } from '../store/useAppStore'

export type Screen = 'home' | 'practice' | 'library' | 'results' | 'rankings' | 'profile'

export type TestKind = 'passage' | 'time' | 'words'

export interface TestConfig {
  mode: PracticeMode
  genre: Genre | 'all'
  difficulty: Difficulty | 'all'
  /** What kind of test: a literary passage, a timed run, or a fixed word count. */
  testKind: TestKind
  /** Seconds for `time`, word count for `words`. Ignored for `passage`. */
  limit: number
}

/** A generated word-list run for the time / words test kinds. */
export interface WordRun {
  text: string
  language: Language
  kind: 'time' | 'words'
  limit: number
}

export interface Drill {
  text: string
  language: Language
  title: string
  sourceTextId: string
}

/** Arbitrary text the user pasted in to practice on. Not ranked. */
export interface CustomText {
  text: string
  language: Language
}

export interface PracticeMeta {
  mode: PracticeMode
  language: Language
  genre: Genre | 'drill' | 'custom' | 'time' | 'words'
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
  custom: CustomText | null
  wordRun: WordRun | null
  runId: number
  lastResult: LastResult | null

  goHome: () => void
  openLibrary: (space?: PracticeMode) => void
  goRankings: () => void
  goProfile: () => void
  setConfig: (partial: Partial<TestConfig>) => void
  reroll: () => void
  startTest: (partial: Partial<TestConfig>) => void
  startPassage: (id: string, space?: PracticeMode) => void
  startRandom: (space: PracticeMode) => void
  startMixed: () => void
  retry: () => void
  next: () => void
  startDrill: (drill: Drill) => void
  startCustom: (text: string) => void
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

const DEFAULT_CONFIG: TestConfig = { mode: 'ko', genre: 'all', difficulty: 'all', testKind: 'passage', limit: 30 }

/** Default limit when switching into a test kind. */
export const TIME_LIMITS = [15, 30, 60]
export const WORD_LIMITS = [10, 25, 50]

/** The language a word run uses, given the practice space. Mixed → Korean. */
function wordLanguage(mode: PracticeMode): Language {
  return mode === 'en' ? 'en' : 'ko'
}

function buildWordRun(mode: PracticeMode, kind: 'time' | 'words', limit: number): WordRun {
  const language = wordLanguage(mode)
  const text = kind === 'time' ? randomWordStream(language) : randomWords(language, limit)
  return { text, language, kind, limit }
}

export function NavProvider({ children }: { children: ReactNode }) {
  const recordSession = useAppStore((s) => s.recordSession)

  const [screen, setScreen] = useState<Screen>('home')
  const [config, setConfigState] = useState<TestConfig>(DEFAULT_CONFIG)
  const [queue, setQueue] = useState<string[]>(() => {
    const p = pickFor(DEFAULT_CONFIG)
    return p ? [p.id] : []
  })
  const [index, setIndex] = useState(0)
  const [drill, setDrill] = useState<Drill | null>(null)
  const [custom, setCustom] = useState<CustomText | null>(null)
  const [wordRun, setWordRun] = useState<WordRun | null>(null)
  const [runId, setRunId] = useState(0)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)

  const bump = useCallback(() => setRunId((r) => r + 1), [])

  const startWith = useCallback(
    (cfg: TestConfig, excludeId?: string) => {
      if (cfg.testKind !== 'passage') {
        setWordRun(buildWordRun(cfg.mode, cfg.testKind, cfg.limit))
        setDrill(null)
        setCustom(null)
        bump()
        setScreen('practice')
        return
      }
      const p = pickFor(cfg, excludeId)
      setQueue(p ? [p.id] : [])
      setIndex(0)
      setDrill(null)
      setCustom(null)
      setWordRun(null)
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

  // Switch test kind / limit and immediately start a fresh run of that kind.
  const startTest = useCallback(
    (partial: Partial<TestConfig>) => {
      setConfigState((prev) => {
        let cfg = { ...prev, ...partial }
        // When switching kind without an explicit limit, snap to that kind's default.
        if (partial.testKind && partial.limit == null) {
          if (partial.testKind === 'time') cfg = { ...cfg, limit: TIME_LIMITS[1] }
          else if (partial.testKind === 'words') cfg = { ...cfg, limit: WORD_LIMITS[1] }
        }
        startWith(cfg)
        return cfg
      })
    },
    [startWith],
  )

  const reroll = useCallback(() => startWith(config, queue[index]), [startWith, config, queue, index])
  const goHome = useCallback(() => setScreen('home'), [])

  const openLibrary = useCallback((space?: PracticeMode) => {
    if (space) setConfigState((prev) => ({ ...prev, mode: space }))
    setScreen('library')
  }, [])
  const goRankings = useCallback(() => setScreen('rankings'), [])
  const goProfile = useCallback(() => setScreen('profile'), [])

  const startPassage = useCallback(
    (id: string, space?: PracticeMode) => {
      if (space) setConfigState((prev) => ({ ...prev, mode: space, testKind: 'passage' }))
      setQueue([id])
      setIndex(0)
      setDrill(null)
      setCustom(null)
      setWordRun(null)
      bump()
      setScreen('practice')
    },
    [bump],
  )

  const startRandom = useCallback((space: PracticeMode) => setConfig({ mode: space, testKind: 'passage' }), [setConfig])
  const startMixed = useCallback(() => setConfig({ mode: 'mixed', testKind: 'passage' }), [setConfig])

  const retry = useCallback(() => {
    bump()
    setScreen('practice')
  }, [bump])

  const next = useCallback(() => {
    setDrill(null)
    setCustom(null)
    // A word/time run regenerates a fresh stream of the same kind & limit.
    if (config.testKind !== 'passage') {
      setWordRun(buildWordRun(config.mode, config.testKind, config.limit))
      bump()
      setScreen('practice')
      return
    }
    setWordRun(null)
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
      setCustom(null)
      setWordRun(null)
      setDrill(d)
      bump()
      setScreen('practice')
    },
    [bump],
  )

  const startCustom = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const language: Language = hangulRatio(trimmed) >= 0.3 ? 'ko' : 'en'
      setDrill(null)
      setWordRun(null)
      setCustom({ text: trimmed, language })
      bump()
      setScreen('practice')
    },
    [bump],
  )

  const finishPractice = useCallback(
    (result: EngineResult, meta: PracticeMeta) => {
      const errorChars = result.errorPositions
        .map((pos) => meta.text[pos])
        .filter((ch) => ch && ch.trim() !== '')
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
        errorChars,
      })
      setLastResult({ result, meta })
      setScreen('results')
    },
    [recordSession],
  )

  const value = useMemo<NavValue>(
    () => ({
      screen, space: config.mode, config, queue, index, drill, custom, wordRun, runId, lastResult,
      goHome, openLibrary, goRankings, goProfile, setConfig, reroll, startTest,
      startPassage, startRandom, startMixed, retry, next, startDrill, startCustom, finishPractice,
    }),
    [
      screen, config, queue, index, drill, custom, wordRun, runId, lastResult,
      goHome, openLibrary, goRankings, goProfile, setConfig, reroll, startTest,
      startPassage, startRandom, startMixed, retry, next, startDrill, startCustom, finishPractice,
    ],
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}
