import { useEffect, useMemo, useState } from 'react'
import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import { passagesFor } from '../data'
import { sessionsForProfile, summarize, sessionScore, scoreUnit } from '../lib/stats'
import type { PracticeMode } from '../types'

const SPACES: { id: PracticeMode; label: string }[] = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
  { id: 'mixed', label: '복합' },
]

// Static: the passage library is bundled, so these counts never change at runtime.
const SPACE_COUNT: Record<PracticeMode, number> = {
  ko: passagesFor({ language: 'ko' }).length,
  en: passagesFor({ language: 'en' }).length,
  mixed: passagesFor({}).length,
}

export function HomePage() {
  const { space, startRandom, startRace, startMixed, openLibrary, startCustom, goArcade } = useNav()
  const sessions = useAppStore((s) => s.sessions)
  const currentId = useAppStore((s) => s.currentProfileId)
  const streak = useAppStore((s) => s.streak)
  const [selected, setSelected] = useState<PracticeMode>(space)
  const [customOpen, setCustomOpen] = useState(false)
  const [customText, setCustomText] = useState('')

  const mine = useMemo(() => sessionsForProfile(sessions, currentId), [sessions, currentId])
  const summary = useMemo(() => summarize(mine), [mine])
  const spaceBest = useMemo(() => {
    const pool = mine.filter((s) => s.mode === selected && !s.isDrill)
    return pool.length ? Math.max(...pool.map(sessionScore)) : 0
  }, [mine, selected])

  const start = () => (selected === 'mixed' ? startMixed() : startRandom(selected))
  const browse = () => openLibrary(selected)

  // ← / → cycle the space; Enter starts (unless a button is focused, which handles its own Enter).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (customOpen) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const d = e.key === 'ArrowRight' ? 1 : -1
        setSelected((cur) => SPACES[(SPACES.findIndex((s) => s.id === cur) + d + SPACES.length) % SPACES.length].id)
      } else if (e.key === 'Enter') {
        if ((document.activeElement as HTMLElement)?.tagName === 'BUTTON') return
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // start/selected captured fresh each render; rebinding is cheap and keeps it correct.
  })

  return (
    <div className="screen home">
      <div className="home-hero">
        <h1 className="home-logo">
          type<span>genius</span>
        </h1>
        <p className="home-tag">진짜 글로 연습하는 한국어 · 영어 타자</p>
      </div>

      <div className="space-cards" role="radiogroup" aria-label="연습 공간">
        {SPACES.map((s) => (
          <button
            key={s.id}
            className={`space-card ${selected === s.id ? 'on' : ''}`}
            role="radio"
            aria-checked={selected === s.id}
            onClick={() => setSelected(s.id)}
            onDoubleClick={start}
          >
            <span className="sc-name">{s.label}</span>
            <span className="sc-count">{SPACE_COUNT[s.id]}편</span>
          </button>
        ))}
      </div>

      <div className="home-actions">
        <button className="btn primary lg" onClick={start}>
          ▶ 바로 시작
        </button>
        <button className="btn lg" onClick={browse}>
          글 고르기
        </button>
        <button className="btn lg" onClick={() => startRace(selected)}>
          👻 고스트 레이스
        </button>
        <button className="btn lg" onClick={() => setCustomOpen(true)}>
          내 글 붙여넣기
        </button>
        <button className="btn lg" onClick={goArcade}>
          🕹 산성비 게임
        </button>
      </div>

      {summary.totalSessions > 0 ? (
        <div className="home-summary">
          {spaceBest > 0 && (
            <>
              최고 <b>{Math.round(spaceBest)}</b> {scoreUnit(selected)} ·{' '}
            </>
          )}
          Lv.<b>{summary.level}</b> · 연습 <b>{summary.totalSessions}</b>회
          {streak.days > 0 && (
            <> · 🔥 <b>{streak.days}</b>일 연속</>
          )}
        </div>
      ) : (
        <div className="home-hint">첫 글을 입력하면 기록과 랭킹이 쌓여요</div>
      )}

      {customOpen && (
        <div className="modal-backdrop" onClick={() => setCustomOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">내 글로 연습</h2>
            <p className="modal-sub">
              연습하고 싶은 글을 붙여넣으세요. 한국어·영어는 자동으로 인식돼요.
              기록과 랭킹에는 반영되지 않아요.
            </p>
            <textarea
              className="custom-area"
              autoFocus
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="여기에 글을 붙여넣거나 입력하세요…"
            />
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setCustomOpen(false)}>
                취소
              </button>
              <button
                className="btn primary"
                disabled={!customText.trim()}
                onClick={() => {
                  startCustom(customText)
                  setCustomOpen(false)
                }}
              >
                연습 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
