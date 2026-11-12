export const DOMAINS = ['O', 'C', 'E', 'A', 'N'] as const
export type Domain = (typeof DOMAINS)[number]

export const AXES = ['EI', 'SN', 'TF', 'JP'] as const
export type Axis = (typeof AXES)[number]

export type Keyed = 'plus' | 'minus'

export interface Choice {
  value: number
  label: string
  /** 紧凑布局用的短标签；缺失时 UI 回退到 label */
  short?: string
}

export interface Question {
  id: string
  index: number
  text: string
  domain: Domain
  facet: number
  keyed: Keyed
}

export interface QuestionBankMeta {
  instrument: string
  language: string
  itemCount: number
  scale: { min: number; max: number }
  domains: Record<Domain, string>
  prompt: string
  itemLicense: string
  structureSource: string
  structureLicense: string
  scoringNote: string
  caveat: string
}

export interface QuestionBank {
  meta: QuestionBankMeta
  choices: Choice[]
  questions: Question[]
}

export interface Answer {
  questionId: string
  value: number
}

export interface DomainScore {
  raw: number
  mean: number
  /** 0–100 位置分，非百分位；缺少常模数据，不可当作人群百分位解读 */
  position: number
  answered: number
  total: number
}

export interface ScoreResult {
  domains: Record<Domain, DomainScore>
  /** 0–100，数值越高分别越偏 E / N / T / J */
  axes: Record<Axis, number>
  typeCode: string
  /** 接近中点的轴，UI 应提示「倾向不明显」而非强行归类 */
  borderlineAxes: Axis[]
  /** 大五第五维度，非 MBTI 维度：数值越高情绪越稳定 */
  emotionalStability: number
  completeness: {
    answered: number
    total: number
    missingIds: string[]
    invalidIds: string[]
  }
  isReliable: boolean
}

export function isDomain(value: unknown): value is Domain {
  return typeof value === 'string' && (DOMAINS as readonly string[]).includes(value)
}

export function isKeyed(value: unknown): value is Keyed {
  return value === 'plus' || value === 'minus'
}

/** JSON import 只推断出 string，这里做运行时校验并收窄为 QuestionBank */
export function parseQuestionBank(raw: unknown): QuestionBank {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('题库数据必须是对象')
  }
  const source = raw as Record<string, unknown>
  if (!Array.isArray(source.questions) || source.questions.length === 0) {
    throw new TypeError('题库 questions 必须是非空数组')
  }
  if (!Array.isArray(source.choices) || source.choices.length !== 5) {
    throw new TypeError('题库 choices 必须包含 5 个选项')
  }

  const seen = new Set<string>()
  const questions: Question[] = source.questions.map((item, i) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError(`第 ${i + 1} 题不是对象`)
    }
    const q = item as Record<string, unknown>
    if (typeof q.id !== 'string' || !q.id || seen.has(q.id)) {
      throw new TypeError(`第 ${i + 1} 题 id 无效或重复`)
    }
    if (typeof q.text !== 'string' || !q.text.trim()) {
      throw new TypeError(`第 ${i + 1} 题题干为空`)
    }
    if (!isDomain(q.domain) || !isKeyed(q.keyed)) {
      throw new TypeError(`第 ${i + 1} 题 domain/keyed 非法`)
    }
    seen.add(q.id)
    return {
      id: q.id,
      index: typeof q.index === 'number' ? q.index : i + 1,
      text: q.text,
      domain: q.domain,
      facet: typeof q.facet === 'number' ? q.facet : 0,
      keyed: q.keyed,
    }
  })

  return {
    meta: source.meta as QuestionBankMeta,
    choices: source.choices as Choice[],
    questions,
  }
}
