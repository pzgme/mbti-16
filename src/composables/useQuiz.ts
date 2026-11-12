import { computed, reactive, watch } from 'vue'
import { createInitialState, loadState, saveState } from '../core/progress'
import type { ProgressState } from '../core/progress'
import { scoreAnswers } from '../core/scoring'
import type { QuestionBank } from '../core/types'

export function useQuiz(bank: QuestionBank) {
  const total = bank.questions.length
  const validIds = new Set(bank.questions.map((q) => q.id))
  const state = reactive<ProgressState>(loadState(validIds, total) ?? createInitialState())

  // 同步落盘：用户随时刷新都不会丢最后一题的答案
  watch(state, () => saveState(state), { deep: true, flush: 'sync' })

  const currentQuestion = computed(() => bank.questions[state.currentIndex] ?? null)
  const answeredCount = computed(() => Object.keys(state.answers).length)
  const progress = computed(() => (total === 0 ? 0 : (answeredCount.value / total) * 100))
  const isAllAnswered = computed(() => answeredCount.value === total)
  const hasSavedProgress = computed(() => answeredCount.value > 0)
  const result = computed(() =>
    scoreAnswers(
      Object.entries(state.answers).map(([questionId, value]) => ({ questionId, value })),
      bank,
    ),
  )

  function select(value: number): void {
    const question = currentQuestion.value
    if (!question) return
    state.answers[question.id] = value
  }

  function next(): void {
    if (state.currentIndex < total - 1) state.currentIndex += 1
    else state.phase = 'complete'
  }

  function prev(): void {
    if (state.currentIndex > 0) state.currentIndex -= 1
  }

  function goTo(index: number): void {
    if (total === 0 || !Number.isInteger(index)) return
    state.currentIndex = Math.min(total - 1, Math.max(0, index))
  }

  function start(): void {
    state.phase = 'quiz'
  }

  function finish(): void {
    state.phase = 'complete'
  }

  function toggleAutoAdvance(): void {
    state.autoAdvance = !state.autoAdvance
  }

  /** 清空作答但保留用户的自动跳题偏好 */
  function reset(): void {
    state.answers = {}
    state.currentIndex = 0
    state.phase = 'intro'
  }

  return {
    state,
    total,
    currentQuestion,
    answeredCount,
    progress,
    isAllAnswered,
    hasSavedProgress,
    result,
    select,
    next,
    prev,
    goTo,
    start,
    finish,
    toggleAutoAdvance,
    reset,
  }
}
