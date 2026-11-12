import { buildReport } from './report'
import type { ScoreResult } from './types'

export const RESULT_DISCLAIMER =
  '基于 IPIP 大五量表，四维为近似映射，不等价于官方 MBTI®。' +
  '分数为 0–100 位置分，不是人群百分位。仅供自我探索，不用于招聘筛选或临床诊断。'

/** 生成可复制/下载的纯文本摘要，不依赖 DOM，便于单测 */
export function buildResultText(result: ScoreResult): string {
  const report = buildReport(result)
  const lines: string[] = [
    '16 型人格倾向测试 · 结果摘要',
    `类型倾向：${report.typeCode}`,
    '',
  ]

  for (const insight of report.insights) {
    const letter = insight.position >= 50 ? insight.highLetter : insight.lowLetter
    lines.push(
      `${insight.label}（${insight.lowLetter}/${insight.highLetter}）：` +
        `${Math.round(insight.position)} · ${insight.strengthLabel} · 偏 ${letter}`,
    )
  }

  lines.push(
    `情绪稳定性：${Math.round(report.emotionalStability)}（大五第五维度，非 MBTI 维度）`,
    '',
    report.borderlineCodes.length > 0
      ? `边界维度：${report.borderlineCodes.join('、')}（接近中点，换时间重测可能得到不同字母）`
      : '边界维度：无（四个维度倾向都比较清楚）',
    '',
    '倾向速写：',
    report.summary,
  )

  if (report.reliabilityNote) {
    lines.push('', `注意：${report.reliabilityNote}`)
  }

  lines.push('', RESULT_DISCLAIMER)
  return lines.join('\n')
}

/** 优先用 Clipboard API，失败时回退到 execCommand */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续走降级路径
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

export function downloadResultText(text: string, filename = 'mbti16-result.txt'): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
