import type { Passage } from '../../types'
import data from './generated.json'

// Curated literary passages (poems / novels / songs / nonfiction) in Korean &
// English, generated once and committed as static data so the app needs no
// network at runtime.
export const GENERATED_PASSAGES = data as unknown as Passage[]
