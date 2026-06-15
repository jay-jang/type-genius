import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

// Sign-up / login modal. On success it loads the account's server record into
// the local store; register seeds the account from the current guest data.
export function AuthModal({ onClose }: { onClose: () => void }) {
  const register = useAppStore((s) => s.register)
  const login = useAppStore((s) => s.login)

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy || !username.trim() || !password) return
    setBusy(true)
    setError(null)
    const res = mode === 'login' ? await login(username.trim(), password) : await register(username.trim(), password)
    setBusy(false)
    if (res.ok) onClose()
    else setError(res.error ?? '오류가 발생했어요.')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'on' : ''}`}
            onClick={() => { setMode('login'); setError(null) }}
          >
            로그인
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'on' : ''}`}
            onClick={() => { setMode('register'); setError(null) }}
          >
            가입
          </button>
        </div>
        <p className="modal-sub">
          {mode === 'login'
            ? '로그인하면 기기가 바뀌어도 기록이 이어져요.'
            : '가입하면 지금까지의 로컬 기록이 계정에 저장돼요.'}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <input
            className="auth-input"
            placeholder="아이디 (2~24자)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="비밀번호 (4자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {error && <p className="auth-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>취소</button>
            <button type="submit" className="btn primary" disabled={busy || !username.trim() || !password}>
              {busy ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
