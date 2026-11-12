import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import rawBank from '../data/questions.zh-cn.json'
import { STORAGE_KEY } from '../core/progress'
import { parseQuestionBank } from '../core/types'
import { useQuiz } from './useQuiz'

const bank = parseQuestionBank(rawBank)
const total = bank.questions.length

function fakeLocalStorage() {
  const data = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key)
    }),
  }
}

let storage: ReturnType<typeof fakeLocalStorage>

beforeEach(() => {
  storage = fakeLocalStorage()
  vi.stubGlobal('localStorage', storage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useQuiz 答题流转', () => {
  it('初始为 intro，进度 0，默认开启自动跳题', () => {
    const quiz = useQuiz(bank)
    expect(quiz.total).toBe(120)
    expect(quiz.state.phase).toBe('intro')
    expect(quiz.answeredCount.value).toBe(0)
    expect(quiz.progress.value).toBe(0)
    expect(quiz.isAllAnswered.value).toBe(false)
    expect(quiz.state.autoAdvance).toBe(true)
  })

  it('选择答案后同步落盘，进度与计分结果同步更新', () => {
    const quiz = useQuiz(bank)
    quiz.start()
    quiz.select(4)
    expect(quiz.state.phase).toBe('quiz')
    expect(quiz.answeredCount.value).toBe(1)
    expect(quiz.progress.value).toBeCloseTo(100 / total, 8)
    expect(quiz.result.value.completeness.answered).toBe(1)
    expect(storage.setItem).toHaveBeenCalled()
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    expect(saved.answers[bank.questions[0].id]).toBe(4)
  })

  it('next / prev / goTo 的边界处理', () => {
    const quiz = useQuiz(bank)
    quiz.start()
    quiz.prev()
    expect(quiz.state.currentIndex).toBe(0)
    quiz.goTo(50)
    expect(quiz.state.currentIndex).toBe(50)
    quiz.goTo(9999)
    expect(quiz.state.currentIndex).toBe(total - 1)
    quiz.goTo(-10)
    expect(quiz.state.currentIndex).toBe(0)
    quiz.goTo(1.5)
    expect(quiz.state.currentIndex).toBe(0)
    quiz.next()
    expect(quiz.state.currentIndex).toBe(1)
    quiz.prev()
    expect(quiz.state.currentIndex).toBe(0)
  })

  it('最后一题点下一步进入 complete', () => {
    const quiz = useQuiz(bank)
    quiz.start()
    quiz.goTo(total - 1)
    quiz.next()
    expect(quiz.state.phase).toBe('complete')
  })

  it('刷新后恢复到原题、原答案与所在阶段', () => {
    const first = useQuiz(bank)
    first.start()
    first.select(4)
    first.next()
    first.select(2)
    first.next()
    first.select(5)
    first.next()
    expect(first.state.currentIndex).toBe(3)
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()

    const second = useQuiz(bank)
    expect(second.state.phase).toBe('quiz')
    expect(second.state.currentIndex).toBe(3)
    expect(second.answeredCount.value).toBe(3)
    expect(second.state.answers[bank.questions[0].id]).toBe(4)
    expect(second.state.answers[bank.questions[1].id]).toBe(2)
    expect(second.state.answers[bank.questions[2].id]).toBe(5)
    expect(second.currentQuestion.value?.id).toBe(bank.questions[3].id)
    expect(second.result.value.completeness.answered).toBe(3)
  })

  it('自动跳题偏好持久化，reset 清空作答但保留偏好', () => {
    const first = useQuiz(bank)
    first.toggleAutoAdvance()
    first.select(3)
    expect(first.state.autoAdvance).toBe(false)

    const second = useQuiz(bank)
    expect(second.state.autoAdvance).toBe(false)
    second.reset()
    expect(second.state.phase).toBe('intro')
    expect(second.answeredCount.value).toBe(0)
    expect(second.state.currentIndex).toBe(0)
    expect(second.state.autoAdvance).toBe(false)
  })

  it('存档损坏或版本不符时回退到干净的初始状态', () => {
    storage.setItem(STORAGE_KEY, '{not-json')
    expect(useQuiz(bank).state.phase).toBe('intro')

    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, answers: {}, currentIndex: 5 }))
    const quiz = useQuiz(bank)
    expect(quiz.state.phase).toBe('intro')
    expect(quiz.state.currentIndex).toBe(0)
    expect(quiz.answeredCount.value).toBe(0)
  })
})
