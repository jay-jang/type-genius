// ---------------------------------------------------------------------------
// Static word lists for the time / words test modes. Pure data + helpers.
// ---------------------------------------------------------------------------

import type { Language } from '../types'

export const KO_WORDS = [
  '사람', '하늘', '바다', '사랑', '시간', '오늘', '내일', '아침', '저녁', '바람',
  '나무', '구름', '햇살', '겨울', '여름', '봄날', '가을', '거리', '골목', '도시',
  '마음', '생각', '이야기', '추억', '행복', '슬픔', '기쁨', '미소', '눈물', '꿈속',
  '학교', '교실', '친구', '가족', '부모', '아이', '동생', '선생', '이웃', '동네',
  '음악', '노래', '그림', '영화', '책상', '연필', '공책', '가방', '신발', '모자',
  '커피', '우유', '사과', '포도', '딸기', '수박', '김치', '국수', '라면', '만두',
  '강아지', '고양이', '토끼', '거북이', '나비', '새벽', '한낮', '한밤', '계절', '날씨',
  '여행', '기차', '버스', '비행기', '자전거', '운전', '산책', '달리기', '수영', '운동',
  '약속', '편지', '전화', '메시지', '소식', '소리', '목소리', '향기', '온기', '느낌',
  '시작', '도전', '용기', '희망', '미래', '과거', '현재', '순간', '평화', '자유',
]

export const EN_WORDS = [
  'time', 'people', 'water', 'light', 'world', 'house', 'place', 'night', 'story', 'voice',
  'heart', 'happy', 'dream', 'music', 'color', 'river', 'ocean', 'cloud', 'field', 'green',
  'school', 'friend', 'family', 'mother', 'father', 'child', 'street', 'garden', 'window', 'table',
  'paper', 'pencil', 'letter', 'phone', 'message', 'morning', 'evening', 'winter', 'summer', 'spring',
  'coffee', 'apple', 'bread', 'flower', 'forest', 'mountain', 'valley', 'travel', 'train', 'bridge',
  'sound', 'silence', 'memory', 'future', 'present', 'moment', 'reason', 'wonder', 'simple', 'gentle',
  'bright', 'quiet', 'strong', 'little', 'great', 'small', 'early', 'after', 'before', 'always',
  'never', 'often', 'maybe', 'every', 'other', 'first', 'second', 'third', 'around', 'between',
  'because', 'though', 'while', 'until', 'about', 'above', 'below', 'under', 'over', 'through',
  'begin', 'change', 'choose', 'believe', 'follow', 'listen', 'remember', 'imagine', 'create', 'finish',
]

function wordsFor(language: Language): string[] {
  return language === 'ko' ? KO_WORDS : EN_WORDS
}

/** Build a space-joined string of `count` random words for the given language. */
export function randomWords(language: Language, count: number): string {
  const pool = wordsFor(language)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    out.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return out.join(' ')
}

/** Long stream for time mode — long enough that no one finishes it. */
export function randomWordStream(language: Language): string {
  return randomWords(language, 120)
}
