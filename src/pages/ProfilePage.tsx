import { useMemo, useRef, useState } from 'react'
import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import { LineChart } from '../components/LineChart'
import { weakUnits, buildWeaknessDrill } from '../lib/weakness'
import type { Language } from '../types'
import {
  improvementSeries,
  recentSessions,
  sessionsForProfile,
  summarize,
  sessionScore,
  scoreUnit,
  MODE_LABELS,
} from '../lib/stats'
import { evaluateAchievements } from '../lib/achievements'
import { summarizeActivity } from '../lib/activity'
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
  const streak = useAppStore((s) => s.streak)
  const auth = useAppStore((s) => s.auth)
  const addProfile = useAppStore((s) => s.addProfile)
  const selectProfile = useAppStore((s) => s.selectProfile)
  const renameProfile = useAppStore((s) => s.renameProfile)
  const deleteProfile = useAppStore((s) => s.deleteProfile)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const clearProfileSessions = useAppStore((s) => s.clearProfileSessions)
  const exportData = useAppStore((s) => s.exportData)
  const importData = useAppStore((s) => s.importData)
  const { space, startDrill } = useNav()

  const [newName, setNewName] = useState('')
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const d = new Date()
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const a = document.createElement('a')
    a.href = url
    a.download = `typegenius-backup-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackupMsg({ ok: true, text: '내보내기 완료!' })
  }

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const ok = importData(JSON.parse(String(reader.result)))
        setBackupMsg(
          ok
            ? { ok: true, text: '가져오기 완료! 데이터가 복원되었어요.' }
            : { ok: false, text: '올바른 TypeGenius 백업 파일이 아니에요.' },
        )
      } catch {
        setBackupMsg({ ok: false, text: '파일을 읽을 수 없어요 (JSON 오류).' })
      }
    }
    reader.onerror = () => setBackupMsg({ ok: false, text: '파일을 읽을 수 없어요.' })
    reader.readAsText(file)
  }
  const now = Date.now()

  const profile = profiles.find((p) => p.id === currentId)
  const mine = sessionsForProfile(sessions, currentId)
  const summary = summarize(mine)
  const series = currentId ? improvementSeries(sessions, currentId) : []
  const recent = currentId ? recentSessions(sessions, currentId) : []
  const xpPct = Math.round((summary.xpInLevel / summary.xpForNextLevel) * 100)
  const badges = useMemo(
    () => evaluateAchievements({ sessions: mine, summary, streak }),
    [mine, summary, streak],
  )
  const unlockedCount = badges.filter((b) => b.unlocked).length

  const activity = useMemo(() => summarizeActivity(mine), [mine])
  const maxDaily = Math.max(1, ...activity.recentDaily.map((d) => d.count))

  // The weakness card analyzes one concrete language. 복합(mixed) folds into Korean.
  const weakLang: Language = space === 'en' ? 'en' : 'ko'
  const units = useMemo(
    () => weakUnits(sessions, currentId, weakLang),
    [sessions, currentId, weakLang],
  )

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

      {/* Streak */}
      <div className="card streak-card">
        <div className="card-head">
          <span>🔥 데일리 스트릭</span>
        </div>
        <div className="ps-stats">
          <Mini label="현재 연속" value={`${streak.days}일`} />
          <Mini label="최고 연속" value={`${streak.best}일`} />
        </div>
      </div>

      {/* Comprehensive activity record */}
      <div className="card activity-card">
        <div className="card-head">
          <span>🗂 활동 기록</span>
          <span className="card-sub">
            {auth ? `@${auth.user.username} · 계정에 저장됨` : '게스트 · 로그인하면 계정에 보관돼요'}
          </span>
        </div>
        <div className="ps-stats">
          <Mini label="총 플레이" value={activity.totalPlays} />
          <Mini label="활동한 날" value={`${activity.activeDays}일`} />
          <Mini label="최근 7일" value={`${activity.playsLast7}회`} />
          <Mini label="최근 30일" value={`${activity.playsLast30}회`} />
        </div>

        {activity.byType.length > 0 ? (
          <>
            <div className="activity-types">
              {activity.byType.map((t) => (
                <div className="activity-row" key={t.key}>
                  <span className="ar-name">
                    {t.icon} {t.label}
                  </span>
                  <span className="ar-bar">
                    <span
                      className="ar-fill"
                      style={{ width: `${Math.round((t.count / activity.totalPlays) * 100)}%` }}
                    />
                  </span>
                  <span className="ar-count">{t.count}회</span>
                  <span className="ar-last">{formatTimeAgo(t.lastPlayed, Date.now())}</span>
                </div>
              ))}
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
            <p className="card-sub">최근 14일 · 무슨 게임을 얼마나 자주 했는지</p>
          </>
        ) : (
          <p className="empty-msg sm">아직 플레이 기록이 없어요. 한 판 해볼까요?</p>
        )}
      </div>

      {/* Achievements */}
      <div className="card">
        <div className="card-head">
          <span>🏆 업적 ({unlockedCount}/{badges.length})</span>
        </div>
        <div className="badge-grid">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`badge ${b.unlocked ? 'on' : 'off'}`}
              title={b.desc}
            >
              <span className="badge-icon">{b.icon}</span>
              <span className="badge-label">{b.label}</span>
              <span className="badge-desc">{b.desc}</span>
            </div>
          ))}
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

      {/* Weak keys / jamo */}
      {units.length > 0 && (
        <div className="card weak-card">
          <div className="card-head">
            <span>약한 키 ({weakLang === 'ko' ? '자모' : '키'})</span>
          </div>
          <div className="weak-chips">
            {units.map((u) => (
              <span className="weak-chip" key={u.unit}>
                <b>{u.unit}</b>
                <i>{u.count}</i>
              </span>
            ))}
          </div>
          <button
            className="btn accent weak-drill-btn"
            onClick={() => {
              const text = buildWeaknessDrill(units, weakLang)
              if (!text) return
              startDrill({ text, language: weakLang, title: '약점 집중 연습', sourceTextId: 'weakness' })
            }}
          >
            약점 집중 연습
          </button>
        </div>
      )}

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
              if (settings.soundEnabled) sound.key()
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
                  if (settings.soundEnabled) sound.key()
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

      {/* Data backup */}
      <div className="card backup-card">
        <div className="card-head">
          <span>데이터 백업</span>
        </div>
        <p className="empty-msg sm">
          모든 프로필·기록·설정을 JSON 파일로 저장하거나 복원해요. 가져오기는 현재 데이터를 덮어씁니다.
        </p>
        <div className="add-profile">
          <button className="btn ghost" onClick={handleExport}>
            데이터 내보내기(.json)
          </button>
          <button className="btn ghost" onClick={() => fileInput.current?.click()}>
            데이터 가져오기
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImportFile(f)
              e.target.value = ''
            }}
          />
        </div>
        {backupMsg && (
          <p className={`empty-msg sm ${backupMsg.ok ? '' : 'danger'}`}>{backupMsg.text}</p>
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
