import type { Difficulty, Genre, Language, Passage } from '../types'
import { GENERATED_PASSAGES } from './texts/generated'
import { FALLBACK_PASSAGES } from './texts/fallback'

const seen = new Set<string>()
export const ALL_PASSAGES: Passage[] = [...GENERATED_PASSAGES, ...FALLBACK_PASSAGES].filter((p) => {
  if (!p || !p.text || seen.has(p.id)) return false
  seen.add(p.id)
  return true
})

export const GENRES: Genre[] = ['poem', 'novel', 'song', 'nonfiction']

export const GENRE_LABELS: Record<Genre, string> = {
  poem: '시',
  novel: '소설',
  song: '노래',
  nonfiction: '논픽션',
}

export const GENRE_ICONS: Record<Genre, string> = {
  poem: '🌸',
  novel: '📖',
  song: '🎵',
  nonfiction: '🧠',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
}

export interface PassageFilter {
  language?: Language
  genre?: Genre
  difficulty?: Difficulty
}

export function passagesFor(opts: PassageFilter = {}): Passage[] {
  return ALL_PASSAGES.filter(
    (p) =>
      (!opts.language || p.language === opts.language) &&
      (!opts.genre || p.genre === opts.genre) &&
      (!opts.difficulty || p.difficulty === opts.difficulty),
  )
}

export function getPassage(id: string): Passage | undefined {
  return ALL_PASSAGES.find((p) => p.id === id)
}

export function pickRandom(opts: PassageFilter & { excludeId?: string } = {}): Passage | undefined {
  const pool = passagesFor(opts).filter((p) => p.id !== opts.excludeId)
  const chosen = pool.length ? pool : passagesFor({ language: opts.language })
  if (!chosen.length) return ALL_PASSAGES[0]
  return chosen[Math.floor(Math.random() * chosen.length)]
}
