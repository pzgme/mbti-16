import { describe, expect, it } from 'vitest'
import rawBank from '../data/questions.zh-cn.json'
import { AXES, DOMAINS, parseQuestionBank } from './types'
import type { Answer, QuestionBank } from './types'
import {
  NEUTRAL_POSITION,
  isValidAnswerValue,
  scoreAnswers,
  scoreValue,
  toPosition,
} from './scoring'

const bank: QuestionBank = parseQuestionBank(rawBank)

function uniform(value: number): Answer[] {
  return bank.questions.map((q) => ({ questionId: q.id, value }))
}

describe('题库数据', () => {
  it('120 题、五个 domain 各 24 题、id 唯一、题干非空', () => {
    expect(bank.questions).toHaveLength(120)
    expect(bank.meta.itemCount).toBe(120)
    expect(bank.choices).toHaveLength(5)
    expect(new Set(bank.questions.map((q) => q.id)).size).toBe(120)
    expect(bank.questions.every((q) => q.text.trim().length > 0)).toBe(true)
    for (const d of DOMAINS) {
      expect(bank.questions.filter((q) => q.domain === d)).toHaveLength(24)
    }
  })

  it('parseQuestionBank 拒绝残缺数据', () => {
    expect(() => parseQuestionBank(null)).toThrow(TypeError)
    expect(() => parseQuestionBank({ questions: [], choices: [] })).toThrow(TypeError)
    expect(() => parseQuestionBank({ questions: bank.questions, choices: [] })).toThrow(TypeError)
  })
})

describe('单题计分', () => {
  it('plus 直接计分，minus 反向计分，且两者互补为 6', () => {
    for (let v = 1; v <= 5; v += 1) {
      expect(scoreValue(v, 'plus')).toBe(v)
      expect(scoreValue(v, 'minus')).toBe(6 - v)
      expect(scoreValue(v, 'plus') + scoreValue(v, 'minus')).toBe(6)
    }
  })

  it('非法选项值抛 RangeError', () => {
    for (const v of [0, 6, 2.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => scoreValue(v, 'plus')).toThrow(RangeError)
      expect(isValidAnswerValue(v)).toBe(false)
    }
    expect(isValidAnswerValue(3)).toBe(true)
    expect(isValidAnswerValue('3')).toBe(false)
  })

  it('均值到位置分：1→0、3→50、5→100，并做越界收敛', () => {
    expect(toPosition(1)).toBe(0)
    expect(toPosition(3)).toBe(50)
    expect(toPosition(5)).toBe(100)
    expect(toPosition(0)).toBe(0)
    expect(toPosition(9)).toBe(100)
  })
})

describe('scoreAnswers', () => {
  it('全中性答案：五维位置分 50、四轴 50、平局稳定归类、结果可靠', () => {
    const r = scoreAnswers(uniform(3), bank)
    expect(r.completeness.answered).toBe(120)
    expect(r.completeness.missingIds).toHaveLength(0)
    expect(r.isReliable).toBe(true)
    for (const d of DOMAINS) {
      expect(r.domains[d].mean).toBe(3)
      expect(r.domains[d].position).toBe(NEUTRAL_POSITION)
      expect(r.domains[d].answered).toBe(24)
    }
    for (const a of AXES) expect(r.axes[a]).toBe(NEUTRAL_POSITION)
    expect(r.typeCode).toBe('ENTJ')
    expect(r.borderlineAxes).toEqual([...AXES])
    expect(r.emotionalStability).toBe(50)
  })

  it('全 5 与全 1 分的四轴分数互补为 100', () => {
    const hi = scoreAnswers(uniform(5), bank)
    const lo = scoreAnswers(uniform(1), bank)
    for (const a of AXES) {
      expect(hi.axes[a] + lo.axes[a]).toBeCloseTo(100, 8)
    }
    expect(hi.typeCode).toHaveLength(4)
    expect(hi.isReliable).toBe(true)
    expect(hi.emotionalStability).toBeCloseTo(100 - hi.domains.N.position, 8)
  })

  it('缺答不按中性补位，且标记为不可信', () => {
    const r = scoreAnswers(uniform(3).slice(0, 60), bank)
    expect(r.completeness.answered).toBe(60)
    expect(r.completeness.missingIds).toHaveLength(60)
    expect(r.isReliable).toBe(false)
    const answeredTotal = DOMAINS.reduce((sum, d) => sum + r.domains[d].answered, 0)
    expect(answeredTotal).toBe(60)
  })

  it('空答案不崩溃，返回中性结果与完整缺失清单', () => {
    const r = scoreAnswers([], bank)
    expect(r.completeness.answered).toBe(0)
    expect(r.completeness.missingIds).toHaveLength(120)
    expect(r.isReliable).toBe(false)
    expect(r.typeCode).toHaveLength(4)
    for (const d of DOMAINS) expect(r.domains[d].position).toBe(NEUTRAL_POSITION)
  })

  it('过滤非法值、越界值与未知题号', () => {
    const q = bank.questions
    const bad: Answer[] = [
      { questionId: q[0].id, value: 0 },
      { questionId: q[1].id, value: 6 },
      { questionId: q[2].id, value: 2.5 },
      { questionId: q[3].id, value: Number.NaN },
      { questionId: 'not-exist', value: 3 },
      { questionId: q[4].id, value: 4 },
    ]
    const r = scoreAnswers(bad, bank)
    expect(r.completeness.answered).toBe(1)
    expect(r.completeness.invalidIds).toHaveLength(5)
    expect(r.isReliable).toBe(false)
  })

  it('重复题号以最后一次作答为准', () => {
    const q = bank.questions[0]
    const first = scoreAnswers([{ questionId: q.id, value: 1 }], bank)
    const second = scoreAnswers(
      [
        { questionId: q.id, value: 1 },
        { questionId: q.id, value: 5 },
      ],
      bank,
    )
    expect(second.completeness.answered).toBe(1)
    expect(second.domains[q.domain].raw).toBeGreaterThan(first.domains[q.domain].raw)
  })

  it('输出与答案顺序无关，可重复调用得到相同结果', () => {
    const answers = uniform(4)
    const r1 = scoreAnswers(answers, bank)
    const r2 = scoreAnswers([...answers].reverse(), bank)
    expect(r2).toEqual(r1)
  })
})
