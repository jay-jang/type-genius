import { useId } from 'react'

interface Series {
  values: number[]
  color: string
  label?: string
  /** Force the y-axis max (e.g. 100 for accuracy). Otherwise auto-scaled. */
  max?: number
  min?: number
}

interface LineChartProps {
  series: Series[]
  height?: number
  unit?: string
  xLabel?: string
}

/** Minimal dependency-free SVG line chart with gradient area fill. */
export function LineChart({ series, height = 160, unit = '', xLabel }: LineChartProps) {
  const id = useId()
  const W = 600
  const H = height
  const padL = 36
  const padR = 12
  const padT = 14
  const padB = 22
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const primary = series[0]
  const hasData = primary && primary.values.length > 0
  const allVals = series.flatMap((s) => s.values)
  const dataMax = primary?.max ?? (allVals.length ? Math.max(...allVals) : 1)
  const dataMin = primary?.min ?? 0
  const range = dataMax - dataMin || 1
  const n = primary?.values.length ?? 0

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => padT + innerH - ((v - dataMin) / range) * innerH

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  const areaPath = (vals: number[]) =>
    `${linePath(vals)} L ${x(vals.length - 1).toFixed(1)} ${padT + innerH} L ${x(0).toFixed(1)} ${
      padT + innerH
    } Z`

  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <svg className="linechart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
      <defs>
        {series.map((s, si) => (
          <linearGradient key={si} id={`${id}-grad-${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {gridLines.map((g, i) => {
        const gy = padT + innerH - g * innerH
        const val = Math.round(dataMin + g * range)
        return (
          <g key={i}>
            <line x1={padL} y1={gy} x2={W - padR} y2={gy} className="chart-grid" />
            <text x={padL - 6} y={gy + 3} className="chart-tick" textAnchor="end">
              {val}
            </text>
          </g>
        )
      })}

      {hasData &&
        series.map((s, si) =>
          s.values.length ? (
            <g key={si}>
              {si === 0 && <path d={areaPath(s.values)} fill={`url(#${id}-grad-${si})`} />}
              <path d={linePath(s.values)} className="chart-line" style={{ stroke: s.color }} />
              <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r="3.5" fill={s.color} />
            </g>
          ) : null,
        )}

      {!hasData && (
        <text x={W / 2} y={H / 2} className="chart-empty" textAnchor="middle">
          데이터 없음
        </text>
      )}

      {xLabel && (
        <text x={W - padR} y={H - 4} className="chart-xlabel" textAnchor="end">
          {xLabel}
        </text>
      )}
      {unit && (
        <text x={padL - 6} y={padT - 3} className="chart-unit" textAnchor="end">
          {unit}
        </text>
      )}
    </svg>
  )
}
