interface RaceTrackProps {
  /** Player progress 0..1. */
  you: number
  /** Ghost pace-setter progress 0..1. */
  ghost: number
  /** Ghost pace label, e.g. "320 타/분". */
  paceLabel: string
}

/** Two-lane TypeRacer-style track: you vs. a constant-pace 👻 pace-setter. */
export function RaceTrack({ you, ghost, paceLabel }: RaceTrackProps) {
  const youPct = Math.round(Math.min(1, Math.max(0, you)) * 100)
  const ghostPct = Math.round(Math.min(1, Math.max(0, ghost)) * 100)
  const lead = youPct - ghostPct
  const status =
    lead > 0 ? `앞서는 중 +${lead}%` : lead < 0 ? `뒤처짐 ${lead}%` : '나란히'

  return (
    <div className="race-track" aria-hidden>
      <div className="race-status">
        <span className="race-pace">👻 {paceLabel}</span>
        <span className={`race-gap ${lead >= 0 ? 'ahead' : 'behind'}`}>{status}</span>
      </div>
      <div className="race-lane">
        <div className="race-fill you" style={{ width: `${youPct}%` }} />
        <span className="race-marker you" style={{ left: `${youPct}%` }}>나</span>
      </div>
      <div className="race-lane">
        <div className="race-fill ghost" style={{ width: `${ghostPct}%` }} />
        <span className="race-marker ghost" style={{ left: `${ghostPct}%` }}>👻</span>
      </div>
    </div>
  )
}
