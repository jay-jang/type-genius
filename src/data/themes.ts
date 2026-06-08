// Monkeytype-style theme palettes. The full CSS variable sets live in
// global.css under [data-theme="<id>"]; this list drives the theme picker
// swatches and labels. `dark` flags light themes for the picker contrast.

export interface ThemeDef {
  id: string
  name: string
  bg: string
  main: string
  sub: string
  text: string
  dark: boolean
}

export const THEMES: ThemeDef[] = [
  { id: 'serika-dark', name: 'serika dark', bg: '#323437', main: '#e2b714', sub: '#646669', text: '#d1d0c5', dark: true },
  { id: 'carbon', name: 'carbon', bg: '#313131', main: '#f66e0d', sub: '#616161', text: '#f5f0e7', dark: true },
  { id: 'nord', name: 'nord', bg: '#242933', main: '#88c0d0', sub: '#4c566a', text: '#d8dee9', dark: true },
  { id: 'dracula', name: 'dracula', bg: '#282a36', main: '#bd93f9', sub: '#6272a4', text: '#f8f8f2', dark: true },
  { id: 'matrix', name: 'matrix', bg: '#000000', main: '#15ff00', sub: '#006d00', text: '#15ff00', dark: true },
  { id: 'aurora', name: 'aurora', bg: '#0a0b10', main: '#7c5cff', sub: '#5b6276', text: '#eceef6', dark: true },
  { id: 'rose-pine', name: 'rosé pine', bg: '#191724', main: '#ebbcba', sub: '#6e6a86', text: '#e0def4', dark: true },
  { id: 'serika-light', name: 'serika light', bg: '#e1e1e3', main: '#e2b714', sub: '#a3a3a8', text: '#323437', dark: false },
]

export const DEFAULT_THEME = 'serika-dark'

export function isValidTheme(id: string): boolean {
  return THEMES.some((t) => t.id === id)
}
