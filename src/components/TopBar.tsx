import { useState } from 'react'
import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import { sound } from '../lib/sound'
import { AuthModal } from './AuthModal'
import { IconKeyboard, IconHome, IconBook, IconCrown, IconUser, IconVolume, IconTarget, IconChart } from './Icons'

export function TopBar() {
  const { screen, goHome, openLibrary, goRankings, goProfile, goArcade, goActivity } = useNav()
  const profiles = useAppStore((s) => s.profiles)
  const currentId = useAppStore((s) => s.currentProfileId)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const auth = useAppStore((s) => s.auth)
  const logout = useAppStore((s) => s.logout)
  const profile = profiles.find((p) => p.id === currentId)
  const [authOpen, setAuthOpen] = useState(false)

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
      <button className="logo" onClick={goHome} title="홈">
        <IconKeyboard size={22} className="logo-mark" />
        <span className="logo-name">
          type<span className="logo-accent">genius</span>
        </span>
      </button>

      <nav className="topnav">
        <button className={`navbtn ${screen === 'home' ? 'on' : ''}`} onClick={goHome} title="홈" aria-label="홈">
          <IconHome /><span className="navbtn-label">홈</span>
        </button>
        <button className={`navbtn ${screen === 'library' ? 'on' : ''}`} onClick={() => openLibrary()} title="글 고르기" aria-label="글 고르기">
          <IconBook /><span className="navbtn-label">글</span>
        </button>
        <button className={`navbtn ${screen === 'arcade' ? 'on' : ''}`} onClick={goArcade} title="산성비 게임" aria-label="산성비 게임">
          <IconTarget /><span className="navbtn-label">게임</span>
        </button>
        <button className={`navbtn ${screen === 'activity' ? 'on' : ''}`} onClick={goActivity} title="활동 기록" aria-label="활동 기록">
          <IconChart /><span className="navbtn-label">활동</span>
        </button>
        <button className={`navbtn ${screen === 'rankings' ? 'on' : ''}`} onClick={goRankings} title="랭킹" aria-label="랭킹">
          <IconCrown /><span className="navbtn-label">랭킹</span>
        </button>
        <button className={`navbtn ${screen === 'profile' ? 'on' : ''}`} onClick={goProfile} title="통계 / 설정" aria-label="통계 / 설정">
          <IconUser /><span className="navbtn-label">통계</span>
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
        {auth ? (
          <button
            className="link-btn account-chip"
            onClick={() => { if (confirm('로그아웃할까요? 기록은 계정에 저장돼 있어요.')) logout() }}
            title="로그아웃"
          >
            @{auth.user.username} · 로그아웃
          </button>
        ) : (
          <button className="btn sm" onClick={() => setAuthOpen(true)} title="로그인 / 가입">
            로그인
          </button>
        )}
        <button className="profile-chip" onClick={goProfile} title="프로필">
          <span className="avatar sm" style={{ background: profile?.color ?? 'var(--main)' }}>
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="profile-name">{profile?.name ?? '게스트'}</span>
        </button>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </header>
  )
}
