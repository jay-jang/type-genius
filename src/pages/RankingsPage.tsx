import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { leaderboard, scoreUnit, MODE_LABELS, type RankRow } from '../lib/stats'
import { formatTimeAgo } from '../lib/metrics'
import type { PracticeMode } from '../types'

const MODES: PracticeMode[] = ['ko', 'en', 'mixed']
const MEDALS = ['🥇', '🥈', '🥉']

export function RankingsPage() {
  const [mode, setMode] = useState<PracticeMode>('ko')
  const [globalRows, setGlobalRows] = useState<RankRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const sessions = useAppStore((s) => s.sessions)
  const profiles = useAppStore((s) => s.profiles)
  const currentId = useAppStore((s) => s.currentProfileId)
  const now = Date.now()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    fetch(`/api/rankings?mode=${mode}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch rankings')
        return res.json()
      })
      .then((data) => {
        if (active) {
          setGlobalRows(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.warn('Failed to load global rankings:', err)
        if (active) {
          setGlobalRows(null)
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [mode])

  const localRows = leaderboard(sessions, profiles, mode)
  const isGlobal = globalRows !== null
  const rows = globalRows ?? localRows
  const unit = scoreUnit(mode)
  const myRank = rows.findIndex((r) => r.profile.id === currentId)

  return (
    <div className="screen rankings">
      <div className="page-head">
        <h1 className="page-title">
          🏆 랭킹
          <span className={`rank-badge ${isGlobal ? 'global' : 'local'}`}>
            {isGlobal ? 'Global' : 'Local'}
          </span>
        </h1>
        <div className="seg">
          {MODES.map((m) => (
            <button key={m} className={`seg-btn ${mode === m ? 'on' : ''}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <p className="rank-note">
        {MODE_LABELS[mode]} 공간의 프로필별 최고 기록입니다. (단위: {unit})
        {myRank >= 0 && <strong> · 내 순위 {myRank + 1}위</strong>}
        {loading && <span style={{ marginLeft: '8px', color: 'var(--main)' }}>· 불러오는 중...</span>}
        {error && <span style={{ marginLeft: '8px', color: '#ff5c8a' }}>· 서버 연결 실패 (로컬 모드)</span>}
      </p>

      {rows.length === 0 ? (
        <p className="empty-msg">아직 기록이 없어요. 첫 연습으로 랭킹에 이름을 올려보세요!</p>
      ) : (
        <div className="rank-table">
          <div className="rank-row rank-header">
            <span className="rk-pos">순위</span>
            <span className="rk-name">프로필</span>
            <span className="rk-score">최고 {unit}</span>
            <span className="rk-acc">정확도</span>
            <span className="rk-cnt">연습</span>
            <span className="rk-when">최근</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.profile.id}
              className={`rank-row ${r.profile.id === currentId ? 'is-me' : ''} ${i < 3 ? 'is-top' : ''}`}
            >
              <span className="rk-pos">{i < 3 ? MEDALS[i] : i + 1}</span>
              <span className="rk-name">
                <span className="avatar sm" style={{ background: r.profile.color }}>
                  {r.profile.name[0]?.toUpperCase()}
                </span>
                {r.profile.name}
              </span>
              <span className="rk-score strong">{Math.round(r.best)}</span>
              <span className="rk-acc">{Math.round(r.bestAccuracy)}%</span>
              <span className="rk-cnt">{r.sessions}</span>
              <span className="rk-when">{formatTimeAgo(r.lastPlayed, now)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
