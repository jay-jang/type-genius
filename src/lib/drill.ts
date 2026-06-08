// Build a focused "repeat the mistakes" drill from the words a typist got wrong.

interface Token {
  start: number
  end: number
  text: string
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let idx = 0
  for (const part of text.split(/(\s+)/)) {
    if (part.length === 0) continue
    if (part.trim() !== '') tokens.push({ start: idx, end: idx + part.length, text: part })
    idx += part.length
  }
  return tokens
}

/**
 * Returns a practice string made of the words that contained typing errors,
 * each repeated a few times so the typist can hammer them into muscle memory.
 * Empty string means "nothing to drill" (clean run).
 */
export function buildDrill(text: string, errorPositions: number[], repeats = 3): string {
  if (!errorPositions.length) return ''
  const errs = new Set(errorPositions)
  const wrongWords: string[] = []
  const seen = new Set<string>()
  for (const tok of tokenize(text)) {
    let hit = false
    for (let p = tok.start; p < tok.end; p++) {
      if (errs.has(p)) {
        hit = true
        break
      }
    }
    if (hit && !seen.has(tok.text)) {
      seen.add(tok.text)
      wrongWords.push(tok.text)
    }
  }
  if (wrongWords.length === 0) return ''
  const capped = wrongWords.slice(0, 14)
  const out: string[] = []
  for (const w of capped) {
    for (let r = 0; r < repeats; r++) out.push(w)
  }
  return out.join(' ')
}

export function countDrillWords(text: string, errorPositions: number[]): number {
  if (!errorPositions.length) return 0
  const errs = new Set(errorPositions)
  const seen = new Set<string>()
  for (const tok of tokenize(text)) {
    for (let p = tok.start; p < tok.end; p++) {
      if (errs.has(p)) {
        seen.add(tok.text)
        break
      }
    }
  }
  return seen.size
}
