import { useNav } from '../app/nav'
import { GENRE_LABELS, GENRES, DIFFICULTY_LABELS } from '../data'
import { IconRedo, IconBook } from './Icons'
import type { Difficulty, Genre, PracticeMode } from '../types'

const MODES: { id: PracticeMode; label: string }[] = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
  { id: 'mixed', label: '복합' },
]
const DIFFS: (Difficulty | 'all')[] = ['all', 'easy', 'medium', 'hard']

export function ConfigBar() {
  const { config, setConfig, reroll, openLibrary } = useNav()

  return (
    <div className="config-bar">
      <div className="config-group">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`config-opt ${config.mode === m.id ? 'on' : ''}`}
            aria-pressed={config.mode === m.id}
            onClick={() => setConfig({ mode: m.id })}
          >
            {m.label}
          </button>
        ))}
      </div>

      <span className="config-sep" />

      <div className="config-group">
        <button
          className={`config-opt ${config.genre === 'all' ? 'on' : ''}`}
          aria-pressed={config.genre === 'all'}
          onClick={() => setConfig({ genre: 'all' })}
        >
          전체
        </button>
        {GENRES.map((g: Genre) => (
          <button
            key={g}
            className={`config-opt ${config.genre === g ? 'on' : ''}`}
            aria-pressed={config.genre === g}
            onClick={() => setConfig({ genre: g })}
          >
            {GENRE_LABELS[g]}
          </button>
        ))}
      </div>

      <span className="config-sep" />

      <div className="config-group">
        {DIFFS.map((d) => (
          <button
            key={d}
            className={`config-opt ${config.difficulty === d ? 'on' : ''}`}
            aria-pressed={config.difficulty === d}
            onClick={() => setConfig({ difficulty: d })}
          >
            {d === 'all' ? '난이도' : DIFFICULTY_LABELS[d]}
          </button>
        ))}
      </div>

      <span className="config-sep" />

      <div className="config-group">
        <button className="config-opt icon" onClick={reroll} title="다른 글" aria-label="다른 글">
          <IconRedo size={16} />
        </button>
        <button className="config-opt icon" onClick={() => openLibrary()} title="글 고르기" aria-label="글 고르기">
          <IconBook size={16} />
        </button>
      </div>
    </div>
  )
}
