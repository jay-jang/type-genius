import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { LineChart } from '../components/LineChart'
import {
  improvementSeries,
  recentSessions,
  sessionsForProfile,
  summarize,
  sessionScore,
  scoreUnit,
  MODE_LABELS,
} from '../lib/stats'
import { formatDuration, formatTimeAgo } from '../lib/metrics'
import { sound } from '../lib/sound'
import { THEMES } from '../data/themes'
import type { KeySoundProfile } from '../types'

const SOUND_PROFILES: { id: KeySoundProfile; label: string }[] = [
  { id: 'thock', label: '톡 (저음)' },
  { id: 'click', label: '클릭 (청축)' },
  { id: 'soft', label: '소프트' },
]

export function ProfilePage() {
  const profiles = useAppStore((s) => s.profiles)
  const currentId = useAppStore((s) => s.currentProfileId)
  const sessions = useAppStore((s) => s.sessions)
  const settings = useAppStore((s) => s.settings)
  const addProfile = useAppStore((s) => s.addProfile)
  const selectProfile = useAppStore((s) => s.selectProfile)
  const renameProfile = useAppStore((s) => s.renameProfile)
  const deleteProfile = useAppStore((s) => s.deleteProfile)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const clearProfileSessions = useAppStore((s) => s.clearProfileSessions)

  const [newName, setNewName] = useState('')
  const now = Date.now()

  const profile = profiles.find((p) => p.id === currentId)
  const mine = sessionsForProfile(sessions, currentId)
  const summary = summarize(mine)
  const series = currentId ? improvementSeries(sessions, currentId) : []
  const recent = currentId ? recentSessions(sessions, currentId) : []
  const xpPct = Math.round((summary.xpInLevel / summary.xpForNextLevel) * 100)

  return (
    <div className="screen profile">
      <div className="page-head">
        <h1 className="page-title">📊 통계 & 설정</h1>
      </div>

      {/* Profile summary */}
      <div className="card profile-summary">
        <div className="ps-identity">
          <span className="avatar lg" style={{ background: profile?.color ?? '#7c5cff' }}>
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </span>
          <div>
            <input
              className="name-input"
              value={profile?.name ?? ''}
              onChange={(e) => currentId && renameProfile(currentId, e.target.value)}
              placeholder="이름"
            />
            <div className="level-line">
              <span className="lv-badge">Lv.{summary.level}</span>
              <div className="xp-track">
                <div className="xp-fill" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="xp-text">
                {summary.xpInLevel} / {summary.xpForNextLevel} XP
              </span>
            </div>
          </div>
        </div>
        <div className="ps-stats">
          <Mini label="연습 횟수" value={summary.totalSessions} />
          <Mini label="최고 WPM" value={Math.round(summary.bestWpm)} />
          <Mini label="최고 타수" value={Math.round(summary.bestCpm)} />
          <Mini label="평균 정확도" value={`${Math.round(summary.avgAccuracy)}%`} />
          <Mini label="누적 시간" value={summary.totalTimeMs ? formatDuration(summary.totalTimeMs) : '0초'} />
          <Mini label="누적 타수" value={summary.totalStrokes.toLocaleString()} />
        </div>
      </div>

      {/* Improvement chart */}
      <div className="card chart-card">
        <div className="card-head">
          <span>성장 그래프 (연습별 속도)</span>
        </div>
        <LineChart series={[{ values: series.map((s) => s.score), color: '#34d399' }]} height={170} xLabel="연습 →" />
      </div>

      {/* Recent history */}
      <div className="card">
        <div className="card-head">
          <span>최근 기록</span>
        </div>
        {recent.length === 0 ? (
          <p className="empty-msg sm">아직 연습 기록이 없어요.</p>
        ) : (
          <div className="history-list">
            {recent.map((s) => (
              <div className="history-row" key={s.id}>
                <span className={`hist-mode mode-${s.mode}`}>{MODE_LABELS[s.mode]}</span>
                <span className="hist-title">
                  {s.textTitle}
                  {s.isDrill && <span className="hist-drill"> · 오답</span>}
                </span>
                <span className="hist-score">
                  {Math.round(sessionScore(s))}
                  <i>{scoreUnit(s.mode)}</i>
                </span>
                <span className="hist-acc">{Math.round(s.accuracy)}%</span>
                <span className="hist-when">{formatTimeAgo(s.timestamp, now)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Theme */}
      <div className="card">
        <div className="card-head">
          <span>테마</span>
        </div>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-swatch ${settings.theme === t.id ? 'on' : ''}`}
              style={{ background: t.bg, color: t.text }}
              onClick={() => updateSettings({ theme: t.id })}
              aria-pressed={settings.theme === t.id}
            >
              <span className="ts-name">{t.name}</span>
              <span className="ts-dots">
                <i style={{ background: t.main }} />
                <i style={{ background: t.sub }} />
                <i style={{ background: t.text }} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="card settings">
        <div className="card-head">
          <span>설정</span>
        </div>
        <div className="setting-row">
          <label>사운드</label>
          <Toggle on={settings.soundEnabled} label="사운드" onChange={(v) => updateSettings({ soundEnabled: v })} />
        </div>
        <div className="setting-row">
          <label>음량</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            aria-label="음량"
            onChange={(e) => {
              const v = Number(e.target.value)
              updateSettings({ volume: v })
              sound.setVolume(v)
              sound.key()
            }}
          />
        </div>
        <div className="setting-row">
          <label>키 사운드</label>
          <div className="chip-row">
            {SOUND_PROFILES.map((sp) => (
              <button
                key={sp.id}
                className={`chip sm ${settings.keySoundProfile === sp.id ? 'on' : ''}`}
                onClick={() => {
                  updateSettings({ keySoundProfile: sp.id })
                  sound.setProfile(sp.id)
                  sound.setEnabled(true)
                  sound.key()
                }}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <label>이펙트 (파티클/진동)</label>
          <Toggle on={settings.effectsEnabled} label="이펙트" onChange={(v) => updateSettings({ effectsEnabled: v })} />
        </div>
        <div className="setting-row">
          <label>부드러운 캐럿</label>
          <Toggle on={settings.smoothCaret} label="부드러운 캐럿" onChange={(v) => updateSettings({ smoothCaret: v })} />
        </div>
        <div className="setting-row">
          <label>실시간 지표 표시</label>
          <Toggle on={settings.showLiveStats} label="실시간 지표 표시" onChange={(v) => updateSettings({ showLiveStats: v })} />
        </div>
        <div className="setting-row">
          <label>글자 크기 ({settings.fontSize}px)</label>
          <input
            type="range"
            min={22}
            max={56}
            step={1}
            value={settings.fontSize}
            aria-label="글자 크기"
            onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Profile management */}
      <div className="card profiles-card">
        <div className="card-head">
          <span>프로필 관리</span>
        </div>
        <div className="profile-list">
          {profiles.map((p) => (
            <div key={p.id} className={`profile-item ${p.id === currentId ? 'active' : ''}`}>
              <span className="avatar sm" style={{ background: p.color }}>
                {p.name[0]?.toUpperCase()}
              </span>
              <span className="pi-name">{p.name}</span>
              <span className="pi-count">{sessions.filter((s) => s.profileId === p.id).length}회</span>
              {p.id !== currentId && (
                <button className="btn ghost sm" onClick={() => selectProfile(p.id)}>
                  선택
                </button>
              )}
              {profiles.length > 1 && (
                <button
                  className="btn danger sm"
                  onClick={() => {
                    if (confirm(`'${p.name}' 프로필과 모든 기록을 삭제할까요?`)) deleteProfile(p.id)
                  }}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="add-profile">
          <input
            className="search"
            placeholder="새 프로필 이름"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                addProfile(newName)
                setNewName('')
              }
            }}
          />
          <button
            className="btn primary"
            onClick={() => {
              if (newName.trim()) {
                addProfile(newName)
                setNewName('')
              }
            }}
          >
            추가
          </button>
        </div>
        {mine.length > 0 && (
          <button
            className="btn danger ghost reset-btn"
            onClick={() => {
              if (currentId && confirm('이 프로필의 모든 연습 기록을 삭제할까요?')) clearProfileSessions(currentId)
            }}
          >
            내 기록 초기화
          </button>
        )}
      </div>
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

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span className="toggle-knob" />
    </button>
  )
}
