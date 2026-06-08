import { useEffect } from 'react'
import { NavProvider, useNav } from './app/nav'
import { useAppStore } from './store/useAppStore'
import { sound } from './lib/sound'
import { TopBar } from './components/TopBar'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { PracticePage } from './pages/PracticePage'
import { ResultsPage } from './pages/ResultsPage'
import { RankingsPage } from './pages/RankingsPage'
import { ProfilePage } from './pages/ProfilePage'

function Screens() {
  const { screen } = useNav()
  switch (screen) {
    case 'home':
      return <HomePage />
    case 'library':
      return <LibraryPage />
    case 'practice':
      return <PracticePage />
    case 'results':
      return <ResultsPage />
    case 'rankings':
      return <RankingsPage />
    case 'profile':
      return <ProfilePage />
    default:
      return <HomePage />
  }
}

export default function App() {
  const settings = useAppStore((s) => s.settings)
  const ensureDefaultProfile = useAppStore((s) => s.ensureDefaultProfile)

  useEffect(() => {
    ensureDefaultProfile()
  }, [ensureDefaultProfile])

  // Keep the audio engine in sync with user settings.
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled)
    sound.setVolume(settings.volume)
    sound.setProfile(settings.keySoundProfile)
  }, [settings.soundEnabled, settings.volume, settings.keySoundProfile])

  return (
    <NavProvider>
      <div className="app">
        <div className="app-bg" aria-hidden />
        <TopBar />
        <main className="app-main">
          <Screens />
        </main>
      </div>
    </NavProvider>
  )
}
