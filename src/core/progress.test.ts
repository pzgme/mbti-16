import { describe, expect, it } from 'vitest'
import rawBank from '../data/questions.zh-cn.json'
import { parseQuestionBank } from './types'
import {
  PROGRESS_VERSION,
  STORAGE_KEY,
  createInitialState,
  loadState,
  parseState,
  saveState,
  serializeState,
} from './progress'
import type { ProgressStorage } from './progress'

const bank = parseQuestionBank(rawBank)
const validIds = new Set(bank.questions.map((q) => q.id))
const total = bank.questions.length
const knownId = bank.questions[0].id

function memoryStorage() {
  const data = new Map<string, string>()
  const storage: ProgressStorage & { data: Map<string, string> } = {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
  return storage
}

describe('进度存档纯函数', () => {
  it('初始状态符合默认值', () => {
    expect(createInitialState()).toEqual({
      version: PROGRESS_VERSION,
      answers: {},
      currentIndex: 0,
      phase: 'intro',
      autoAdvance: true,
    })
  })

  it('序列化与反序列化往返一致', () => {
    const state = {
      ...createInitialState(),
      answers: { [knownId]: 4 },
      currentIndex: 7,
      phase: 'quiz' as const,
      autoAdvance: false,
    }
    const restored = parseState(serializeState(state), validIds, total)
    expect(restored).toEqual(state)
  })

  it('空值、非法 JSON、非对象、数组一律丢弃', () => {
    expect(parseState(null, validIds, total)).toBeNull()
    expect(parseState('', validIds, total)).toBeNull()
    expect(parseState('{broken', validIds, total)).toBeNull()
    expect(parseState('"string"', validIds, total)).toBeNull()
    expect(parseState('[]', validIds, total)).toBeNull()
  })

  it('版本不符直接丢弃存档', () => {
    const raw = JSON.stringify({ ...createInitialState(), version: 99, answers: { [knownId]: 3 } })
    expect(parseState(raw, validIds, total)).toBeNull()
  })

  it('过滤未知题号、越界值与非法答案类型', () => {
    const raw = JSON.stringify({
      ...createInitialState(),
      answers: {
        [knownId]: 4,
        'not-in-bank': 3,
        [bank.questions[1].id]: 0,
        [bank.questions[2].id]: 6,
        [bank.questions[3].id]: 2.5,
        [bank.questions[4].id]: '3',
      },
    })
    const restored = parseState(raw, validIds, total)
    expect(restored?.answers).toEqual({ [knownId]: 4 })
  })

  it('currentIndex 越界与非整数时收敛到合法范围', () => {
    const make = (currentIndex: unknown) =>
      parseState(JSON.stringify({ ...createInitialState(), currentIndex }), validIds, total)
    expect(make(-10)?.currentIndex).toBe(0)
    expect(make(total + 999)?.currentIndex).toBe(total - 1)
    expect(make(2.7)?.currentIndex).toBe(0)
    expect(make('5')?.currentIndex).toBe(0)
    expect(make(5)?.currentIndex).toBe(5)
  })

  it('phase 与 autoAdvance 走白名单兜底', () => {
    const raw = JSON.stringify({ ...createInitialState(), phase: 'bogus', autoAdvance: 'yes' })
    const restored = parseState(raw, validIds, total)
    expect(restored?.phase).toBe('intro')
    expect(restored?.autoAdvance).toBe(true)
    expect(parseState(JSON.stringify({ ...createInitialState(), phase: 'complete' }), validIds, total)?.phase).toBe('complete')
  })

  it('answers 非对象时降级为空而不抛错', () => {
    const restored = parseState(
      JSON.stringify({ ...createInitialState(), answers: [1, 2, 3] }),
      validIds,
      total,
    )
    expect(restored?.answers).toEqual({})
  })

  it('loadState / saveState 通过注入的存储完成往返', () => {
    const storage = memoryStorage()
    expect(loadState(validIds, total, storage)).toBeNull()
    const state = { ...createInitialState(), answers: { [knownId]: 5 }, currentIndex: 3 }
    saveState(state, storage)
    expect(storage.data.get(STORAGE_KEY)).toBe(serializeState(state))
    expect(loadState(validIds, total, storage)).toEqual(state)
  })

  it('存储不可用时静默降级，不抛异常', () => {
    const broken: ProgressStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(loadState(validIds, total, broken)).toBeNull()
    expect(() => saveState(createInitialState(), broken)).not.toThrow()
    expect(loadState(validIds, total, null)).toBeNull()
    expect(() => saveState(createInitialState(), null)).not.toThrow()
  })
})
