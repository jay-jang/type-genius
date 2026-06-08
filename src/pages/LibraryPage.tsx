import { useEffect, useMemo, useRef, useState } from 'react'
import { useNav } from '../app/nav'
import {
  passagesFor,
  GENRE_LABELS,
  GENRES,
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
} from '../data'
import { MODE_LABELS } from '../lib/stats'
import { countStrokes } from '../lib/hangul'
import type { Difficulty, Genre } from '../types'

const PREVIEW_MAX = 220

export function LibraryPage() {
  const { space, startPassage, goHome } = useNav()
  const [genre, setGenre] = useState<Genre | 'all'>('all')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState(1)
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card')
  const touchX = useRef<number | null>(null)

  const language = space === 'mixed' ? undefined : space

  const list = useMemo(() => {
    let items = passagesFor({
      language,
      genre: genre === 'all' ? undefined : genre,
      difficulty: difficulty === 'all' ? undefined : difficulty,
    })
    const query = q.trim().toLowerCase()
    if (query) {
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.author.toLowerCase().includes(query) ||
          p.text.toLowerCase().includes(query),
      )
    }
    return items
  }, [language, genre, difficulty, q])

  // The deck resets to the first card whenever the filtered set changes.
  useEffect(() => setIdx(0), [language, genre, difficulty, q])

  const n = list.length
  const curIdx = n ? Math.min(idx, n - 1) : 0
  const cur = list[curIdx]

  const go = (d: number) => {
    if (n === 0) return
    setDir(d)
    setIdx((i) => (Math.min(i, n - 1) + d + n) % n)
  }
  const shuffle = () => {
    if (n <= 1) return
    setDir(1)
    setIdx((i) => {
      let r = i
      while (r === i) r = Math.floor(Math.random() * n)
      return r
    })
  }

  // Keyboard deck control; ignore while the search box is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (viewMode === 'card') {
        if (e.key === 'ArrowLeft') go(-1)
        else if (e.key === 'ArrowRight') go(1)
        else if (e.key === 'Enter') {
          if (cur) startPassage(cur.id, space)
        } else if (e.key.toLowerCase() === 's') shuffle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewMode, cur, n, idx, space, startPassage])

  return (
    <div className="screen library">
      <div className="page-head">
        <div>
          <button className="link-btn" onClick={goHome}>
            ← 홈
          </button>
          <h1 className="page-title">
            {MODE_LABELS[space]} 도서관 <span className="muted">· {n}편</span>
          </h1>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => setViewMode(v => v === 'card' ? 'grid' : 'card')}>
            {viewMode === 'card' ? '그리드 보기 ⊞' : '카드 보기 🗂'}
          </button>
          <button className="btn" onClick={shuffle} disabled={n <= 1} title="무작위 글 (S)">
            셔플 ↻
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search"
          placeholder="제목 · 작가 · 내용 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="chip-row">
          <button className={`chip ${genre === 'all' ? 'on' : ''}`} onClick={() => setGenre('all')}>
            전체
          </button>
          {GENRES.map((g) => (
            <button key={g} className={`chip ${genre === g ? 'on' : ''}`} onClick={() => setGenre(g)}>
              {GENRE_LABELS[g]}
            </button>
          ))}
        </div>
        <div className="chip-row">
          <button
            className={`chip sm ${difficulty === 'all' ? 'on' : ''}`}
            onClick={() => setDifficulty('all')}
          >
            난이도 전체
          </button>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`chip sm diff-${d} ${difficulty === d ? 'on' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {!cur ? (
        <p className="empty-msg">조건에 맞는 글이 없어요.</p>
      ) : viewMode === 'grid' ? (
        <div className="library-grid">
          {list.map((item) => (
            <article
              key={item.id}
              className={`library-grid-card ${cur?.id === item.id ? 'active' : ''}`}
              onClick={() => startPassage(item.id, space)}
              style={{ cursor: 'pointer' }}
            >
              <div className="dc-top">
                <span className="dc-genre">{GENRE_LABELS[item.genre]}</span>
                <span className={`dc-diff diff-${item.difficulty}`}>{DIFFICULTY_LABELS[item.difficulty]}</span>
              </div>
              <div className="dc-title">{item.title}</div>
              <div className="dc-author">
                {item.author}
                {space === 'mixed' && <span className="pc-lang"> · {LANGUAGE_LABELS[item.language]}</span>}
              </div>
              <p className="dc-preview">
                {item.text.trim().slice(0, 120)}
                {item.text.trim().length > 120 ? '…' : ''}
              </p>
              <div className="dc-meta">
                <span>{item.text.replace(/[\n\r]/g, '').length}자</span>
                <span>·</span>
                <span>{item.language === 'ko' ? countStrokes(item.text) : item.text.replace(/[\n\r]/g, '').length}타</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="deck">
            <button className="deck-nav" onClick={() => go(-1)} aria-label="이전 글">
              ‹
            </button>
            <div
              className="deck-stage"
              onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchX.current == null) return
                const dx = e.changedTouches[0].clientX - touchX.current
                touchX.current = null
                if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
              }}
            >
              <article key={cur.id} className={`deck-card ${dir > 0 ? 'in-right' : 'in-left'}`}>
                <div className="dc-top">
                  <span className="dc-genre">{GENRE_LABELS[cur.genre]}</span>
                  <span className={`dc-diff diff-${cur.difficulty}`}>{DIFFICULTY_LABELS[cur.difficulty]}</span>
                </div>
                <div className="dc-title">{cur.title}</div>
                <div className="dc-author">
                  {cur.author}
                  {space === 'mixed' && <span className="pc-lang"> · {LANGUAGE_LABELS[cur.language]}</span>}
                </div>
                <p className="dc-preview">
                  {cur.text.trim().slice(0, PREVIEW_MAX)}
                  {cur.text.trim().length > PREVIEW_MAX ? '…' : ''}
                </p>
                <div className="dc-meta">
                  <span>{cur.text.replace(/[\n\r]/g, '').length}자</span>
                  <span>·</span>
                  <span>{cur.language === 'ko' ? countStrokes(cur.text) : cur.text.replace(/[\n\r]/g, '').length}타</span>
                </div>
              </article>
            </div>
            <button className="deck-nav" onClick={() => go(1)} aria-label="다음 글">
              ›
            </button>
          </div>

          <div className="deck-foot">
            {n <= 12 && (
              <div className="deck-dots" aria-hidden="true">
                {list.map((_, i) => (
                  <i key={i} className={i === curIdx ? 'on' : ''} />
                ))}
              </div>
            )}
            <span className="deck-count">
              {curIdx + 1} / {n}
            </span>
          </div>

          <div className="deck-actions">
            <button className="btn primary lg" onClick={() => startPassage(cur.id, space)}>
              ▶ 이 글로 시작
            </button>
          </div>
        </>
      )}
    </div>
  )
}
