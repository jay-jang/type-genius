import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { Language } from '../types'
import { useTypingEngine, statusesFor, type EngineResult } from '../hooks/useTypingEngine'
import { primarySpeed, speedUnit } from '../lib/metrics'
import { spawnBurst, spawnConfetti, shake, flash } from '../lib/effects'
import { sound } from '../lib/sound'
import { useAppStore } from '../store/useAppStore'

interface TypingAreaProps {
  target: string
  language: Language
  title: string
  subtitle?: string
  badge?: string
  onFinish: (result: EngineResult) => void
}

export function TypingArea({ target, language, title, subtitle, badge, onFinish }: TypingAreaProps) {
  const settings = useAppStore((s) => s.settings)
  const setTyping = useAppStore((s) => s.setTyping)
  const prefersReducedMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const effectsOn = settings.effectsEnabled && !prefersReducedMotion

  const stageRef = useRef<HTMLDivElement | null>(null)
  const areaRef = useRef<HTMLDivElement | null>(null)
  const wordsRef = useRef<HTMLDivElement | null>(null)
  const caretRef = useRef<HTMLDivElement | null>(null)
  const fxRef = useRef<HTMLDivElement | null>(null)

  const [isFocused, setIsFocused] = useState(true)
  const [comboPop, setComboPop] = useState(0)
  const [comboKey, setComboKey] = useState(0)

  const fxAtCaret = (fn: (x: number, y: number) => void) => {
    const layer = fxRef.current
    const caret = caretRef.current
    if (!layer || !caret) return
    if (layer.childElementCount > 150) return
    const lr = layer.getBoundingClientRect()
    const cr = caret.getBoundingClientRect()
    fn(cr.left - lr.left + cr.width / 2, cr.top - lr.top + cr.height / 2)
  }

  const engine = useTypingEngine({
    target,
    language,
    onCorrect: () => {
      sound.key()
      if (effectsOn) fxAtCaret((x, y) => spawnBurst(fxRef.current!, x, y, { count: 2, power: 34, size: 4 }))
    },
    onMistake: () => {
      sound.error()
      if (effectsOn) {
        if (stageRef.current) shake(stageRef.current, 5)
        if (areaRef.current) flash(areaRef.current, 'var(--error)')
        fxAtCaret((x, y) => spawnBurst(fxRef.current!, x, y, { count: 6, colors: ['var(--error)'], power: 46 }))
      }
    },
    onCombo: (level) => {
      sound.combo(level)
      setComboPop(level * 10)
      setComboKey((k) => k + 1)
      if (effectsOn) fxAtCaret((x, y) => spawnBurst(fxRef.current!, x, y, { count: 14, power: 78, size: 7 }))
    },
    onFinish: (result) => {
      setTyping(false)
      sound.complete()
      if (effectsOn && fxRef.current) spawnConfetti(fxRef.current)
      onFinish(result)
    },
  })

  const { value, committed, isComposing, combo, stats, textareaProps, reset, focus, taRef } = engine

  // Build the words/letters (memoized so 200ms stat ticks don't rebuild them).
  const nodes = useMemo<ReactElement[]>(() => {
    const statuses = statusesFor(target, value, committed, isComposing)
    const out: ReactElement[] = []
    let i = 0
    let wi = 0
    while (i < target.length) {
      const ch = target[i]
      if (ch === '\n') {
        out.push(<span key={`n${i}`} className="lbreak" data-i={String(i)} />)
        i++
        continue
      }
      if (ch === ' ') {
        out.push(
          <span key={i} data-i={String(i)} className={`letter space ${statuses[i]}`}>
            {' '}
          </span>,
        )
        i++
        continue
      }
      const letters: ReactElement[] = []
      while (i < target.length && target[i] !== ' ' && target[i] !== '\n') {
        const st = statuses[i]
        const display = (st === 'composing' || st === 'composing-incorrect') ? value[i] ?? target[i] : target[i]
        letters.push(
          <span key={i} data-i={String(i)} className={`letter ${st}`}>
            {display}
          </span>,
        )
        i++
      }
      out.push(
        <div key={`w${wi++}`} className="word">
          {letters}
        </div>,
      )
    }
    if (value.length > target.length) {
      const extra = value.slice(target.length).replace(/\n/g, '')
      if (extra) {
        out.push(
          <div key="extra" className="word">
            {[...extra].map((c, j) => (
              <span key={`x${j}`} className="letter extra">
                {c}
              </span>
            ))}
          </div>,
        )
      }
    }
    return out
  }, [target, value, committed, isComposing])

  // Position the gliding caret + scroll the active line into the band.
  useLayoutEffect(() => {
    const words = wordsRef.current
    const caret = caretRef.current
    const area = areaRef.current
    if (!words || !caret || !area) return
    const caretIdx = Math.min(value.length, target.length)

    let left = 0
    let top = 0
    let height = 0
    const el = words.querySelector<HTMLElement>(`[data-i="${caretIdx}"]`)
    if (el && !el.classList.contains('lbreak')) {
      left = el.offsetLeft
      top = el.offsetTop
      height = el.offsetHeight
    } else {
      // end of text or a newline → sit just after the previous real letter
      let prev: HTMLElement | null = null
      for (let j = caretIdx - 1; j >= 0 && j >= caretIdx - 400; j--) {
        const p = words.querySelector<HTMLElement>(`[data-i="${j}"]`)
        if (p && !p.classList.contains('lbreak')) {
          prev = p
          break
        }
      }
      if (prev) {
        left = prev.offsetLeft + prev.offsetWidth
        top = prev.offsetTop
        height = prev.offsetHeight
      } else {
        height = words.firstElementChild ? (words.firstElementChild as HTMLElement).offsetHeight : 0
      }
    }
    caret.style.left = `${left}px`
    caret.style.top = `${top}px`
    if (height) caret.style.height = `${height}px`

    // keep the caret line near the top of the band (Monkeytype-style line scroll)
    const oneLine = height || parseFloat(getComputedStyle(words).lineHeight) || 0
    const offset = Math.max(0, top - oneLine)
    words.style.transform = `translateY(${-offset}px)`
  }, [value, committed, isComposing, target, settings.fontSize])

  // "press any key to focus" when blurred.
  useEffect(() => {
    const onKey = () => {
      if (engine.finished) return
      if (document.activeElement !== taRef.current) focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [engine.finished, focus, taRef])

  // leaving the test (unmount) clears focus-mode chrome dimming.
  useEffect(() => () => setTyping(false), [setTyping])

  const smooth = settings.smoothCaret && !prefersReducedMotion
  const speed = primarySpeed(language, stats.wpm, stats.cpm)
  const progressPct = Math.round(stats.progress * 100)

  return (
    <div className="typing-stage" ref={stageRef}>
      {settings.showLiveStats && (
        <div className="test-live">
          <span className="tl-speed">
            {speed} <i>{speedUnit(language)}</i>
          </span>
          <span className="tl-sep">·</span>
          <span className="tl-prog">{progressPct}%</span>
          {combo >= 5 && <span className="tl-combo">×{combo}</span>}
        </div>
      )}

      <div
        className={`test-area ${!isFocused ? 'blurred' : ''}`}
        ref={areaRef}
        style={{ fontSize: settings.fontSize }}
        onMouseDown={(e) => {
          e.preventDefault()
          focus()
          sound.resume()
        }}
      >
        <div className={`words ${smooth ? 'smooth' : ''}`} ref={wordsRef}>
          {nodes}
          <div className={`tg-caret ${smooth ? 'smooth' : ''}`} ref={caretRef} />
        </div>

        {!isFocused && (
          <div className="focus-overlay">
            <span>클릭하거나 아무 키나 눌러 집중하세요</span>
          </div>
        )}

        <textarea
          {...textareaProps}
          className="capture"
          aria-label="타이핑 입력 영역"
          inputMode="text"
          onFocus={() => {
            setIsFocused(true)
            sound.resume()
          }}
          onBlur={() => {
            setIsFocused(false)
            setTyping(false)
          }}
          onKeyDown={(e) => {
            if (!engine.finished) setTyping(true)
            if (e.key === 'Tab') {
              e.preventDefault()
              reset()
              requestAnimationFrame(focus)
            }
          }}
        />
      </div>

      <div className="test-source">
        {badge && <span className="src-badge">{badge}</span>}
        <span className="src-title">{title}</span>
        {subtitle && <span className="src-sub">{subtitle}</span>}
      </div>

      {comboPop > 0 && (
        <div className="combo-pop" key={comboKey}>
          ×{comboPop}
        </div>
      )}

      <div className="fx-layer" ref={fxRef} aria-hidden />
    </div>
  )
}
