import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import { sound } from '../lib/sound'

export function TopBar() {
  const { screen, goHome, goRankings, goProfile } = useNav()
  const profiles = useAppStore((s) => s.profiles)
  const currentId = useAppStore((s) => s.currentProfileId)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const profile = profiles.find((p) => p.id === currentId)

  const toggleSound = () => {
    const next = !settings.soundEnabled
    updateSettings({ soundEnabled: next })
    if (next) {
      sound.setEnabled(true)
      sound.ui()
    }
  }

  return (
    <header className="topbar">
      <button className="brand" onClick={goHome} aria-label="홈으로">
        <span className="brand-mark">⌨</span>
        <span className="brand-name">
          Type<span className="brand-accent">Genius</span>
        </span>
      </button>

      <nav className="topnav">
        <button className={`navlink ${screen === 'home' ? 'is-active' : ''}`} onClick={goHome}>
          홈
        </button>
        <button className={`navlink ${screen === 'rankings' ? 'is-active' : ''}`} onClick={goRankings}>
          랭킹
        </button>
        <button className={`navlink ${screen === 'profile' ? 'is-active' : ''}`} onClick={goProfile}>
          통계
        </button>
      </nav>

      <div className="topbar-right">
        <button
          className="icon-btn"
          onClick={toggleSound}
          title={settings.soundEnabled ? '사운드 끄기' : '사운드 켜기'}
          aria-label="사운드 토글"
        >
          {settings.soundEnabled ? '🔊' : '🔇'}
        </button>
        <button className="profile-chip" onClick={goProfile} title="프로필 / 설정">
          <span className="avatar" style={{ background: profile?.color ?? '#7c5cff' }}>
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="profile-name">{profile?.name ?? '게스트'}</span>
        </button>
      </div>
    </header>
  )
}
