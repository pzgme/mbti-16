import { isValidAnswerValue } from './scoring'

export const PROGRESS_VERSION = 1
export const STORAGE_KEY = 'mbti16:progress:v1'

export type QuizPhase = 'intro' | 'quiz' | 'complete'

export interface ProgressState {
  version: number
  /** questionId -> 1..5 */
  answers: Record<string, number>
  currentIndex: number
  phase: QuizPhase
  autoAdvance: boolean
}

/** 只依赖这三个方法，便于在 Node 环境下用内存对象替换 localStorage */
export interface ProgressStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export function createInitialState(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    answers: {},
    currentIndex: 0,
    phase: 'intro',
    autoAdvance: true,
  }
}

export function serializeState(state: ProgressState): string {
  return JSON.stringify(state)
}

/**
 * 反序列化并清洗存档：
 * - 版本不符 / JSON 损坏 → 丢弃存档
 * - 丢弃不属于当前题库的题号与非法选项值
 * - 索引收敛到合法范围，phase 与 autoAdvance 走白名单兜底
 */
export function parseState(
  raw: string | null,
  validIds: ReadonlySet<string>,
  total: number,
): ProgressState | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

  const source = parsed as Record<string, unknown>
  if (source.version !== PROGRESS_VERSION) return null

  const answers: Record<string, number> = {}
  if (source.answers && typeof source.answers === 'object' && !Array.isArray(source.answers)) {
    for (const [id, value] of Object.entries(source.answers as Record<string, unknown>)) {
      if (validIds.has(id) && isValidAnswerValue(value)) {
        answers[id] = value
      }
    }
  }

  const maxIndex = Math.max(0, total - 1)
  const rawIndex =
    typeof source.currentIndex === 'number' && Number.isInteger(source.currentIndex)
      ? source.currentIndex
      : 0

  return {
    version: PROGRESS_VERSION,
    answers,
    currentIndex: Math.min(maxIndex, Math.max(0, rawIndex)),
    phase: source.phase === 'quiz' || source.phase === 'complete' ? source.phase : 'intro',
    autoAdvance: typeof source.autoAdvance === 'boolean' ? source.autoAdvance : true,
  }
}

function defaultStorage(): ProgressStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadState(
  validIds: ReadonlySet<string>,
  total: number,
  storage: ProgressStorage | null = defaultStorage(),
): ProgressState | null {
  if (!storage) return null
  try {
    return parseState(storage.getItem(STORAGE_KEY), validIds, total)
  } catch {
    return null
  }
}

/** 隐私模式 / 配额不足时静默降级，不阻断答题 */
export function saveState(
  state: ProgressState,
  storage: ProgressStorage | null = defaultStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, serializeState(state))
  } catch {
    // 忽略写入失败
  }
}
