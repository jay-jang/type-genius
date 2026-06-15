import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, SessionResult, Settings } from '../types'

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

interface AppState {
  profiles: Profile[]
  currentProfileId: string | null
  sessions: SessionResult[]
  settings: Settings
  hydrated: boolean
  typingActive: boolean

  setTyping: (active: boolean) => void
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

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profiles: [],
      currentProfileId: null,
      sessions: [],
      settings: DEFAULT_SETTINGS,
      hydrated: false,
      typingActive: false,

      setTyping: (active) => set({ typingActive: active }),

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

        // Send to server in the background, catch errors silently for offline resilience
        const profile = get().profiles.find((p) => p.id === profileId)
        if (profile) {
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
          return { sessions: raw.slice(-1000) }
        })
        return session
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      clearProfileSessions: (id) =>
        set((s) => ({ sessions: s.sessions.filter((x) => x.profileId !== id) })),

      resetAll: () =>
        set({ profiles: [], currentProfileId: null, sessions: [], settings: DEFAULT_SETTINGS }),

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
        return true
      },
    }),
    {
      name: 'type-genius-v1',
      version: 1,
      partialize: (s) => ({
        profiles: s.profiles,
        currentProfileId: s.currentProfileId,
        sessions: s.sessions,
        settings: s.settings,
      }),
      // Deep-merge settings so newly added keys (e.g. theme) get their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        }
      },
      onRehydrateStorage: () => (state) => {
        state?.ensureDefaultProfile()
        useAppStore.setState({ hydrated: true })
      },
    },
  ),
)
