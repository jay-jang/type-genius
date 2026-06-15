import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language, Profile, SessionResult, Settings } from '../types'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const PROFILE_COLORS = [
  '#7c5cff', '#ff5c8a', '#22d3ee', '#34d399',
  '#fbbf24', '#f472b6', '#60a5fa', '#f97316',
]

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  volume: 0.6,
  effectsEnabled: true,
  keySoundProfile: 'thock',
  fontSize: 32,
  showLiveStats: true,
  theme: 'serika-dark',
  smoothCaret: true,
}

/** A signed-in account (token persists locally so login survives reloads). */
export interface AuthUser {
  id: string
  username: string
  createdAt: number
}
export interface Auth {
  token: string
  user: AuthUser
}
export interface AuthResult {
  ok: boolean
  error?: string
}

interface AppState {
  profiles: Profile[]
  currentProfileId: string | null
  sessions: SessionResult[]
  settings: Settings
  /** Best "산성비" arcade score, keyed by `${profileId}:${language}`. */
  arcadeBest: Record<string, number>
  /** Daily-practice streak, advanced on every recorded session. */
  streak: Streak
  /** Signed-in account, or null when playing as a local guest. */
  auth: Auth | null
  hydrated: boolean
  typingActive: boolean

  setTyping: (active: boolean) => void
  recordArcade: (language: Language, score: number) => number
  register: (username: string, password: string) => Promise<AuthResult>
  /** `merge` keeps this device's records and combines them with the account's. */
  login: (username: string, password: string, merge?: boolean) => Promise<AuthResult>
  logout: () => void
  syncUp: () => Promise<void>
  refreshFromServer: () => Promise<void>
  ensureDefaultProfile: () => void
  addProfile: (name: string) => Profile
  selectProfile: (id: string) => void
  renameProfile: (id: string, name: string) => void
  deleteProfile: (id: string) => void
  recordSession: (r: Omit<SessionResult, 'id' | 'profileId' | 'timestamp'>) => SessionResult | null
  updateSettings: (patch: Partial<Settings>) => void
  clearProfileSessions: (id: string) => void
  resetAll: () => void
  exportData: () => BackupFile
  importData: (payload: unknown) => boolean
}

/** Shape of the exported/imported backup file. */
export interface BackupFile {
  app: 'type-genius'
  version: 1
  exportedAt: number
  data: {
    profiles: Profile[]
    currentProfileId: string | null
    sessions: SessionResult[]
    settings: Settings
  }
}

/** Daily-practice streak. `lastDate` is a local 'YYYY-MM-DD' string. */
export interface Streak {
  lastDate: string
  days: number
  best: number
}

const EMPTY_STREAK: Streak = { lastDate: '', days: 0, best: 0 }

/** Local calendar date as 'YYYY-MM-DD' for a given timestamp (default: now). */
function localDateString(ts = Date.now()): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Advance a streak given that a session was recorded "now". Pure. */
function advanceStreak(prev: Streak): Streak {
  const today = localDateString()
  if (prev.lastDate === today) return prev
  const yesterday = localDateString(Date.now() - 86_400_000)
  const days = prev.lastDate === yesterday ? prev.days + 1 : 1
  return { lastDate: today, days, best: Math.max(prev.best, days) }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

/** The user-data slice we persist server-side for a signed-in account. */
interface SyncData {
  profiles: Profile[]
  sessions: SessionResult[]
  arcadeBest: Record<string, number>
  streak: Streak
}
function dataFrom(s: AppState): SyncData {
  return { profiles: s.profiles, sessions: s.sessions, arcadeBest: s.arcadeBest, streak: s.streak }
}

/** Union this device's records with an account's, so nothing is lost on login. */
function mergeData(local: SyncData, server: Partial<SyncData>): SyncData {
  // Sessions: dedupe by id (server first, local wins on collision), keep newest 1000.
  const byId = new Map<string, SessionResult>()
  for (const s of [...(server.sessions ?? []), ...local.sessions]) byId.set(s.id, s)
  const sessions = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-1000)
  // Profiles: union by id, local entry wins (keeps the local name/color).
  const profById = new Map<string, Profile>()
  for (const p of [...(server.profiles ?? []), ...local.profiles]) profById.set(p.id, p)
  // Arcade bests: per-key max.
  const arcadeBest: Record<string, number> = { ...(server.arcadeBest ?? {}) }
  for (const [k, v] of Object.entries(local.arcadeBest)) arcadeBest[k] = Math.max(arcadeBest[k] ?? 0, v)
  // Streak: best of both; the more recent lastDate drives current days.
  const ss = server.streak ?? EMPTY_STREAK
  const newer = local.streak.lastDate >= ss.lastDate ? local.streak : ss
  const streak: Streak = { best: Math.max(local.streak.best, ss.best), days: newer.days, lastDate: newer.lastDate }
  return { profiles: [...profById.values()], sessions, arcadeBest, streak }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      // Debounced background sync — coalesces bursts of record() calls.
      let syncTimer: ReturnType<typeof setTimeout> | null = null
      const scheduleSync = () => {
        if (!get().auth) return
        if (syncTimer) clearTimeout(syncTimer)
        syncTimer = setTimeout(() => {
          void get().syncUp()
        }, 1500)
      }
      // Load a server data blob into local state, keeping a valid current profile.
      const applyData = (data: unknown) => {
        const d = (isObject(data) ? data : {}) as Partial<SyncData>
        const profiles = Array.isArray(d.profiles) ? d.profiles : []
        const sessions = Array.isArray(d.sessions) ? d.sessions.slice(-1000) : []
        const arcadeBest = isObject(d.arcadeBest) ? (d.arcadeBest as Record<string, number>) : {}
        const streak = isObject(d.streak) ? (d.streak as Streak) : EMPTY_STREAK
        set({ profiles, sessions, arcadeBest, streak, currentProfileId: profiles[0]?.id ?? null })
        get().ensureDefaultProfile()
      }

      return {
      profiles: [],
      currentProfileId: null,
      sessions: [],
      settings: DEFAULT_SETTINGS,
      arcadeBest: {},
      streak: EMPTY_STREAK,
      auth: null,
      hydrated: false,
      typingActive: false,

      setTyping: (active) => set({ typingActive: active }),

      recordArcade: (language, score) => {
        const pid = get().currentProfileId
        if (!pid) return score
        const key = `${pid}:${language}`
        const best = Math.max(get().arcadeBest[key] ?? 0, score)
        set((s) => ({ arcadeBest: { ...s.arcadeBest, [key]: best } }))
        scheduleSync()
        return best
      },

      register: async (username, password) => {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, data: dataFrom(get()) }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) return { ok: false, error: json.error || '가입에 실패했어요.' }
          set({ auth: { token: json.token, user: json.user } })
          applyData(json.data)
          return { ok: true }
        } catch {
          return { ok: false, error: '서버에 연결할 수 없어요.' }
        }
      },

      login: async (username, password, merge = false) => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) return { ok: false, error: json.error || '로그인에 실패했어요.' }
          set({ auth: { token: json.token, user: json.user } })
          if (merge) {
            // Keep this device's records and combine them with the account's.
            const merged = mergeData(dataFrom(get()), (json.data ?? {}) as Partial<SyncData>)
            const cur = get().currentProfileId
            const currentProfileId =
              cur && merged.profiles.some((p) => p.id === cur) ? cur : (merged.profiles[0]?.id ?? null)
            set({ ...merged, currentProfileId })
            get().ensureDefaultProfile()
            void get().syncUp() // push the merged record back up
          } else {
            applyData(json.data) // replace local with the account's record
          }
          return { ok: true }
        } catch {
          return { ok: false, error: '서버에 연결할 수 없어요.' }
        }
      },

      logout: () => set({ auth: null }), // keep local data as a guest

      syncUp: async () => {
        const auth = get().auth
        if (!auth) return
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
            body: JSON.stringify({ data: dataFrom(get()) }),
          })
        } catch {
          /* offline — local stays source of truth, retried on next record */
        }
      },

      refreshFromServer: async () => {
        const auth = get().auth
        if (!auth) return
        try {
          const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${auth.token}` } })
          if (res.status === 401) {
            set({ auth: null }) // token expired/invalid → drop to guest
            return
          }
          if (!res.ok) return
          const json = await res.json()
          if (json?.data) applyData(json.data)
        } catch {
          /* offline — keep local */
        }
      },

      ensureDefaultProfile: () => {
        const { profiles } = get()
        if (profiles.length === 0) {
          const p: Profile = { id: uid(), name: '타이피스트', color: PROFILE_COLORS[0], createdAt: Date.now() }
          set({ profiles: [p], currentProfileId: p.id })
        } else if (!get().currentProfileId) {
          set({ currentProfileId: profiles[0].id })
        }
      },

      addProfile: (name) => {
        const profiles = get().profiles
        const p: Profile = {
          id: uid(),
          name: name.trim() || `타이피스트 ${profiles.length + 1}`,
          color: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length],
          createdAt: Date.now(),
        }
        set({ profiles: [...profiles, p], currentProfileId: p.id })
        return p
      },

      selectProfile: (id) => set({ currentProfileId: id }),

      renameProfile: (id, name) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
        })),

      deleteProfile: (id) =>
        set((s) => {
          const profiles = s.profiles.filter((p) => p.id !== id)
          const sessions = s.sessions.filter((x) => x.profileId !== id)
          const currentProfileId =
            s.currentProfileId === id ? (profiles[0]?.id ?? null) : s.currentProfileId
          return { profiles, sessions, currentProfileId }
        }),

      recordSession: (r) => {
        const profileId = get().currentProfileId
        if (!profileId) return null
        const session: SessionResult = { ...r, id: uid(), profileId, timestamp: Date.now() }

        // Guests upload single sessions to the shared leaderboard (offline-safe).
        // Signed-in accounts instead get a full-record sync (scheduled below), so
        // skip the legacy upload to avoid double-counting.
        const profile = get().profiles.find((p) => p.id === profileId)
        if (profile && !get().auth) {
          fetch('/api/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session, profile }),
          }).catch((err) => {
            console.warn('Failed to upload session to server (offline fallback active):', err)
          })
        }

        set((s) => {
          const raw = [...s.sessions, session]
          return { sessions: raw.slice(-1000), streak: advanceStreak(s.streak ?? EMPTY_STREAK) }
        })
        scheduleSync()
        return session
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      clearProfileSessions: (id) =>
        set((s) => ({ sessions: s.sessions.filter((x) => x.profileId !== id) })),

      resetAll: () =>
        set({ profiles: [], currentProfileId: null, sessions: [], settings: DEFAULT_SETTINGS, streak: EMPTY_STREAK }),

      exportData: () => {
        const s = get()
        return {
          app: 'type-genius',
          version: 1,
          exportedAt: Date.now(),
          data: {
            profiles: s.profiles,
            currentProfileId: s.currentProfileId,
            sessions: s.sessions,
            settings: s.settings,
          },
        }
      },

      importData: (payload) => {
        if (!isObject(payload) || payload.app !== 'type-genius' || payload.version !== 1) return false
        const data = payload.data
        if (!isObject(data) || !Array.isArray(data.profiles) || !Array.isArray(data.sessions)) return false
        const profiles = data.profiles as Profile[]
        const sessions = (data.sessions as SessionResult[]).slice(-1000)
        const settings = { ...DEFAULT_SETTINGS, ...(isObject(data.settings) ? data.settings : {}) } as Settings
        // Ensure currentProfileId points at an existing profile.
        const wanted = typeof data.currentProfileId === 'string' ? data.currentProfileId : null
        const currentProfileId =
          wanted && profiles.some((p) => p.id === wanted) ? wanted : (profiles[0]?.id ?? null)
        set({ profiles, currentProfileId, sessions, settings })
        scheduleSync()
        return true
      },
      }
    },
    {
      name: 'type-genius-v1',
      version: 1,
      partialize: (s) => ({
        profiles: s.profiles,
        currentProfileId: s.currentProfileId,
        sessions: s.sessions,
        settings: s.settings,
        arcadeBest: s.arcadeBest,
        streak: s.streak,
        auth: s.auth,
      }),
      // Deep-merge settings so newly added keys (e.g. theme) get their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
          // Old persisted state lacks `streak`; fall back to the empty default.
          streak: p.streak ?? current.streak,
        }
      },
      onRehydrateStorage: () => (state) => {
        state?.ensureDefaultProfile()
        useAppStore.setState({ hydrated: true })
        // If a token survived the reload, pull the account's latest record.
        if (state?.auth) void state.refreshFromServer()
      },
    },
  ),
)
