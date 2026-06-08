import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import { LineChart } from '../components/LineChart'
import { buildDrill, countDrillWords } from '../lib/drill'
import { scoreUnit, MODE_LABELS } from '../lib/stats'
import { formatDuration } from '../lib/metrics'
import { GENRE_LABELS } from '../data'
import { IconRedo, IconForward, IconTarget } from '../components/Icons'

export function ResultsPage() {
  const { lastResult, retry, next, startDrill, goHome } = useNav()
  const sessions = useAppStore((s) => s.sessions)
  const currentId = useAppStore((s) => s.currentProfileId)

  if (!lastResult) {
    return (
      <div className="screen center-screen">
        <p className="empty-msg">표시할 결과가 없어요.</p>
        <button className="btn primary" onClick={goHome}>
          테스트 시작
        </button>
      </div>
    )
  }

  const { result, meta } = lastResult
  const score = meta.mode === 'ko' ? result.cpm : result.wpm
  const unit = scoreUnit(meta.mode)

  const peers = sessions
    .filter((s) => s.profileId === currentId && s.mode === meta.mode && !s.isDrill)
    .sort((a, b) => a.timestamp - b.timestamp)
  const priorScores = peers.slice(0, -1).map((s) => (s.mode === 'ko' ? s.cpm : s.wpm))
  const priorBest = priorScores.length ? Math.max(...priorScores) : -1
  const isFirst = !meta.isDrill && priorScores.length === 0
  const isRecord = !meta.isDrill && priorScores.length > 0 && score > priorBest

  const errorWords = countDrillWords(meta.text, result.errorPositions)
  const drillText = buildDrill(meta.text, result.errorPositions)
  const perfect = result.errorPositions.length === 0

  const wpmSeries = result.samples.map((s) => s.wpm)
  const rawSeries = result.samples.map((s) => s.raw)

  const typeLabel =
    meta.genre === 'drill' ? `${MODE_LABELS[meta.mode]} · 오답` : `${MODE_LABELS[meta.mode]} · ${GENRE_LABELS[meta.genre]}`

  return (
    <div className="screen results">
      <div className="res-badges">
        {meta.isDrill && <span className="result-badge drill">오답 연습 완료</span>}
        {isRecord && <span className="result-badge record">신기록</span>}
        {isFirst && <span className="result-badge first">첫 기록</span>}
        {perfect && !meta.isDrill && <span className="result-badge perfect">무결점</span>}
      </div>

      <div className="res-top">
        <div className="res-headline">
          <div className="res-big">
            <div className="res-big-num">{Math.round(score)}</div>
            <div className="res-big-label">{unit}</div>
          </div>
          <div className="res-big sub">
            <div className="res-big-num">{Math.round(result.accuracy)}%</div>
            <div className="res-big-label">정확도</div>
          </div>
        </div>
        <div className="res-graph">
          <LineChart
            series={[
              { values: wpmSeries, color: 'var(--main)' },
              { values: rawSeries, color: 'var(--sub)' },
            ]}
            height={180}
            unit="wpm"
            xLabel="시간(초)"
          />
        </div>
      </div>

      <div className="res-substats">
        <Sub label="유형" value={typeLabel} />
        <Sub label="raw" value={Math.round(result.rawWpm)} />
        <Sub label="일관성" value={`${result.consistency}%`} />
        <Sub label="오타" value={result.errorCount} />
        <Sub label="최고 콤보" value={result.maxCombo} />
        <Sub label="분량" value={`${result.charCount}자`} />
        <Sub label="총 타수" value={`${result.strokeCount}타`} />
        <Sub label="시간" value={formatDuration(result.durationMs)} />
      </div>

      {!perfect && (
        <div className="drill-card">
          <div className="drill-info">
            <div className="drill-title">틀린 부분 반복 연습</div>
            <div className="drill-sub">
              {errorWords > 0 ? `오타가 난 ${errorWords}개 단어를 모아 집중 연습합니다.` : '문장 부호/공백 오타가 있었어요.'}
            </div>
          </div>
          <button
            className="btn accent"
            disabled={!drillText}
            onClick={() =>
              startDrill({ text: drillText, language: meta.language, title: meta.textTitle, sourceTextId: meta.textId })
            }
          >
            <IconTarget size={16} /> 오답 연습
          </button>
        </div>
      )}

      <div className="results-actions">
        <button className="btn primary" onClick={next} title="다음 글">
          <IconForward size={16} /> 다음 글
        </button>
        <button className="btn" onClick={retry} title="다시">
          <IconRedo size={16} /> 다시
        </button>
      </div>
    </div>
  )
}

function Sub({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="res-sub">
      <div className="res-sub-label">{label}</div>
      <div className="res-sub-value">{value}</div>
    </div>
  )
}
