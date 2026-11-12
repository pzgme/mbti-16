import { describe, expect, it } from 'vitest'
import rawBank from '../data/questions.zh-cn.json'
import { AXES, parseQuestionBank } from './types'
import type { Answer } from './types'
import { scoreAnswers } from './scoring'
import {
  AXIS_LIBRARY,
  bandOf,
  buildReport,
  emotionNoteOf,
  strengthLabelOf,
} from './report'

const bank = parseQuestionBank(rawBank)
const uniform = (value: number): Answer[] =>
  bank.questions.map((q) => ({ questionId: q.id, value }))
const neutralResult = scoreAnswers(uniform(3), bank)
const highResult = scoreAnswers(uniform(5), bank)
const lowResult = scoreAnswers(uniform(1), bank)
const partialResult = scoreAnswers(uniform(3).slice(0, 40), bank)

describe('分数分档', () => {
  it('bandOf 覆盖 0–100 全部边界', () => {
    expect(bandOf(-5)).toBe('strongLow')
    expect(bandOf(0)).toBe('strongLow')
    expect(bandOf(19)).toBe('strongLow')
    expect(bandOf(20)).toBe('leanLow')
    expect(bandOf(39)).toBe('leanLow')
    expect(bandOf(40)).toBe('balanced')
    expect(bandOf(59)).toBe('balanced')
    expect(bandOf(60)).toBe('leanHigh')
    expect(bandOf(79)).toBe('leanHigh')
    expect(bandOf(80)).toBe('strongHigh')
    expect(bandOf(120)).toBe('strongHigh')
  })

  it('强度标签与档位对应', () => {
    expect(strengthLabelOf('balanced')).toBe('接近中间')
    expect(strengthLabelOf('leanLow')).toBe('温和倾向')
    expect(strengthLabelOf('leanHigh')).toBe('温和倾向')
    expect(strengthLabelOf('strongLow')).toBe('明显倾向')
    expect(strengthLabelOf('strongHigh')).toBe('明显倾向')
  })

  it('情绪稳定性三档给出不同描述', () => {
    const notes = [10, 50, 90].map(emotionNoteOf)
    expect(new Set(notes).size).toBe(3)
    expect(notes.every((n) => n.length > 5)).toBe(true)
  })
})

describe('原创文案库', () => {
  it('4 轴 × 5 档 = 20 句，全部非空且互不重复', () => {
    const phrases = Object.values(AXIS_LIBRARY).flatMap((meta) => Object.values(meta.phrases))
    expect(phrases).toHaveLength(20)
    expect(new Set(phrases).size).toBe(20)
    expect(phrases.every((p) => p.length > 10)).toBe(true)
  })

  it('文案不含职业建议、诊断或褒贬标签', () => {
    const phrases = Object.values(AXIS_LIBRARY).flatMap((meta) => Object.values(meta.phrases))
    for (const word of ['适合从事', '职业建议', '诊断', '天才', '天生', '最佳']) {
      expect(phrases.some((p) => p.includes(word))).toBe(false)
    }
  })
})

describe('buildReport', () => {
  it('全中性结果：四轴接近中间、全部标为边界维度、速写由四句拼成', () => {
    const report = buildReport(neutralResult)
    expect(report.typeCode).toBe('ENTJ')
    expect(report.insights).toHaveLength(4)
    expect(report.insights.every((i) => i.band === 'balanced')).toBe(true)
    expect(report.borderlineCodes).toEqual([...AXES])
    expect(report.reliabilityNote).toBeNull()
    expect(report.summary).toBe(report.insights.map((i) => i.phrase).join(''))
  })

  it('不同分数产生不同文案，确认是按分数组合而非按类型查表', () => {
    const high = buildReport(highResult)
    const low = buildReport(lowResult)
    expect(high.summary).not.toBe(low.summary)
    expect(high.insights.map((i) => i.band)).not.toEqual(low.insights.map((i) => i.band))
    expect(high.typeCode).toHaveLength(4)
    expect(low.typeCode).toHaveLength(4)
  })

  it('isBorderline 与 borderlineCodes 完全一致', () => {
    const report = buildReport(partialResult)
    for (const insight of report.insights) {
      expect(insight.isBorderline).toBe(report.borderlineCodes.includes(insight.code))
    }
  })

  it('缺答时给出带题数的可靠性提示', () => {
    const report = buildReport(partialResult)
    expect(report.reliabilityNote).toContain('40 / 120')
    expect(report.answered).toBe(40)
    expect(report.total).toBe(120)
  })
})
