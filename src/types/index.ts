// ---------------------------------------------------------------------------
// Core domain types shared across the whole app.
// ---------------------------------------------------------------------------

export type Language = 'ko' | 'en'
export type Genre = 'poem' | 'novel' | 'song' | 'nonfiction'
export type Difficulty = 'easy' | 'medium' | 'hard'

/** A practice "space". Korean and English are separated; `mixed` interleaves both. */
export type PracticeMode = 'ko' | 'en' | 'mixed'

export interface Passage {
  id: string
  language: Language
  genre: Genre
  title: string
  author: string
  difficulty: Difficulty
  text: string
}

export interface Profile {
  id: string
  name: string
  color: string
  createdAt: number
}

/** One completed run, stored forever for stats + rankings. */
export interface SessionResult {
  id: string
  profileId: string
  mode: PracticeMode
  language: Language
  genre: Genre | 'drill' | 'custom' | 'time' | 'words'
  textId: string
  textTitle: string
  /** English-style words/min (chars/5). */
  wpm: number
  /** Korean-style keystrokes/min (타수, jamo-aware). For English this is chars/min. */
  cpm: number
  /** WPM counting every keystroke including errors. */
  rawWpm: number
  /** CPM counting every keystroke including errors. */
  rawCpm?: number
  accuracy: number // 0..100
  consistency: number // 0..100
  durationMs: number
  charCount: number
  strokeCount: number
  errorCount: number
  maxCombo: number
  isDrill: boolean
  /** Target characters at the positions the typist mistyped (whitespace excluded). Optional: old sessions lack it. */
  errorChars?: string[]
  timestamp: number
}

export interface Settings {
  soundEnabled: boolean
  volume: number // 0..1
  effectsEnabled: boolean
  keySoundProfile: KeySoundProfile
  fontSize: number // px
  showLiveStats: boolean
  theme: string // theme id, see data/themes.ts
  smoothCaret: boolean
}

export type KeySoundProfile = 'thock' | 'click' | 'soft'

/** Live numbers surfaced by the typing engine while a run is in progress. */
export interface LiveStats {
  wpm: number
  rawWpm: number
  cpm: number
  rawCpm: number
  accuracy: number
  errors: number
  progress: number // 0..1
  combo: number
  maxCombo: number
  elapsedMs: number
}

export interface WpmSample {
  t: number // seconds since start
  wpm: number
  raw: number
  cpm?: number
  rawCpm?: number
}

/** Per-target-character render status used by the typing surface. */
export type CharStatus = 'untyped' | 'correct' | 'incorrect' | 'composing' | 'composing-incorrect'

