import { useEffect, useRef, useState } from 'react'
import type * as React from 'react'
import type { Language } from '../types'
import { useTypingEngine, statusesFor, type EngineResult } from '../hooks/useTypingEngine'
import { primarySpeed, speedUnit, formatDuration } from '../lib/metrics'
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
  const effectsOn = settings.effectsEnabled

  const stageRef = useRef<HTMLDivElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const fxRef = useRef<HTMLDivElement | null>(null)
  const caretRef = useRef<HTMLSpanElement | null>(null)

  const [comboPop, setComboPop] = useState(0)
  const [comboKey, setComboKey] = useState(0)

  const fxAt = (fn: (x: number, y: number) => void) => {
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
      if (effectsOn) fxAt((x, y) => spawnBurst(fxRef.current!, x, y, { count: 2, power: 36, size: 5 }))
    },
    onMistake: () => {
      sound.error()
      if (effectsOn) {
        if (stageRef.current) shake(stageRef.current, 6)
        if (surfaceRef.current) flash(surfaceRef.current, '#ff5c7a')
        fxAt((x, y) => spawnBurst(fxRef.current!, x, y, { count: 7, colors: ['#ff5c7a', '#ff8a5c'], power: 52 }))
      }
    },
    onCombo: (level) => {
      sound.combo(level)
      setComboPop(level * 10)
      setComboKey((k) => k + 1)
      if (effectsOn) fxAt((x, y) => spawnBurst(fxRef.current!, x, y, { count: 16, power: 85, size: 8 }))
    },
    onFinish: (result) => {
      sound.complete()
      if (effectsOn && fxRef.current) spawnConfetti(fxRef.current)
      onFinish(result)
    },
  })

  const { value, committed, isComposing, combo, stats, textareaProps, reset, focus } = engine

  // Keep the caret in view for long passages.
  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: 'nearest' })
  }, [value])

  const statuses = statusesFor(target, value, committed, isComposing)
  const caretIdx = Math.min(value.length, target.length)
  const caretAtEnd = value.length >= target.length

  const renderCaret = () => (
    <span
      className="caret"
      ref={(el) => {
        caretRef.current = el
      }}
    />
  )

  const nodes: React.ReactNode[] = []
  for (let i = 0; i < target.length; i++) {
    if (!caretAtEnd && i === caretIdx) nodes.push(<span key={`caret`}>{renderCaret()}</span>)
    const ch = target[i]
    const st = statuses[i]
    if (ch === '\n') {
      nodes.push(<span key={i} className={`ch newline ${st}`}>{'\n'}</span>)
      continue
    }
    const typed = value[i]
    let display = ch
    if (st === 'incorrect') display = typed && typed !== '\n' ? typed : ch
    else if (st === 'composing') display = typed && typed !== '\n' ? typed : ch
    const isSpace = ch === ' '
    nodes.push(
      <span key={i} className={`ch ${st}${isSpace ? ' space' : ''}`}>
        {display}
      </span>,
    )
  }
  // extra characters typed beyond the target
  if (value.length > target.length) {
    const extra = value.slice(target.length)
    for (let j = 0; j < extra.length; j++) {
      const c = extra[j]
      if (c === '\n') continue
      nodes.push(
        <span key={`x${j}`} className="ch incorrect extra">
          {c}
        </span>,
      )
    }
  }
  if (caretAtEnd) nodes.push(<span key="caret-end">{renderCaret()}</span>)

  const speed = primarySpeed(language, stats.wpm, stats.cpm)
  const comboToNext = combo > 0 ? combo % 10 : 0
  const comboFill = combo > 0 ? (comboToNext === 0 ? 100 : (comboToNext / 10) * 100) : 0

  return (
    <div className="typing-stage" ref={stageRef}>
      <div className="practice-head">
        <div className="practice-titles">
          {badge && <span className="practice-badge">{badge}</span>}
          <h2 className="practice-title">{title}</h2>
          {subtitle && <p className="practice-sub">{subtitle}</p>}
        </div>
        <div className={`combo-meter ${combo >= 10 ? 'is-hot' : ''}`}>
          <div className="combo-value">
            <span className="combo-num">{combo}</span>
            <span className="combo-label">COMBO</span>
          </div>
          <div className="combo-track">
            <div className="combo-fill" style={{ width: `${comboFill}%` }} />
          </div>
        </div>
      </div>

      <div className="hud">
        <Metric value={speed} label={speedUnit(language)} accent />
        <Metric value={`${stats.accuracy}%`} label="정확도" />
        <Metric value={formatDuration(stats.elapsedMs)} label="시간" />
        <Metric value={stats.errors} label="오타" warn={stats.errors > 0} />
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.round(stats.progress * 100)}%` }} />
      </div>

      <div
        className="typing-surface"
        ref={surfaceRef}
        onMouseDown={(e) => {
          e.preventDefault()
          focus()
          sound.resume()
        }}
      >
        <div className="passage-text" style={{ fontSize: settings.fontSize }}>
          {nodes}
        </div>
        <textarea
          {...textareaProps}
          className="capture"
          aria-label="타이핑 입력 영역"
          onFocus={() => sound.resume()}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault()
              reset()
              requestAnimationFrame(focus)
            }
          }}
        />
      </div>

      <div className="practice-hint">
        <kbd>Tab</kbd> 다시 시작 · 화면을 클릭하면 입력에 집중됩니다
      </div>

      {comboPop > 0 && (
        <div className="combo-pop" key={comboKey}>
          🔥 {comboPop} COMBO!
        </div>
      )}

      <div className="fx-layer" ref={fxRef} aria-hidden />
    </div>
  )
}

function Metric({
  value,
  label,
  accent,
  warn,
}: {
  value: string | number
  label: string
  accent?: boolean
  warn?: boolean
}) {
  return (
    <div className={`metric ${accent ? 'metric-accent' : ''} ${warn ? 'metric-warn' : ''}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}
