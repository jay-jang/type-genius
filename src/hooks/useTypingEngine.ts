import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as React from 'react'
import type { CharStatus, Language, LiveStats, WpmSample } from '../types'
import { strokesForChar, isHangulChar, decomposeToStrokes, isCompositionCorrect } from '../lib/hangul'
import { accuracyPct, consistencyFromSamples, grossWpm } from '../lib/metrics'

export interface EngineResult {
  wpm: number
  rawWpm: number
  cpm: number
  rawCpm: number
  accuracy: number
  consistency: number
  durationMs: number
  charCount: number
  strokeCount: number
  errorCount: number
  maxCombo: number
  samples: WpmSample[]
  errorPositions: number[]
}

interface EngineEvents {
  onCorrect?: () => void
  onMistake?: () => void
  onCombo?: (level: number) => void
  onFinish?: (result: EngineResult) => void
}

interface EngineOptions extends EngineEvents {
  target: string
  language: Language
  enabled?: boolean
  /** When set, the run auto-finishes once elapsed reaches this and scores only what was typed. */
  timeLimitMs?: number
}

const EMPTY_STATS: LiveStats = {
  wpm: 0, rawWpm: 0, cpm: 0, rawCpm: 0, accuracy: 100, errors: 0,
  progress: 0, combo: 0, maxCombo: 0, elapsedMs: 0,
}

const MINUTE = 60_000

export function useTypingEngine(opts: EngineOptions) {
  const { target, language, enabled = true, timeLimitMs } = opts

  // Latest event callbacks without retriggering effects.
  const cb = useRef<EngineEvents>(opts)
  cb.current = opts

  const taRef = useRef<HTMLTextAreaElement | null>(null)

  // Mutable run state (refs — high frequency, no re-render needed).
  const startRef = useRef<number | null>(null)
  const committedRef = useRef(0)
  const enteredRef = useRef(0)
  const errorsRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const errorPosRef = useRef<Set<number>>(new Set())
  const samplesRef = useRef<WpmSample[]>([])
  const lastSampleSecRef = useRef(0)
  const valueRef = useRef('')
  const composingRef = useRef(false)
  const finishedRef = useRef(false)
  const lastComposingStrokesRef = useRef<string[]>([])
  const rawStrokesRef = useRef(0)

  // Render state.
  const [value, setValue] = useState('')
  const [committed, setCommitted] = useState(0)
  const [isComposing, setIsComposing] = useState(false)
  const [finished, setFinished] = useState(false)
  const [combo, setCombo] = useState(0)
  const [stats, setStats] = useState<LiveStats>(EMPTY_STATS)

  const computeLive = useCallback((): LiveStats => {
    const v = valueRef.current
    const now = performance.now()
    const start = startRef.current
    const elapsed = start != null ? now - start : 0
    let correctCount = 0
    let correctStrokes = 0
    const upto = Math.min(committedRef.current, v.length)
    for (let i = 0; i < upto; i++) {
      if (v[i] === target[i]) {
        correctCount++
        correctStrokes += language === 'ko' ? strokesForChar(target[i]) : 1
      }
    }
    const mins = elapsed / MINUTE
    const cpm = mins > 0 ? correctStrokes / mins : 0
    const rawStrokes = language === 'ko' ? rawStrokesRef.current : enteredRef.current
    const rawCpmVal = mins > 0 ? rawStrokes / mins : 0

    const live: LiveStats = {
      wpm: Math.round(grossWpm(correctCount, elapsed)),
      rawWpm: Math.round(grossWpm(enteredRef.current, elapsed)),
      cpm: Math.round(cpm),
      rawCpm: Math.round(rawCpmVal),
      accuracy: Math.round(accuracyPct(enteredRef.current, errorsRef.current) * 10) / 10,
      errors: errorsRef.current,
      progress: target.length ? Math.min(1, committedRef.current / target.length) : 0,
      combo: comboRef.current,
      maxCombo: maxComboRef.current,
      elapsedMs: elapsed,
    }
    return live
  }, [target, language])

  const finalize = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    const v = valueRef.current
    const end = performance.now()
    const start = startRef.current ?? end
    const durationMs = Math.max(1, end - start)
    const mins = durationMs / MINUTE

    // For a time-limited run, score only the frontier the user actually typed
    // (committed characters), not the full generated word stream.
    const scoreEnd = timeLimitMs != null ? Math.min(committedRef.current, target.length) : target.length

    let correctCount = 0
    let correctStrokes = 0
    for (let i = 0; i < scoreEnd; i++) {
      if (v[i] === target[i]) {
        correctCount++
        correctStrokes += language === 'ko' ? strokesForChar(target[i]) : 1
      }
    }
    const scored = target.slice(0, scoreEnd)
    const charCount = scored.replace(/[\n\r]/g, '').length
    const totalStrokes = language === 'ko'
      ? [...scored].reduce((a, c) => a + (c === '\n' || c === '\r' ? 0 : strokesForChar(c)), 0)
      : charCount

    const rawStrokes = language === 'ko' ? rawStrokesRef.current : enteredRef.current
    const liveRaw = Math.round(grossWpm(enteredRef.current, durationMs))
    const liveRawCpm = Math.round(rawStrokes / mins)

    // ensure a final sample exists
    samplesRef.current.push({
      t: Math.round(durationMs / 1000),
      wpm: Math.round(grossWpm(correctCount, durationMs)),
      raw: liveRaw,
      cpm: Math.round(correctStrokes / mins),
      rawCpm: liveRawCpm,
    })

    const result: EngineResult = {
      wpm: Math.round(grossWpm(correctCount, durationMs)),
      rawWpm: liveRaw,
      cpm: Math.round(correctStrokes / mins),
      rawCpm: liveRawCpm,
      accuracy: Math.round(accuracyPct(enteredRef.current, errorsRef.current) * 10) / 10,
      consistency: consistencyFromSamples(samplesRef.current),
      durationMs,
      charCount,
      strokeCount: totalStrokes,
      errorCount: errorsRef.current,
      maxCombo: maxComboRef.current,
      samples: samplesRef.current.slice(),
      errorPositions: [...errorPosRef.current].sort((a, b) => a - b),
    }
    setFinished(true)
    setStats(computeLive())
    cb.current.onFinish?.(result)
  }, [target, language, computeLive, timeLimitMs])

  const evaluate = useCallback((v: string) => {
    if (startRef.current == null && v.length > 0) startRef.current = performance.now()
    // backspaced below the committed frontier → allow re-attempt of those positions
    if (v.length < committedRef.current) {
      committedRef.current = v.length
      comboRef.current = 0 // backspacing breaks the combo streak
    }
    while (committedRef.current < v.length) {
      const p = committedRef.current
      enteredRef.current++

      // Count raw strokes: for English count all character inputs, for Korean count spaces/punctuations here
      if (language !== 'ko') {
        rawStrokesRef.current++
      } else if (!isHangulChar(target[p])) {
        rawStrokesRef.current++
      }

      const correct = v[p] === target[p]
      if (correct) {
        comboRef.current++
        if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current
        if (comboRef.current > 0 && comboRef.current % 10 === 0) cb.current.onCombo?.(comboRef.current / 10)
        
        // In Korean, Jamos play sounds during composition, not here on commit.
        // We only trigger correct sound for non-Hangul characters (e.g. spaces, punctuation) on commit.
        if (language !== 'ko' || !isHangulChar(target[p])) {
          cb.current.onCorrect?.()
        }
      } else {
        const alreadyErrored = errorPosRef.current.has(p)
        if (!alreadyErrored) {
          errorsRef.current++
          errorPosRef.current.add(p)
          comboRef.current = 0
          cb.current.onMistake?.()
        }
      }
      committedRef.current++
    }
    setCombo(comboRef.current)
  }, [target, language])

  const handleValue = useCallback(
    (v: string, composing: boolean) => {
      if (finishedRef.current || !enabled || !target) return
      valueRef.current = v
      setValue(v)
      composingRef.current = composing
      if (composing !== isComposing) setIsComposing(composing)

      // Jamo-level prefix validation and real-time audio-visual feedback during Hangul composition
      if (language === 'ko' && composing) {
        const p = committedRef.current
        if (v.length > p && target.length > p) {
          const compChar = v[p]
          const compStrokes = decomposeToStrokes(compChar)
          const targetStrokes = decomposeToStrokes(target[p])

          // If the Jamo count has increased, the user typed a new key
          if (compStrokes.length > lastComposingStrokesRef.current.length) {
            rawStrokesRef.current++
            const isCorrect = compStrokes.every((stroke, idx) => stroke === targetStrokes[idx])
            if (isCorrect) {
              cb.current.onCorrect?.()
            } else {
              cb.current.onMistake?.()
              comboRef.current = 0
              setCombo(0)
              const alreadyErrored = errorPosRef.current.has(p)
              if (!alreadyErrored) {
                errorsRef.current++
                errorPosRef.current.add(p)
              }
            }
          }
          lastComposingStrokesRef.current = compStrokes
        }
      } else {
        lastComposingStrokesRef.current = []
      }

      if (!composing) evaluate(v)
      setCommitted(committedRef.current)
      setStats(computeLive())

      // Completion: exact match (handles a correct final Hangul syllable that is
      // still mid-composition) OR frontier reached the end once committed.
      const reachedEnd = v.length >= target.length
      if (v === target || (!composing && reachedEnd)) {
        if (composing) evaluate(v) // commit the trailing syllable
        setCommitted(committedRef.current)
        finalize()
      }
    },
    [enabled, target, isComposing, language, evaluate, computeLive, finalize],
  )

  const reset = useCallback(() => {
    startRef.current = null
    committedRef.current = 0
    enteredRef.current = 0
    errorsRef.current = 0
    comboRef.current = 0
    maxComboRef.current = 0
    errorPosRef.current = new Set()
    samplesRef.current = []
    lastSampleSecRef.current = 0
    valueRef.current = ''
    composingRef.current = false
    finishedRef.current = false
    lastComposingStrokesRef.current = []
    rawStrokesRef.current = 0
    setValue('')
    setCommitted(0)
    setIsComposing(false)
    setFinished(false)
    setCombo(0)
    setStats(EMPTY_STATS)
    if (taRef.current) taRef.current.value = ''
  }, [])

  // Reset whenever the target changes.
  useEffect(() => {
    reset()
    const id = window.setTimeout(() => taRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [target, reset])

  // Ticking clock + per-second sampling so the timer/graph advance while idle.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (startRef.current == null || finishedRef.current) return
      const live = computeLive()
      setStats(live)
      if (timeLimitMs != null && live.elapsedMs >= timeLimitMs) {
        finalize()
        return
      }
      const sec = Math.floor(live.elapsedMs / 1000)
      if (sec >= 1 && sec > lastSampleSecRef.current) {
        lastSampleSecRef.current = sec
        samplesRef.current.push({
          t: sec,
          wpm: live.wpm,
          raw: live.rawWpm,
          cpm: live.cpm,
          rawCpm: live.rawCpm,
        })
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [computeLive, timeLimitMs, finalize])

  const focus = useCallback(() => taRef.current?.focus(), [])

  const textareaProps = useMemo(
    () => ({
      ref: taRef,
      defaultValue: '',
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        handleValue(e.currentTarget.value, composingRef.current || (e.nativeEvent as InputEvent).isComposing),
      onCompositionStart: () => {
        composingRef.current = true
        setIsComposing(true)
      },
      onCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => {
        composingRef.current = false
        setIsComposing(false)
        handleValue(e.currentTarget.value, false)
      },
      onPaste: (e: React.ClipboardEvent) => e.preventDefault(),
      spellCheck: false,
      autoCapitalize: 'off' as const,
      autoCorrect: 'off' as const,
      autoComplete: 'off' as const,
    }),
    [handleValue],
  )

  return { value, committed, isComposing, finished, combo, stats, textareaProps, focus, reset, taRef }
}

/** Per-character render statuses for the typing surface. */
export function statusesFor(target: string, value: string, committed: number, composing: boolean): CharStatus[] {
  const out: CharStatus[] = new Array(target.length)
  for (let i = 0; i < target.length; i++) {
    if (i < committed) out[i] = value[i] === target[i] ? 'correct' : 'incorrect'
    else if (composing && i < value.length) {
      if (i === committed) {
        out[i] = isCompositionCorrect(target[i], value[i]) ? 'composing' : 'composing-incorrect'
      } else {
        out[i] = 'composing'
      }
    }
    else out[i] = 'untyped'
  }
  return out
}
