import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { sessionsForProfile } from '../lib/stats'
import { summarizeActivity, classifyGame } from '../lib/activity'
import { formatTimeAgo, formatDuration } from '../lib/metrics'

// Dedicated "활동 기록" screen: what games were played and how often.
export function ActivityPage() {
  const sessions = useAppStore((s) => s.sessions)
  const currentId = useAppStore((s) => s.currentProfileId)
  const streak = useAppStore((s) => s.streak)
  const auth = useAppStore((s) => s.auth)

  const mine = useMemo(() => sessionsForProfile(sessions, currentId), [sessions, currentId])
  const activity = useMemo(() => summarizeActivity(mine), [mine])
  const recent = useMemo(
    () => [...mine].sort((a, b) => b.timestamp - a.timestamp).slice(0, 24),
    [mine],
  )
  const totalTime = useMemo(() => mine.reduce((a, s) => a + (s.durationMs || 0), 0), [mine])
  const maxDaily = Math.max(1, ...activity.recentDaily.map((d) => d.count))
  const now = Date.now()

  return (
    <div className="screen profile">
      <div className="page-head">
        <h1 className="page-title">🗂 활동 기록</h1>
      </div>

      {/* Account status */}
      <div className="card">
        <div className="card-head">
          <span>{auth ? `@${auth.user.username}` : '게스트'}</span>
          <span className="card-sub">
            {auth ? '기록이 계정에 저장돼 기기가 바뀌어도 이어져요.' : '로그인하면 기록을 계정에 보관할 수 있어요.'}
          </span>
        </div>
      </div>

      {/* Headline counts */}
      <div className="card">
        <div className="ps-stats">
          <Mini label="총 플레이" value={activity.totalPlays} />
          <Mini label="활동한 날" value={`${activity.activeDays}일`} />
          <Mini label="현재 연속" value={`${streak.days}일`} />
          <Mini label="최근 7일" value={`${activity.playsLast7}회`} />
          <Mini label="최근 30일" value={`${activity.playsLast30}회`} />
          <Mini label="누적 시간" value={totalTime ? formatDuration(totalTime) : '0초'} />
        </div>
      </div>

      {activity.totalPlays === 0 ? (
        <div className="card">
          <p className="empty-msg">아직 플레이 기록이 없어요. 한 판 해볼까요?</p>
        </div>
      ) : (
        <>
          {/* By game type */}
          <div className="card">
            <div className="card-head">
              <span>게임별 플레이</span>
              <span className="card-sub">무슨 게임을 얼마나</span>
            </div>
            <div className="activity-types">
              {activity.byType.map((t) => (
                <div className="activity-row" key={t.key}>
                  <span className="ar-name">{t.icon} {t.label}</span>
                  <span className="ar-bar">
                    <span className="ar-fill" style={{ width: `${Math.round((t.count / activity.totalPlays) * 100)}%` }} />
                  </span>
                  <span className="ar-count">{t.count}회</span>
                  <span className="ar-last">{formatTimeAgo(t.lastPlayed, now)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent 14-day frequency */}
          <div className="card">
            <div className="card-head">
              <span>최근 14일</span>
              <span className="card-sub">얼마나 자주</span>
            </div>
            <div className="activity-cal" aria-label="최근 14일 활동">
              {activity.recentDaily.map((d) => (
                <span
                  key={d.date}
                  className={`acal-day ${d.count > 0 ? 'on' : ''}`}
                  style={{ opacity: d.count > 0 ? 0.35 + 0.65 * (d.count / maxDaily) : undefined }}
                  title={`${d.date} · ${d.count}회`}
                />
              ))}
            </div>
          </div>

          {/* Recent plays timeline */}
          <div className="card">
            <div className="card-head">
              <span>최근 플레이</span>
            </div>
            <div className="history-list">
              {recent.map((s) => {
                const g = classifyGame(s)
                const headline =
                  s.genre === 'arcade'
                    ? `${s.score ?? 0}점`
                    : `${Math.round(s.mode === 'ko' ? s.cpm : s.wpm)} ${s.mode === 'ko' ? '타/분' : 'WPM'}`
                return (
                  <div className="history-row" key={s.id}>
                    <span className={`hist-mode mode-${s.mode}`}>{g.icon}</span>
                    <span className="hist-title">{g.label}</span>
                    <span className="hist-score">{headline}</span>
                    <span className="hist-acc">{s.genre === 'arcade' ? `콤보 ${s.maxCombo}` : `${Math.round(s.accuracy)}%`}</span>
                    <span className="hist-when">{formatTimeAgo(s.timestamp, now)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mini">
      <div className="mini-value">{value}</div>
      <div className="mini-label">{label}</div>
    </div>
  )
}
