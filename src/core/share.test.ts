import { describe, expect, it } from 'vitest'
import rawBank from '../data/questions.zh-cn.json'
import { parseQuestionBank } from './types'
import { scoreAnswers } from './scoring'
import { RESULT_DISCLAIMER, buildResultText } from './share'

const bank = parseQuestionBank(rawBank)
const answers = (value: number, count = bank.questions.length) =>
  bank.questions.slice(0, count).map((q) => ({ questionId: q.id, value }))

const fullResult = scoreAnswers(answers(4), bank)

describe('结果摘要文本', () => {
  it('包含类型码、四条维度、情绪稳定性、速写与免责声明', () => {
    const text = buildResultText(fullResult)
    expect(text).toContain(`类型倾向：${fullResult.typeCode}`)
    for (const label of ['精力方向', '信息获取', '判断方式', '生活节奏']) {
      expect(text).toContain(label)
    }
    expect(text).toContain('情绪稳定性')
    expect(text).toContain('倾向速写：')
    expect(text).toContain(RESULT_DISCLAIMER)
  })

  it('全中性结果标注四个边界维度', () => {
    const text = buildResultText(scoreAnswers(answers(3), bank))
    expect(text).toContain('边界维度：EI、SN、TF、JP')
  })

  it('无论是否有边界维度，都会给出边界说明', () => {
    expect(buildResultText(fullResult)).toContain('边界维度：')
  })

  it('缺答结果带注意事项', () => {
    const text = buildResultText(scoreAnswers(answers(3, 10), bank))
    expect(text).toContain('注意：已完成 10 / 120 题')
  })

  it('输出为多行纯文本，不含 HTML 标签', () => {
    const text = buildResultText(fullResult)
    expect(text.split('\n').length).toBeGreaterThan(10)
    expect(text).not.toMatch(/<[a-z]/i)
  })
})
