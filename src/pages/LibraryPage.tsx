import { useMemo, useState } from 'react'
import { useNav } from '../app/nav'
import {
  passagesFor,
  GENRE_LABELS,
  GENRE_ICONS,
  GENRES,
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
} from '../data'
import { MODE_LABELS } from '../lib/stats'
import { countStrokes } from '../lib/hangul'
import type { Difficulty, Genre } from '../types'

export function LibraryPage() {
  const { space, startPassage, startMixed, startRandom, goHome } = useNav()
  const [genre, setGenre] = useState<Genre | 'all'>('all')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [q, setQ] = useState('')

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

  return (
    <div className="screen library">
      <div className="page-head">
        <div>
          <button className="link-btn" onClick={goHome}>
            ← 홈
          </button>
          <h1 className="page-title">
            {MODE_LABELS[space]} 도서관 <span className="muted">· {list.length}편</span>
          </h1>
        </div>
        <div className="page-head-actions">
          {space === 'mixed' ? (
            <button className="btn primary" onClick={() => startMixed()}>
              🔀 복합 연습 시작
            </button>
          ) : (
            <button className="btn primary" onClick={() => startRandom(space)}>
              🎲 랜덤 시작
            </button>
          )}
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
              {GENRE_ICONS[g]} {GENRE_LABELS[g]}
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

      {list.length === 0 ? (
        <p className="empty-msg">조건에 맞는 글이 없어요.</p>
      ) : (
        <div className="passage-grid">
          {list.map((p) => {
            const chars = p.text.replace(/[\n\r]/g, '').length
            const strokes = p.language === 'ko' ? countStrokes(p.text) : chars
            return (
              <button key={p.id} className="passage-card" onClick={() => startPassage(p.id, space)}>
                <div className="pc-top">
                  <span className={`pc-genre`}>
                    {GENRE_ICONS[p.genre]} {GENRE_LABELS[p.genre]}
                  </span>
                  <span className={`pc-diff diff-${p.difficulty}`}>{DIFFICULTY_LABELS[p.difficulty]}</span>
                </div>
                <div className="pc-title">{p.title}</div>
                <div className="pc-author">
                  {p.author}
                  {space === 'mixed' && <span className="pc-lang"> · {LANGUAGE_LABELS[p.language]}</span>}
                </div>
                <div className="pc-preview">{p.text.replace(/\n+/g, ' ').slice(0, 70)}…</div>
                <div className="pc-meta">
                  <span>{chars}자</span>
                  <span>·</span>
                  <span>{strokes}타</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
