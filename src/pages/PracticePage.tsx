import { useNav, type PracticeMeta } from '../app/nav'
import { getPassage, GENRE_LABELS, DIFFICULTY_LABELS } from '../data'
import { ConfigBar } from '../components/ConfigBar'
import { TypingArea, type GhostRacer } from '../components/TypingArea'
import { useAppStore } from '../store/useAppStore'
import { pickGhostPace, ghostTotalUnits, ghostUnit } from '../lib/ghost'
import { scoreUnit } from '../lib/stats'

export function PracticePage() {
  const { config, queue, index, drill, custom, wordRun, race, runId, reroll, finishPractice } = useNav()
  const sessions = useAppStore((s) => s.sessions)
  const currentId = useAppStore((s) => s.currentProfileId)

  let target: string
  let meta: PracticeMeta
  let title: string
  let subtitle: string | undefined
  let badge: string | undefined
  let timeLimitMs: number | undefined

  if (wordRun) {
    target = wordRun.text
    timeLimitMs = wordRun.kind === 'time' ? wordRun.limit * 1000 : undefined
    title = wordRun.kind === 'time' ? `${wordRun.limit}초 도전` : `${wordRun.limit}단어`
    subtitle = wordRun.kind === 'time' ? '제한 시간 동안 친 만큼 기록돼요' : '랜덤 단어 연습'
    badge = wordRun.kind === 'time' ? '시간' : '단어'
    meta = {
      mode: config.mode,
      language: wordRun.language,
      genre: wordRun.kind,
      textId: `${wordRun.kind}-${wordRun.limit}`,
      textTitle: title,
      text: wordRun.text,
      isDrill: false,
    }
  } else if (custom) {
    target = custom.text
    title = '내 글 연습'
    subtitle = '직접 붙여넣은 글 · 기록·랭킹에는 반영되지 않아요'
    badge = '내 글'
    meta = {
      mode: custom.language,
      language: custom.language,
      genre: 'custom',
      textId: 'custom',
      textTitle: '내 글 연습',
      text: custom.text,
      isDrill: false,
    }
  } else if (drill) {
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

  // 고스트 레이싱: only for ranked passage runs, paced by your best prior score.
  let ghost: GhostRacer | undefined
  if (race && !drill && !custom && !wordRun) {
    const pace = pickGhostPace(sessions, currentId, meta.mode)
    const unit = ghostUnit(meta.mode)
    ghost = {
      pace,
      unit,
      totalUnits: ghostTotalUnits(target, unit),
      paceLabel: `${Math.round(pace)} ${scoreUnit(meta.mode)}`,
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
        timeLimitMs={timeLimitMs}
        ghost={ghost}
        onFinish={(r) => finishPractice(r, meta)}
      />
    </div>
  )
}
