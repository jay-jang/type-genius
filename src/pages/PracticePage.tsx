import { useNav, type PracticeMeta } from '../app/nav'
import { getPassage, GENRE_LABELS, DIFFICULTY_LABELS } from '../data'
import { MODE_LABELS } from '../lib/stats'
import { TypingArea } from '../components/TypingArea'

export function PracticePage() {
  const { space, queue, index, drill, runId, next, finishPractice, goHome } = useNav()

  let target: string
  let meta: PracticeMeta
  let title: string
  let subtitle: string
  let badge: string

  if (drill) {
    target = drill.text
    title = drill.title
    subtitle = '틀린 단어를 반복해 손에 익히세요'
    badge = '오답 연습'
    meta = {
      mode: space,
      language: drill.language,
      genre: 'drill',
      textId: drill.sourceTextId,
      textTitle: drill.title,
      text: drill.text,
      isDrill: true,
    }
  } else {
    const p = getPassage(queue[index])
    if (!p) {
      return (
        <div className="screen center-screen">
          <p className="empty-msg">연습할 글을 찾을 수 없어요.</p>
          <button className="btn primary" onClick={goHome}>
            홈으로
          </button>
        </div>
      )
    }
    target = p.text
    title = p.title
    subtitle = `${p.author} · ${GENRE_LABELS[p.genre]} · ${DIFFICULTY_LABELS[p.difficulty]}`
    badge = `${MODE_LABELS[space]} 모드`
    meta = {
      mode: space,
      language: p.language,
      genre: p.genre,
      textId: p.id,
      textTitle: p.title,
      text: p.text,
      isDrill: false,
    }
  }

  const showQueue = !drill && queue.length > 1

  return (
    <div className="screen practice-screen">
      <div className="practice-toolbar">
        <button className="btn ghost" onClick={goHome}>
          ← 나가기
        </button>
        <div className="toolbar-info">
          {showQueue && (
            <span className="queue-count">
              {index + 1} / {queue.length}
            </span>
          )}
          <span className="mode-pill">{MODE_LABELS[space]}</span>
        </div>
        <button className="btn ghost" onClick={next}>
          다음 글 →
        </button>
      </div>

      <TypingArea
        key={runId}
        target={target}
        language={meta.language}
        title={title}
        subtitle={subtitle}
        badge={badge}
        onFinish={(r) => finishPractice(r, meta)}
      />
    </div>
  )
}
