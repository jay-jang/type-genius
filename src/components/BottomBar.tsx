import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import { THEMES } from '../data/themes'

export function BottomBar() {
  const { goProfile } = useNav()
  const settings = useAppStore((s) => s.settings)
  const themeName = THEMES.find((t) => t.id === settings.theme)?.name ?? settings.theme

  return (
    <footer className="bottombar">
      <div className="bb-left">
        <span className="bb-item">
          <kbd>tab</kbd> 다시 시작
        </span>
        <span className="bb-item">
          <kbd>esc</kbd>로 나가기
        </span>
      </div>
      <div className="bb-right">
        <button className="bb-item bb-btn" onClick={goProfile} title="테마 변경">
          <span className="bb-dot" style={{ background: 'var(--main)' }} /> {themeName}
        </button>
      </div>
    </footer>
  )
}
