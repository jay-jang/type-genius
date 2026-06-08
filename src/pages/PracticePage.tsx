import { useNav, type PracticeMeta } from '../app/nav'
import { getPassage, GENRE_LABELS, DIFFICULTY_LABELS } from '../data'
import { ConfigBar } from '../components/ConfigBar'
import { TypingArea } from '../components/TypingArea'

export function PracticePage() {
  const { config, queue, index, drill, runId, reroll, finishPractice } = useNav()

  let target: string
  let meta: PracticeMeta
  let title: string
  let subtitle: string | undefined
  let badge: string | undefined

  if (drill) {
    target = drill.text
    title = drill.title
    subtitle = '틀린 단어 집중 연습'
    badge = '오답 연습'
    meta = {
      mode: config.mode,
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
        <div className="screen test-screen">
          <ConfigBar />
          <div className="center-screen">
            <p className="empty-msg">조건에 맞는 글이 없어요.</p>
            <button className="btn primary" onClick={reroll}>
              다른 글 가져오기
            </button>
          </div>
        </div>
      )
    }
    target = p.text
    title = p.title
    subtitle = `${p.author} · ${GENRE_LABELS[p.genre]} · ${DIFFICULTY_LABELS[p.difficulty]}`
    meta = {
      mode: config.mode,
      language: p.language,
      genre: p.genre,
      textId: p.id,
      textTitle: p.title,
      text: p.text,
      isDrill: false,
    }
  }

  return (
    <div className="screen test-screen">
      <ConfigBar />
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
