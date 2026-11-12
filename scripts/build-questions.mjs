import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

const upstream = JSON.parse(
  readFileSync(resolve(root, 'src/data/_upstream.questions.json'), 'utf8'),
)
const upstreamChoices = require(resolve(root, 'src/data/_upstream.choices.cjs'))

const DOMAIN_LABELS = { O: '开放性', C: '尽责性', E: '外向性', A: '宜人性', N: '神经质' }
const DOMAIN_KEYS = Object.keys(DOMAIN_LABELS)
const SCALE = [1, 2, 3, 4, 5]

// 上游选项表为 plus/minus 各预置一张分数；校验它与本项目 6 - value 的反向规则完全等价
for (const value of SCALE) {
  const plus = upstreamChoices.plus[value - 1]
  const minus = upstreamChoices.minus[value - 1]
  if (plus?.score !== value || minus?.score !== 6 - value) {
    throw new Error(`上游选项计分表与预期不符：value=${value}`)
  }
}

if (!Array.isArray(upstream) || upstream.length !== 120) {
  throw new Error(`题目数量应为 120，实际为 ${upstream?.length}`)
}

const seenIds = new Set()
const domainCount = Object.fromEntries(DOMAIN_KEYS.map((d) => [d, 0]))
const questions = upstream.map((item, i) => {
  const { id, text, keyed, domain, facet } = item
  if (typeof id !== 'string' || !id || seenIds.has(id)) {
    throw new Error(`第 ${i + 1} 题 id 无效或重复：${id}`)
  }
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`第 ${i + 1} 题题干为空`)
  }
  if (!DOMAIN_KEYS.includes(domain)) {
    throw new Error(`第 ${i + 1} 题 domain 非法：${domain}`)
  }
  if (keyed !== 'plus' && keyed !== 'minus') {
    throw new Error(`第 ${i + 1} 题 keyed 非法：${keyed}`)
  }
  if (!Number.isInteger(facet) || facet < 1 || facet > 6) {
    throw new Error(`第 ${i + 1} 题 facet 非法：${facet}`)
  }
  seenIds.add(id)
  domainCount[domain] += 1
  return { id, index: i + 1, text: text.trim(), domain, facet, keyed }
})

for (const d of DOMAIN_KEYS) {
  if (domainCount[d] !== 24) {
    throw new Error(`domain ${d} 题数应为 24，实际为 ${domainCount[d]}`)
  }
}

const bank = {
  meta: {
    instrument: 'IPIP-NEO-120 (Johnson, 2014)',
    language: 'zh-CN',
    itemCount: questions.length,
    scale: { min: 1, max: 5 },
    domains: DOMAIN_LABELS,
    prompt: '以下描述在多大程度上符合平时的你？',
    itemLicense: 'Public domain — International Personality Item Pool (ipip.ori.org)',
    structureSource: 'https://github.com/Alheimsins/b5-johnson-120-ipip-neo-pi-r',
    structureLicense: 'MIT — see THIRD-PARTY-NOTICES.txt',
    scoringNote: 'keyed=minus 的题目按 6 - value 反向计分，等价于上游选项表的 minus 分数',
    caveat: '本文件为 IPIP 大五量表，非官方 MBTI 量表；四维结果仅为近似倾向映射',
  },
  choices: [
    { value: 1, label: '非常不符合', short: '很不符' },
    { value: 2, label: '不太符合', short: '不太符' },
    { value: 3, label: '一般', short: '一般' },
    { value: 4, label: '比较符合', short: '较符合' },
    { value: 5, label: '非常符合', short: '很符合' },
  ],
  questions,
}

const out = resolve(root, 'src/data/questions.zh-cn.json')
writeFileSync(out, `${JSON.stringify(bank, null, 2)}\n`, 'utf8')
console.log(`已生成 ${out}`)
console.log(`题目 ${questions.length} 道，domain 分布 ${JSON.stringify(domainCount)}`)
console.log('上游选项表反向计分校验通过（等价于 6 - value）')
