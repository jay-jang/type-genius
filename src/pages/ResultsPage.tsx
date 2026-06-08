import { useNav } from '../app/nav'
import { useAppStore } from '../store/useAppStore'
import { LineChart } from '../components/LineChart'
import { buildDrill, countDrillWords } from '../lib/drill'
import { scoreUnit, MODE_LABELS } from '../lib/stats'
import { formatDuration } from '../lib/metrics'

export function ResultsPage() {
  const { lastResult, retry, next, startDrill, openLibrary, goRankings, goHome } = useNav()
  const sessions = useAppStore((s) => s.sessions)
  const currentId = useAppStore((s) => s.currentProfileId)

  if (!lastResult) {
    return (
      <div className="screen center-screen">
        <p className="empty-msg">표시할 결과가 없어요.</p>
        <button className="btn primary" onClick={goHome}>
          홈으로
        </button>
      </div>
    )
  }

  const { result, meta } = lastResult
  const score = meta.mode === 'ko' ? result.cpm : result.wpm
  const unit = scoreUnit(meta.mode)

  // Record detection (non-drill only).
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

  return (
    <div className="screen results">
      <div className="results-hero">
        {meta.isDrill && <span className="result-badge drill">오답 연습 완료</span>}
        {isRecord && <span className="result-badge record">🏆 최고 기록 갱신!</span>}
        {isFirst && <span className="result-badge first">✨ 첫 기록 등록!</span>}
        {perfect && !meta.isDrill && <span className="result-badge perfect">💎 완벽! 무결점</span>}

        <div className="result-score">
          <span className="result-score-num">{Math.round(score)}</span>
          <span className="result-score-unit">{unit}</span>
        </div>
        <div className="result-context">
          {meta.textTitle} · {MODE_LABELS[meta.mode]}
        </div>
      </div>

      <div className="result-stats">
        <ResultStat value={`${result.accuracy}%`} label="정확도" tone={result.accuracy >= 97 ? 'good' : result.accuracy >= 90 ? '' : 'warn'} />
        <ResultStat value={`${result.consistency}%`} label="일관성" />
        <ResultStat value={Math.round(result.rawWpm)} label="Raw WPM" />
        <ResultStat value={result.maxCombo} label="최고 콤보" />
        <ResultStat value={result.errorCount} label="오타" tone={result.errorCount > 0 ? 'warn' : 'good'} />
        <ResultStat value={formatDuration(result.durationMs)} label="시간" />
        <ResultStat value={`${result.charCount}자`} label="분량" />
        <ResultStat value={`${result.strokeCount}타`} label="총 타수" />
      </div>

      <div className="card chart-card">
        <div className="card-head">
          <span>속도 추이</span>
          <span className="legend">
            <i className="dot" style={{ background: '#7c5cff' }} /> WPM
            <i className="dot" style={{ background: '#5b6172' }} /> Raw
          </span>
        </div>
        <LineChart
          series={[
            { values: wpmSeries, color: '#7c5cff' },
            { values: rawSeries, color: '#5b6172' },
          ]}
          height={170}
          unit="WPM"
          xLabel="시간(초) →"
        />
      </div>

      {!perfect && (
        <div className="card drill-card">
          <div className="drill-info">
            <div className="drill-title">🎯 틀린 부분 반복 연습</div>
            <div className="drill-sub">
              {errorWords > 0
                ? `오타가 난 ${errorWords}개 단어를 모아 집중 연습할 수 있어요.`
                : '문장 부호/공백에서 오타가 있었어요.'}
            </div>
          </div>
          <button
            className="btn accent"
            disabled={!drillText}
            onClick={() =>
              startDrill({
                text: drillText,
                language: meta.language,
                title: `${meta.textTitle}`,
                sourceTextId: meta.textId,
              })
            }
          >
            오답 연습 시작
          </button>
        </div>
      )}

      <div className="results-actions">
        <button className="btn primary" onClick={retry}>
          ↻ 다시 도전
        </button>
        <button className="btn" onClick={next}>
          다음 글 →
        </button>
        <button className="btn ghost" onClick={() => openLibrary(meta.mode === 'mixed' ? 'mixed' : meta.language)}>
          도서관
        </button>
        <button className="btn ghost" onClick={goRankings}>
          랭킹
        </button>
      </div>
    </div>
  )
}

function ResultStat({ value, label, tone }: { value: string | number; label: string; tone?: string }) {
  return (
    <div className={`rstat ${tone ? `tone-${tone}` : ''}`}>
      <div className="rstat-value">{value}</div>
      <div className="rstat-label">{label}</div>
    </div>
  )
}
