import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type * as React from 'react'
import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import type { Language } from '../types'
import { KO_WORDS, EN_WORDS } from '../data/words'
import {
  type DroppingWord,
  isComplete,
  pickTarget,
  wordPoints,
  levelForScore,
  fallSpeed,
  spawnInterval,
} from '../lib/arcade'
import { sound } from '../lib/sound'
import { spawnBurst, shake } from '../lib/effects'

const LIVES = 5

// "산성비" (Acid Rain): words fall, type one to destroy it before it hits the
// floor. A separate input path from the practice engine — useTypingEngine is
// untouched — so the core Korean-typing correctness can never regress here.
export function ArcadePage() {
  const { goHome } = useNav()
  const soundEnabled = useAppStore((s) => s.settings.soundEnabled)
  const effectsEnabled = useAppStore((s) => s.settings.effectsEnabled)
  const currentId = useAppStore((s) => s.currentProfileId)
  const arcadeBest = useAppStore((s) => s.arcadeBest)
  const recordArcade = useAppStore((s) => s.recordArcade)
  const recordSession = useAppStore((s) => s.recordSession)

  const [status, setStatus] = useState<'ready' | 'playing' | 'over'>('ready')
  const [language, setLanguage] = useState<Language>('ko')
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)

  // A frame counter forces re-render; all live game state lives in refs so the
  // rAF loop and input handler never read stale values.
  const [, repaint] = useReducer((n: number) => n + 1, 0)
  const wordsRef = useRef<DroppingWord[]>([])
  const scoreRef = useRef(0)
  const livesRef = useRef(LIVES)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const levelRef = useRef(0)
  const focusedRef = useRef<number | null>(null)
  const bufferRef = useRef('')
  const mismatchRef = useRef(false)
  const idRef = useRef(0)
  const spawnAccRef = useRef(0)
  const lastTickRef = useRef(0)
  const rafRef = useRef(0)
  const gameStartRef = useRef(0)
  const finalRef = useRef({ score: 0, best: 0, record: false })

  // Settings read through refs so the loop's identity stays stable mid-game.
  const soundRef = useRef(soundEnabled)
  const fxRef = useRef(effectsEnabled)
  soundRef.current = soundEnabled
  fxRef.current = effectsEnabled

  const fieldRef = useRef<HTMLDivElement | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  const best = arcadeBest[`${currentId}:${language}`] ?? 0

  const spawn = useCallback(() => {
    const pool = language === 'ko' ? KO_WORDS : EN_WORDS
    const text = pool[(Math.random() * pool.length) | 0]
    const id = ++idRef.current
    const x = 10 + Math.random() * 80 // center-anchored, kept off the edges
    wordsRef.current = [...wordsRef.current, { id, text, x, y: -4 }]
  }, [language])

  const endGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const score = scoreRef.current
    const prevBest = best
    const newBest = recordArcade(language, score)
    finalRef.current = { score, best: newBest, record: score > 0 && score >= newBest && score > prevBest }
    // Log the play as a session so it shows up in the comprehensive activity record.
    recordSession({
      mode: language,
      language,
      genre: 'arcade',
      textId: 'arcade',
      textTitle: '산성비',
      wpm: 0,
      cpm: 0,
      rawWpm: 0,
      accuracy: 100,
      consistency: 100,
      durationMs: Math.max(1, Date.now() - gameStartRef.current),
      charCount: 0,
      strokeCount: 0,
      errorCount: LIVES - Math.max(0, livesRef.current),
      maxCombo: maxComboRef.current,
      isDrill: false,
      score,
    })
    setStatus('over')
    if (soundRef.current) sound.complete()
  }, [language, recordArcade, recordSession, best])

  const loop = useCallback(
    (now: number) => {
      if (pausedRef.current) return // stopped; resume() restarts the loop
      const last = lastTickRef.current || now
      const dt = Math.min(0.05, (now - last) / 1000) // clamp tab-switch gaps
      lastTickRef.current = now

      const level = levelForScore(scoreRef.current)
      levelRef.current = level
      const vy = fallSpeed(level)

      const survivors: DroppingWord[] = []
      let escaped = 0
      for (const w of wordsRef.current) {
        const ny = w.y + vy * dt
        if (ny >= 100) {
          escaped++
          if (focusedRef.current === w.id) {
            focusedRef.current = null
            bufferRef.current = ''
            if (taRef.current) taRef.current.value = ''
          }
        } else {
          survivors.push({ ...w, y: ny })
        }
      }
      wordsRef.current = survivors

      if (escaped > 0) {
        livesRef.current -= escaped
        comboRef.current = 0
        if (soundRef.current) sound.error()
        if (fxRef.current && fieldRef.current) shake(fieldRef.current, 8)
      }

      spawnAccRef.current += dt
      if (spawnAccRef.current >= spawnInterval(level)) {
        spawnAccRef.current = 0
        spawn()
      }

      repaint()

      if (livesRef.current <= 0) {
        endGame()
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    },
    [spawn, endGame],
  )

  const start = useCallback(() => {
    wordsRef.current = []
    scoreRef.current = 0
    livesRef.current = LIVES
    comboRef.current = 0
    maxComboRef.current = 0
    levelRef.current = 0
    focusedRef.current = null
    bufferRef.current = ''
    mismatchRef.current = false
    idRef.current = 0
    spawnAccRef.current = 0
    lastTickRef.current = 0
    gameStartRef.current = Date.now()
    pausedRef.current = false
    setPaused(false)
    if (taRef.current) taRef.current.value = ''
    sound.resume()
    setStatus('playing')
  }, [])

  const pause = useCallback(() => {
    if (pausedRef.current) return
    pausedRef.current = true
    setPaused(true)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const resume = useCallback(() => {
    if (!pausedRef.current) return
    pausedRef.current = false
    setPaused(false)
    lastTickRef.current = 0
    rafRef.current = requestAnimationFrame(loop)
    taRef.current?.focus()
  }, [loop])

  // Drive the loop while playing; clean up on stop/unmount.
  useEffect(() => {
    if (status !== 'playing') return
    spawn()
    lastTickRef.current = 0
    rafRef.current = requestAnimationFrame(loop)
    const t = window.setTimeout(() => taRef.current?.focus(), 20)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.clearTimeout(t)
    }
  }, [status, loop, spawn])

  // Esc: while playing → toggle pause; otherwise → leave to home.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (status === 'playing') {
        if (pausedRef.current) resume()
        else pause()
      } else {
        goHome()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status, pause, resume, goHome])

  // Losing focus / hiding the tab auto-pauses so you don't helplessly lose lives.
  useEffect(() => {
    if (status !== 'playing') return
    const onAway = () => pause()
    const onVis = () => { if (document.hidden) pause() }
    window.addEventListener('blur', onAway)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', onAway)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [status, pause])

  const onInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (status !== 'playing' || pausedRef.current) return
      const ta = e.currentTarget
      const composing = (e.nativeEvent as InputEvent).isComposing
      let buf = ta.value

      // Whitespace can never be part of a (single-token) word, so a space/enter
      // acts as a "clear" — flush the buffer instead of getting stuck.
      if (/\s/.test(buf)) {
        buf = ''
        ta.value = ''
      }
      bufferRef.current = buf

      if (buf.length === 0) {
        focusedRef.current = null
        mismatchRef.current = false
        repaint()
        return
      }

      const words = wordsRef.current

      // Exact match → destroy that word.
      const hit = words.find((w) => isComplete(w.text, buf))
      if (hit) {
        wordsRef.current = words.filter((w) => w.id !== hit.id)
        comboRef.current += 1
        if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current
        const mult = 1 + Math.floor(comboRef.current / 5) * 0.5
        scoreRef.current += Math.round(wordPoints(hit.text, language) * mult)
        focusedRef.current = null
        mismatchRef.current = false
        bufferRef.current = ''
        ta.value = ''
        if (soundRef.current) {
          sound.key()
          if (comboRef.current % 5 === 0) sound.combo(comboRef.current / 5)
        }
        const layer = fieldRef.current
        if (fxRef.current && layer) {
          const r = layer.getBoundingClientRect()
          spawnBurst(layer, (hit.x / 100) * r.width, (hit.y / 100) * r.height, { count: 10, power: 75 })
        }
        repaint()
        return
      }

      // No full match yet: highlight the most urgent word this buffer prefixes.
      // The buffer is NEVER auto-erased — if it matches nothing, we flag it red
      // and let the player backspace (or hit space to clear). Free typing.
      const tid = pickTarget(words, buf, composing, language)
      focusedRef.current = tid
      mismatchRef.current = tid == null
      if (soundRef.current) sound.key()
      repaint()
    },
    [status, language],
  )

  const lives = Math.max(0, livesRef.current)
  const f = finalRef.current
  // When nothing is being typed, hint the word that will be auto-aimed next
  // (the lowest = most urgent), so the reticle is never a surprise.
  const nextId =
    focusedRef.current == null && bufferRef.current.length === 0
      ? wordsRef.current.reduce<DroppingWord | null>((lo, w) => (!lo || w.y > lo.y ? w : lo), null)?.id ?? null
      : null

  return (
    <div className="screen arcade-screen">
      <div className="arcade-hud">
        <span>점수 <b>{scoreRef.current}</b></span>
        <span className="arcade-lives" aria-label={`생명 ${lives}`}>
          {'♥'.repeat(lives)}
          <span className="dim">{'♥'.repeat(LIVES - lives)}</span>
        </span>
        <span>콤보 <b>{comboRef.current}</b></span>
        <span>Lv <b>{levelRef.current + 1}</b></span>
        <span className="arcade-best">최고 {best}</span>
        {status === 'playing' && !paused && (
          <button className="btn sm arcade-pause-btn" onClick={pause} title="일시정지 (Esc)">⏸ 일시정지</button>
        )}
      </div>

      <div className="arcade-field" ref={fieldRef} onClick={() => taRef.current?.focus()}>
        {wordsRef.current.map((w) => {
          const focused = focusedRef.current === w.id
          const typed = focused ? bufferRef.current.length : 0
          return (
            <div
              key={w.id}
              className={`arcade-word ${focused ? 'on' : ''} ${w.id === nextId ? 'next' : ''}`}
              style={{ left: `${w.x}%`, top: `${w.y}%` }}
            >
              {focused && <span className="aw-reticle" aria-hidden>◎</span>}
              {typed > 0 && <span className="aw-typed">{w.text.slice(0, typed)}</span>}
              {w.text.slice(typed)}
            </div>
          )
        })}

        {status === 'playing' && paused && (
          <div className="arcade-overlay">
            <h2 className="arcade-title">⏸ 일시정지</h2>
            <p className="arcade-desc">Esc 를 다시 누르면 이어집니다.</p>
            <div className="arcade-lang">
              <button className="btn primary lg" onClick={resume}>▶ 이어하기</button>
              <button className="btn lg" onClick={goHome}>홈으로</button>
            </div>
          </div>
        )}

        {status !== 'playing' && (
          <div className="arcade-overlay">
            {status === 'ready' ? (
              <>
                <h2 className="arcade-title">산성비 ☔</h2>
                <p className="arcade-desc">
                  떨어지는 단어를 바닥에 닿기 전에 그대로 타이핑해 격파하세요.
                  <br />
                  가장 아래 단어가 자동으로 조준됩니다. 생명 {LIVES}개.
                </p>
                <div className="arcade-lang">
                  <button className={`btn ${language === 'ko' ? 'primary' : ''}`} onClick={() => setLanguage('ko')}>
                    한국어
                  </button>
                  <button className={`btn ${language === 'en' ? 'primary' : ''}`} onClick={() => setLanguage('en')}>
                    English
                  </button>
                </div>
                <button className="btn primary lg" onClick={start}>▶ 시작</button>
              </>
            ) : (
              <>
                <h2 className="arcade-title">게임 오버</h2>
                <p className="arcade-final">
                  점수 <b>{f.score}</b>
                </p>
                <p className="dim">{f.record ? '🏆 최고 기록 갱신!' : `최고 ${f.best}`}</p>
                <div className="arcade-lang">
                  <button className="btn primary lg" onClick={start}>다시 하기</button>
                  <button className="btn lg" onClick={goHome}>홈으로</button>
                </div>
              </>
            )}
          </div>
        )}

        {status === 'playing' && (
          <textarea
            ref={taRef}
            className={`arcade-input ${mismatchRef.current ? 'wrong' : ''}`}
            rows={1}
            autoFocus
            onInput={onInput}
            onBlur={() => {
              // Keep focus while actively playing, but not while paused.
              if (status === 'playing' && !pausedRef.current) window.setTimeout(() => taRef.current?.focus(), 0)
            }}
            defaultValue=""
            placeholder="여기에 입력…"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            aria-label="타이핑 입력"
          />
        )}
      </div>

      <p className="arcade-hint">
        단어를 그대로 입력하면 격파 · <kbd>Space</kbd>/<kbd>Backspace</kbd> 로 입력 지우기 ·{' '}
        <kbd>Esc</kbd> 일시정지 · 콤보 5마다 점수 배율 ↑
      </p>
    </div>
  )
}
