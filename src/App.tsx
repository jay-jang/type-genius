import { useEffect } from 'react'
import { NavProvider, useNav } from './app/nav'
import { useAppStore } from './store/useAppStore'
import { sound } from './lib/sound'
import { isValidTheme, DEFAULT_THEME } from './data/themes'
import { TopBar } from './components/TopBar'
import { BottomBar } from './components/BottomBar'
import { PracticePage } from './pages/PracticePage'
import { LibraryPage } from './pages/LibraryPage'
import { ResultsPage } from './pages/ResultsPage'
import { RankingsPage } from './pages/RankingsPage'
import { ProfilePage } from './pages/ProfilePage'

function Screens() {
  const { screen } = useNav()
  switch (screen) {
    case 'library':
      return <LibraryPage />
    case 'results':
      return <ResultsPage />
    case 'rankings':
      return <RankingsPage />
    case 'profile':
      return <ProfilePage />
    case 'practice':
    default:
      return <PracticePage />
  }
}

function Shell() {
  const { screen, openLibrary, goHome } = useNav()
  const typingActive = useAppStore((s) => s.typingActive)

  // Esc: from the test → pick a text; from elsewhere → back to the test.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (screen === 'practice') openLibrary()
      else goHome()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, openLibrary, goHome])

  return (
    <div className={`app ${typingActive ? 'app--focus' : ''}`}>
      <TopBar />
      <main className="app-main">
        <Screens />
      </main>
      <BottomBar />
    </div>
  )
}

export default function App() {
  const settings = useAppStore((s) => s.settings)
  const ensureDefaultProfile = useAppStore((s) => s.ensureDefaultProfile)

  useEffect(() => {
    ensureDefaultProfile()
  }, [ensureDefaultProfile])

  // Apply the selected Monkeytype-style theme to the document.
  useEffect(() => {
    // Validate against the known palette so a stale/corrupt id falls back safely.
    const theme = isValidTheme(settings.theme) ? settings.theme : DEFAULT_THEME
    document.documentElement.dataset.theme = theme
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    if (bg) {
      let meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'theme-color')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', bg)
    }
  }, [settings.theme])

  // Keep the audio engine in sync with user settings.
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled)
    sound.setVolume(settings.volume)
    sound.setProfile(settings.keySoundProfile)
  }, [settings.soundEnabled, settings.volume, settings.keySoundProfile])

  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  )
}
