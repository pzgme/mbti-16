import { AXES } from './types'
import type { Axis, ScoreResult } from './types'

export type Band = 'strongLow' | 'leanLow' | 'balanced' | 'leanHigh' | 'strongHigh'

interface AxisMeta {
  label: string
  lowLetter: string
  highLetter: string
  lowPole: string
  highPole: string
  /** 每个档位一句原创行为描述；不写褒贬、不给职业建议、不做诊断 */
  phrases: Record<Band, string>
}

/**
 * 文案按「轴 × 分数档」组合，不按 16 个类型码查表。
 * 这样既贴合连续分数，也避免复现任何现有 16 型人格档案的固定描述。
 */
export const AXIS_LIBRARY: Record<Axis, AxisMeta> = {
  EI: {
    label: '精力方向',
    lowLetter: 'I',
    highLetter: 'E',
    lowPole: 'I 内向',
    highPole: 'E 外向',
    phrases: {
      strongLow: '你更常在独处时恢复状态，长时间社交后需要明显的安静时间。',
      leanLow: '多数时候你偏好小范围、熟悉的相处，不太主动扩大社交圈。',
      balanced: '独处与与人相处都能给你能量，具体取决于场合和当下状态。',
      leanHigh: '你通常愿意主动与人交流，在互动中比较容易进入状态。',
      strongHigh: '你更常从外部互动中获得能量，安静太久反而会觉得迟钝。',
    },
  },
  SN: {
    label: '信息获取',
    lowLetter: 'S',
    highLetter: 'N',
    lowPole: 'S 实感',
    highPole: 'N 直觉',
    phrases: {
      strongLow: '你更信任看得见、可核对的具体信息，对抽象推论保持谨慎。',
      leanLow: '你习惯先了解事实与细节，再考虑整体方向。',
      balanced: '具体细节与可能性你会交替关注，取决于问题本身。',
      leanHigh: '你常会先想到整体图景和可能走向，再回头补细节。',
      strongHigh: '你更容易被概念、联想和尚未发生的可能性吸引。',
    },
  },
  TF: {
    label: '判断方式',
    lowLetter: 'F',
    highLetter: 'T',
    lowPole: 'F 情感',
    highPole: 'T 思考',
    phrases: {
      strongLow: '做决定时，你更在意关系与感受是否被照顾到。',
      leanLow: '你会把他人的感受纳入判断，与逻辑依据一起权衡。',
      balanced: '逻辑一致性与人际感受在你的判断里权重接近。',
      leanHigh: '你倾向先用一致的标准和逻辑来检验一个决定。',
      strongHigh: '你更看重推理是否自洽，愿意为此暂时搁置人情因素。',
    },
  },
  JP: {
    label: '生活节奏',
    lowLetter: 'P',
    highLetter: 'J',
    lowPole: 'P 感知',
    highPole: 'J 判断',
    phrases: {
      strongLow: '你更愿意保留弹性，让安排随实际情况调整。',
      leanLow: '你偏好大致方向明确、细节留到当下再定。',
      balanced: '计划与临时调整你都能接受，视事情的重要程度而定。',
      leanHigh: '你通常先排出步骤和节点，再开始动手。',
      strongHigh: '你偏好明确的计划与收尾，悬而未决会让你不太舒服。',
    },
  },
}

export interface AxisInsight {
  code: Axis
  label: string
  lowLetter: string
  highLetter: string
  lowPole: string
  highPole: string
  position: number
  band: Band
  strengthLabel: string
  phrase: string
  isBorderline: boolean
}

export interface Report {
  typeCode: string
  /** 四句按当前分数动态拼成的倾向速写 */
  summary: string
  insights: AxisInsight[]
  borderlineCodes: Axis[]
  emotionalStability: number
  emotionNote: string
  reliabilityNote: string | null
  answered: number
  total: number
}

export function bandOf(position: number): Band {
  const p = Math.min(100, Math.max(0, position))
  if (p < 20) return 'strongLow'
  if (p < 40) return 'leanLow'
  if (p < 60) return 'balanced'
  if (p < 80) return 'leanHigh'
  return 'strongHigh'
}

export function strengthLabelOf(band: Band): string {
  switch (band) {
    case 'balanced':
      return '接近中间'
    case 'leanLow':
    case 'leanHigh':
      return '温和倾向'
    default:
      return '明显倾向'
  }
}

export function emotionNoteOf(value: number): string {
  if (value < 40) return '情绪起伏相对容易被外界事件带动。'
  if (value >= 60) return '多数情况下情绪状态比较平稳。'
  return '情绪状态随情境变化，整体处在中间范围。'
}

export function buildReport(result: ScoreResult): Report {
  const insights: AxisInsight[] = AXES.map((code) => {
    const meta = AXIS_LIBRARY[code]
    const position = result.axes[code]
    const band = bandOf(position)
    return {
      code,
      label: meta.label,
      lowLetter: meta.lowLetter,
      highLetter: meta.highLetter,
      lowPole: meta.lowPole,
      highPole: meta.highPole,
      position,
      band,
      strengthLabel: strengthLabelOf(band),
      phrase: meta.phrases[band],
      isBorderline: result.borderlineAxes.includes(code),
    }
  })

  return {
    typeCode: result.typeCode,
    summary: insights.map((i) => i.phrase).join(''),
    insights,
    borderlineCodes: [...result.borderlineAxes],
    emotionalStability: result.emotionalStability,
    emotionNote: emotionNoteOf(result.emotionalStability),
    reliabilityNote: result.isReliable
      ? null
      : `已完成 ${result.completeness.answered} / ${result.completeness.total} 题，部分题目未作答，以下解读仅供参考。`,
    answered: result.completeness.answered,
    total: result.completeness.total,
  }
}
