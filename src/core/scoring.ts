import { AXES, DOMAINS } from './types'
import type {
  Answer,
  Axis,
  Domain,
  DomainScore,
  Keyed,
  QuestionBank,
  ScoreResult,
} from './types'

export const SCORE_MIN = 1
export const SCORE_MAX = 5
export const NEUTRAL_POSITION = 50
export const BORDERLINE_BAND = 10
export const RELIABILITY_THRESHOLD = 0.8
export const MIN_ANSWERS_PER_DOMAIN = 12

export function isValidAnswerValue(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= SCORE_MIN &&
    value <= SCORE_MAX
  )
}

/** 单题计分：minus 题反向。等价于上游 choices.js 的 minus 分数表。 */
export function scoreValue(value: number, keyed: Keyed): number {
  if (!isValidAnswerValue(value)) {
    throw new RangeError(`选项值必须是 ${SCORE_MIN}–${SCORE_MAX} 的整数，收到 ${value}`)
  }
  return keyed === 'plus' ? value : SCORE_MIN + SCORE_MAX - value
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 1–5 的均值映射到 0–100 位置分。注意：不是人群百分位。 */
export function toPosition(mean: number): number {
  return clamp(((mean - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100, 0, 100)
}

function pickPole(position: number, highLetter: string, lowLetter: string): string {
  return position >= NEUTRAL_POSITION ? highLetter : lowLetter
}

/**
 * 计算四维连续分与 16 型标签。
 * - 只统计已作答题，缺答不按中性值补位（避免人为把结果拉向中点）
 * - 重复 questionId 以最后一次作答为准，保证输出确定
 * - 恰好 50 分取高位字母，同时记入 borderlineAxes 供 UI 提示
 */
export function scoreAnswers(answers: readonly Answer[], bank: QuestionBank): ScoreResult {
  const questions = bank.questions
  const questionById = new Map(questions.map((q) => [q.id, q]))

  const valid = new Map<string, number>()
  const invalidIds: string[] = []
  for (const answer of answers) {
    const id = answer?.questionId
    if (typeof id !== 'string' || !questionById.has(id) || !isValidAnswerValue(answer?.value)) {
      invalidIds.push(typeof id === 'string' ? id : '<invalid>')
      continue
    }
    valid.set(id, answer.value)
  }

  const expectedByDomain = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>
  for (const q of questions) {
    expectedByDomain[q.domain] += 1
  }

  const sums = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>
  const counts = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>
  for (const q of questions) {
    const value = valid.get(q.id)
    if (value === undefined) continue
    sums[q.domain] += scoreValue(value, q.keyed)
    counts[q.domain] += 1
  }

  const domains = {} as Record<Domain, DomainScore>
  for (const d of DOMAINS) {
    const answered = counts[d]
    const mean = answered > 0 ? sums[d] / answered : 3
    domains[d] = {
      raw: sums[d],
      mean,
      position: answered > 0 ? toPosition(mean) : NEUTRAL_POSITION,
      answered,
      total: expectedByDomain[d],
    }
  }

  // 大五 → MBTI 四维近似映射；TF 需反向（高宜人性偏 F）
  const axes: Record<Axis, number> = {
    EI: domains.E.position,
    SN: domains.O.position,
    TF: 100 - domains.A.position,
    JP: domains.C.position,
  }

  const typeCode = [
    pickPole(axes.EI, 'E', 'I'),
    pickPole(axes.SN, 'N', 'S'),
    pickPole(axes.TF, 'T', 'F'),
    pickPole(axes.JP, 'J', 'P'),
  ].join('')

  const answered = valid.size
  const isReliable =
    answered >= Math.ceil(questions.length * RELIABILITY_THRESHOLD) &&
    DOMAINS.every((d) => counts[d] >= MIN_ANSWERS_PER_DOMAIN)

  return {
    domains,
    axes,
    typeCode,
    borderlineAxes: AXES.filter((a) => Math.abs(axes[a] - NEUTRAL_POSITION) < BORDERLINE_BAND),
    emotionalStability: 100 - domains.N.position,
    completeness: {
      answered,
      total: questions.length,
      missingIds: questions.filter((q) => !valid.has(q.id)).map((q) => q.id),
      invalidIds,
    },
    isReliable,
  }
}
