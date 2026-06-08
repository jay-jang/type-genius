// ---------------------------------------------------------------------------
// Hangul utilities.
//
// Korean typing speed is traditionally measured in 타수 (keystrokes per minute),
// NOT words per minute. A single syllable block like 값 is actually three or
// four key presses on a 두벌식 keyboard (ㄱ ㅏ ㅂ ㅅ). To report honest Korean
// metrics we decompose each syllable and count the real number of keystrokes.
// ---------------------------------------------------------------------------

const HANGUL_BASE = 0xac00
const HANGUL_END = 0xd7a3

// 두벌식 keyboard reality: compound vowels and compound final clusters require
// two key presses; double consonants (ㄲㄸㅃㅆㅉ) are one key (with shift).
// Index matches the Unicode medial (중성) ordering 0..20.
const MEDIAL_STROKES = [
  1, 1, 1, 1, 1, 1, 1, 1, // ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ
  1, 2, 2, 2, // ㅗ ㅘ(ㅗ+ㅏ) ㅙ(ㅗ+ㅐ) ㅚ(ㅗ+ㅣ)
  1, 1, 2, 2, 2, // ㅛ ㅜ ㅝ(ㅜ+ㅓ) ㅞ(ㅜ+ㅔ) ㅟ(ㅜ+ㅣ)
  1, 1, 2, 1, // ㅠ ㅡ ㅢ(ㅡ+ㅣ) ㅣ
]

// Index matches the Unicode final (종성) ordering 0..27, where 0 means "no final".
const FINAL_STROKES = [
  0, // (none)
  1, 1, 2, // ㄱ ㄲ ㄳ(ㄱ+ㅅ)
  1, 2, 2, // ㄴ ㄵ(ㄴ+ㅈ) ㄶ(ㄴ+ㅎ)
  1, 1, 2, 2, 2, 2, 2, 2, 2, // ㄷ ㄹ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ
  1, 1, 2, // ㅁ ㅂ ㅄ(ㅂ+ㅅ)
  1, 1, 1, 1, 1, 1, 1, 1, 1, // ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ
]

// Standalone compatibility jamo that are themselves compounds → two keystrokes.
const TWO_STROKE_JAMO = new Set([
  'ㄳ', 'ㄵ', 'ㄶ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅄ',
  'ㅘ', 'ㅙ', 'ㅚ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅢ',
])

export function isHangulSyllable(ch: string): boolean {
  const code = ch.codePointAt(0)
  return code !== undefined && code >= HANGUL_BASE && code <= HANGUL_END
}

export function isHangulChar(ch: string): boolean {
  const code = ch.codePointAt(0)
  if (code === undefined) return false
  return (
    (code >= HANGUL_BASE && code <= HANGUL_END) || // syllables
    (code >= 0x3130 && code <= 0x318f) // compatibility jamo
  )
}

/** Number of physical key presses to type a single character on a 두벌식 layout. */
export function strokesForChar(ch: string): number {
  const code = ch.codePointAt(0)
  if (code === undefined) return 0
  if (code >= HANGUL_BASE && code <= HANGUL_END) {
    const s = code - HANGUL_BASE
    const medial = Math.floor((s % 588) / 28)
    const final = s % 28
    return 1 + MEDIAL_STROKES[medial] + FINAL_STROKES[final] // lead is always 1 key
  }
  if (TWO_STROKE_JAMO.has(ch)) return 2
  return 1
}

/** Total keystrokes for a string (newlines/carriage-returns ignored). */
export function countStrokes(text: string): number {
  let total = 0
  for (const ch of text) {
    if (ch === '\n' || ch === '\r') continue
    total += strokesForChar(ch)
  }
  return total
}

/** Fraction of a string that is Hangul — used to auto-detect the dominant script. */
export function hangulRatio(text: string): number {
  let hangul = 0
  let total = 0
  for (const ch of text) {
    if (ch.trim() === '') continue
    total++
    if (isHangulChar(ch)) hangul++
  }
  return total === 0 ? 0 : hangul / total
}

const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const MEDIALS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const FINALS = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

const COMP_MAP: Record<string, string[]> = {
  'ㅘ': ['ㅗ', 'ㅏ'], 'ㅙ': ['ㅗ', 'ㅐ'], 'ㅚ': ['ㅗ', 'ㅣ'],
  'ㅝ': ['ㅜ', 'ㅓ'], 'ㅞ': ['ㅜ', 'ㅔ'], 'ㅟ': ['ㅜ', 'ㅣ'], 'ㅢ': ['ㅡ', 'ㅣ'],
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'],
  'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ']
}

export function decomposeToStrokes(char: string): string[] {
  const code = char.codePointAt(0)
  if (!code) return []
  
  if (code >= HANGUL_BASE && code <= HANGUL_END) {
    const s = code - HANGUL_BASE
    const initial = INITIALS[Math.floor(s / 588)]
    const medial = MEDIALS[Math.floor((s % 588) / 28)]
    const final = FINALS[s % 28]
    
    return [
      initial,
      ...(COMP_MAP[medial] || [medial]),
      ...(final ? (COMP_MAP[final] || [final]) : [])
    ]
  }
  
  if (code >= 0x3130 && code <= 0x318f) {
    return COMP_MAP[char] || [char]
  }
  
  return [char]
}

export function isCompositionCorrect(targetChar: string, composingChar: string): boolean {
  if (!targetChar || !composingChar) return false
  const targetStrokes = decomposeToStrokes(targetChar)
  const compStrokes = decomposeToStrokes(composingChar)
  
  if (compStrokes.length > targetStrokes.length) return false
  return compStrokes.every((stroke, idx) => stroke === targetStrokes[idx])
}

