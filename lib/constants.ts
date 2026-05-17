// ── 1주차 토지 ──────────────────────────────────────
export const LAND1: Record<string, { wage: number; carbon: number; capacity: number }> = {
  '광산': { wage: 25, carbon: 15, capacity: 4 },
  '공장': { wage: 20, carbon: 10, capacity: 5 },
  '상점': { wage: 15, carbon:  6, capacity: 6 },
  '농장': { wage: 10, carbon:  3, capacity: 7 },
}

// ── 2주차 토지 ──────────────────────────────────────
export const LAND2: Record<string, { wage: number; credit: number; capacity: number }> = {
  '재활용 센터': { wage: 15, credit: 2, capacity: 4 },
  '공유 가게':   { wage: 12, credit: 3, capacity: 4 },
  '도시 텃밭':   { wage: 10, credit: 5, capacity: 4 },
  '국립공원':    { wage:  8, credit: 8, capacity: 5 },
}

// ── 생산활동 ────────────────────────────────────────
export const PROD1 = [
  { level: 1, name: '아침독서',    desc: '책 읽기 완료',               wage:  3, carbon: 1 },
  { level: 1, name: '과제 수행',   desc: '과제를 마감 시간 안에 제출',  wage:  3, carbon: 1 },
  { level: 1, name: '욕때스 실천', desc: '욕설·폭력·스마트폰 없음',    wage:  3, carbon: 1 },
  { level: 2, name: '글쓰기',      desc: '111프로젝트 실천',           wage:  6, carbon: 2 },
  { level: 2, name: '발표',        desc: '기후행동조사발표',            wage:  6, carbon: 2 },
  { level: 3, name: '상도장',      desc: '우수한 학습 태도·기여 활동',  wage: 12, carbon: 3 },
]

export const PROD2 = [
  { level: 1, name: '아침독서',    desc: '책 읽기 완료',               wage:  8, creditUsed:  3 },
  { level: 1, name: '과제 수행',   desc: '과제를 마감 시간 안에 제출',  wage:  8, creditUsed:  3 },
  { level: 1, name: '욕때스 실천', desc: '욕설·폭력·스마트폰 없음',    wage:  8, creditUsed:  3 },
  { level: 2, name: '글쓰기',      desc: '111프로젝트 실천',           wage: 15, creditUsed:  6 },
  { level: 2, name: '발표',        desc: '기후행동발표',               wage: 15, creditUsed:  6 },
  { level: 3, name: '상도장',      desc: '우수한 학습 태도·기여 활동',  wage: 28, creditUsed: 12 },
]

// ── 탄소중립 포인트 ─────────────────────────────────
export const CP_ACTIVITIES = [
  { level: 1, name: '개인물병 사용',    points: 1, wage:  5 },
  { level: 1, name: '책상/사물함 정리', points: 1, wage:  5 },
  { level: 1, name: '불끄기',           points: 1, wage:  5 },
  { level: 2, name: '분리수거',         points: 2, wage:  8 },
  { level: 2, name: '10분 샤워',        points: 2, wage:  8 },
  { level: 2, name: '급식 다 먹기',     points: 2, wage:  8 },
  { level: 2, name: '식물 가꾸기',      points: 2, wage:  8 },
  { level: 3, name: '환경 캠페인',      points: 3, wage: 10 },
  { level: 3, name: '마을 정화',        points: 3, wage: 10 },
]

// ── 탄소배출권 배정 ─────────────────────────────────
export const CREDIT_TABLE_4 = [
  { max:  50, credit: 280 },
  { max:  85, credit: 250 },
  { max: 120, credit: 220 },
  { max: 150, credit: 200 },
  { max: 160, credit: 170 },
]
export const CREDIT_TABLE_5 = [
  { max:  65, credit: 350 },
  { max: 105, credit: 320 },
  { max: 150, credit: 280 },
  { max: 190, credit: 250 },
  { max: 200, credit: 220 },
]

export function getAllocatedCredit(carbon: number, size: number): number {
  const table = size === 5 ? CREDIT_TABLE_5 : CREDIT_TABLE_4
  for (const row of table) { if (carbon <= row.max) return row.credit }
  return table[table.length - 1].credit
}

// ── 모둠별 인원 (고정) ──────────────────────────────
export const GROUP_SIZE: Record<string, number> = {
  A: 5,
  B: 4,
  C: 4,
  D: 4,
}

// ── TypeScript 타입 ─────────────────────────────────
export type DayData = {
  land: string | null
  productions: number[]
  carbonPoints: number[]
}
export type MemberRecord = {
  group: string
  name: string
  week1: { days: Record<number, DayData> }
  week2: { days: Record<number, DayData> }
}
