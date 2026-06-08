import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import { sessionsForProfile, summarize } from '../lib/stats'
import { genreCounts, GENRE_ICONS, GENRE_LABELS } from '../data'
import { formatDuration } from '../lib/metrics'
import type { Genre } from '../types'

const SPACES = [
  { mode: 'ko' as const, title: '한국어', sub: '시 · 소설 · 노래 · 논픽션', glyph: '한', accent: '#7c5cff' },
  { mode: 'en' as const, title: 'English', sub: 'Poems · Novels · Songs', glyph: 'EN', accent: '#22d3ee' },
  { mode: 'mixed' as const, title: '복합 모드', sub: '한·영을 번갈아 연습', glyph: '한/EN', accent: '#ff5c8a' },
]

export function HomePage() {
  const { openLibrary, startRandom, startMixed, goRankings } = useNav()
  const sessions = useAppStore((s) => s.sessions)
  const currentId = useAppStore((s) => s.currentProfileId)
  const profiles = useAppStore((s) => s.profiles)
  const profile = profiles.find((p) => p.id === currentId)
  const mine = sessionsForProfile(sessions, currentId)
  const summary = summarize(mine)
  const counts = genreCounts()

  return (
    <div className="screen home">
      <section className="hero">
        <h1 className="hero-title">
          진짜 글로 즐기는 <span className="grad-text">타자 연습</span>
        </h1>
        <p className="hero-sub">
          {profile ? `${profile.name}님, ` : ''}시와 소설, 노래와 논픽션을 한글과 영어로 연습하고
          <br />
          타격감 있는 피드백과 실시간 지표로 실력을 키워보세요.
        </p>
      </section>

      <section className="space-grid">
        {SPACES.map((s) => (
          <div className="space-card" key={s.mode} style={{ ['--accent' as string]: s.accent }}>
            <div className="space-glyph">{s.glyph}</div>
            <div className="space-title">{s.title}</div>
            <div className="space-sub">{s.sub}</div>
            <div className="space-actions">
              <button
                className="btn primary"
                onClick={() => (s.mode === 'mixed' ? startMixed() : startRandom(s.mode))}
              >
                바로 시작
              </button>
              <button
                className="btn ghost"
                onClick={() => (s.mode === 'mixed' ? openLibrary('mixed') : openLibrary(s.mode))}
              >
                글 고르기
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="home-bottom">
        <div className="genre-strip">
          {(Object.keys(GENRE_LABELS) as Genre[]).map((g) => (
            <button key={g} className="genre-tile" onClick={() => openLibrary('ko')}>
              <span className="genre-icon">{GENRE_ICONS[g]}</span>
              <span className="genre-name">{GENRE_LABELS[g]}</span>
              <span className="genre-count">{counts[g]}편</span>
            </button>
          ))}
        </div>

        <div className="home-stats card">
          <div className="home-stats-head">
            <span>내 기록</span>
            <button className="link-btn" onClick={goRankings}>
              랭킹 보기 →
            </button>
          </div>
          <div className="home-stats-grid">
            <Stat label="레벨" value={`Lv.${summary.level}`} />
            <Stat label="연습 횟수" value={summary.totalSessions} />
            <Stat label="최고 WPM" value={Math.round(summary.bestWpm)} />
            <Stat label="평균 정확도" value={`${Math.round(summary.avgAccuracy)}%`} />
            <Stat label="누적 시간" value={summary.totalTimeMs ? formatDuration(summary.totalTimeMs) : '0초'} />
            <Stat label="누적 글자" value={summary.totalChars.toLocaleString()} />
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
