import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import { sound } from '../lib/sound'
import { IconKeyboard, IconHome, IconBook, IconCrown, IconUser, IconVolume } from './Icons'

export function TopBar() {
  const { screen, goHome, openLibrary, goRankings, goProfile } = useNav()
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
      <button className="logo" onClick={goHome} title="새 테스트">
        <IconKeyboard size={22} className="logo-mark" />
        <span className="logo-name">
          type<span className="logo-accent">genius</span>
        </span>
      </button>

      <nav className="topnav">
        <button className={`navbtn ${screen === 'practice' ? 'on' : ''}`} onClick={goHome} title="새 테스트" aria-label="새 테스트">
          <IconHome />
        </button>
        <button className={`navbtn ${screen === 'library' ? 'on' : ''}`} onClick={() => openLibrary()} title="글 고르기" aria-label="글 고르기">
          <IconBook />
        </button>
        <button className={`navbtn ${screen === 'rankings' ? 'on' : ''}`} onClick={goRankings} title="랭킹" aria-label="랭킹">
          <IconCrown />
        </button>
        <button className={`navbtn ${screen === 'profile' ? 'on' : ''}`} onClick={goProfile} title="통계 / 설정" aria-label="통계 / 설정">
          <IconUser />
        </button>
      </nav>

      <div className="topbar-right">
        <button
          className="navbtn"
          onClick={toggleSound}
          title={settings.soundEnabled ? '사운드 끄기' : '사운드 켜기'}
          aria-label={settings.soundEnabled ? '사운드 끄기' : '사운드 켜기'}
          aria-pressed={settings.soundEnabled}
        >
          <IconVolume on={settings.soundEnabled} />
        </button>
        <button className="profile-chip" onClick={goProfile} title="프로필">
          <span className="avatar sm" style={{ background: profile?.color ?? 'var(--main)' }}>
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="profile-name">{profile?.name ?? '게스트'}</span>
        </button>
      </div>
    </header>
  )
}
