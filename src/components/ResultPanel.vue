<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import type { ScoreResult } from '../core/types'
import { buildReport } from '../core/report'
import {
  RESULT_DISCLAIMER,
  buildResultText,
  copyToClipboard,
  downloadResultText,
} from '../core/share'
import RadarChart from './RadarChart.vue'
import DimensionBar from './DimensionBar.vue'

const props = defineProps<{ result: ScoreResult }>()
const emit = defineEmits<{
  restart: []
  back: []
}>()

const report = computed(() => buildReport(props.result))
const disclaimer = RESULT_DISCLAIMER
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string) {
  toast.value = message
  if (toastTimer !== null) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
    toastTimer = null
  }, 3000)
}

async function onCopy() {
  const ok = await copyToClipboard(buildResultText(props.result))
  showToast(ok ? '结果摘要已复制到剪贴板' : '复制失败，请改用「下载文本」')
}

function onDownload() {
  downloadResultText(buildResultText(props.result))
  showToast('结果文本文件已下载')
}

onUnmounted(() => {
  if (toastTimer !== null) clearTimeout(toastTimer)
})
</script>

<template>
  <section class="panel result">
    <p class="eyebrow">测试结果</p>
    <div class="type">{{ report.typeCode }}</div>
    <p class="lede">四维倾向 · 0–100 位置分，越靠外越偏向该字母</p>
    <p v-if="report.reliabilityNote" class="warn-box">{{ report.reliabilityNote }}</p>

    <div class="radar">
      <RadarChart :axes="result.axes" />
      <p class="chart-note">虚线圈为中点 50；越靠外，该维度的倾向越明显。</p>
    </div>

    <section class="block">
      <h2>倾向速写</h2>
      <p class="summary">{{ report.summary }}</p>
      <p class="caption">以上文字由四个维度的当前分数各自组合而成，不是固定的人格档案模板。</p>
    </section>

    <div v-if="report.borderlineCodes.length" class="boundary">
      <strong>关于边界维度</strong>
      <p>
        {{ report.borderlineCodes.join('、') }} 接近中点。这些维度上的字母只代表很弱的倾向，
        隔一段时间重测出现变化是正常的，不必据此给自己下结论。
      </p>
    </div>

    <section class="block">
      <h2>维度明细</h2>
      <div class="bars">
        <DimensionBar
          v-for="insight in report.insights"
          :key="insight.code"
          :label="`${insight.label} · ${insight.code} · ${insight.strengthLabel}`"
          :value="insight.position"
          :low-label="insight.lowPole"
          :high-label="insight.highPole"
          :borderline="insight.isBorderline"
        />
        <DimensionBar
          label="情绪稳定性（大五第五维度）"
          :value="report.emotionalStability"
          low-label="易波动"
          high-label="稳定"
        />
      </div>
      <p class="caption">
        {{ report.emotionNote }} 情绪稳定性来自大五第五维度，不属于 MBTI 四维，
        单独列出以免把这部分信息压缩掉。
      </p>
    </section>

    <div class="cta">
      <button type="button" class="ghost" @click="onCopy">复制结果摘要</button>
      <button type="button" class="ghost" @click="onDownload">下载文本</button>
      <button type="button" class="ghost" @click="emit('back')">返回修改答案</button>
      <button type="button" class="primary" @click="emit('restart')">重新测试</button>
    </div>
    <p v-if="toast" class="toast" role="status">{{ toast }}</p>

    <p class="disclaimer">{{ disclaimer }}</p>
  </section>
</template>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 2px 16px rgba(15, 110, 86, 0.05);
  font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  color: #2c2c2a;
  line-height: 1.7;
}
.eyebrow { font-size: 12px; letter-spacing: 0.08em; color: #0f6e56; margin: 0 0 8px; }
.type {
  font-size: 64px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #0f6e56;
  line-height: 1.1;
  margin-bottom: 8px;
}
.lede { font-size: 15px; color: #5f5e5a; margin: 0 0 24px; }
.warn-box {
  background: #faeeda;
  color: #633806;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  margin: 0 0 20px;
}
.radar { max-width: 320px; margin: 0 auto 24px; text-align: center; }
.chart-note { font-size: 12px; color: #5f5e5a; margin: 4px 0 0; }
.block { margin: 28px 0; }
h2 { font-size: 16px; font-weight: 500; margin: 0 0 10px; }
.summary { font-size: 15px; margin: 0; color: #2c2c2a; }
.caption { font-size: 12px; color: #5f5e5a; margin: 10px 0 0; }
.boundary {
  background: #e1f5ee;
  border-radius: 12px;
  padding: 14px 18px;
  font-size: 13px;
  color: #085041;
  margin: 24px 0;
}
.boundary strong { font-weight: 500; }
.boundary p { margin: 6px 0 0; }
.bars { margin: 20px 0 12px; }
.cta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 28px; }
button.primary, button.ghost {
  font: inherit;
  font-size: 14px;
  padding: 9px 18px;
  min-height: 44px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
}
button.primary { background: #0f6e56; color: #fff; }
button.primary:hover { background: #085041; }
button.ghost { background: #fff; border-color: rgba(0, 0, 0, 0.14); color: #2c2c2a; }
button.ghost:hover { border-color: #0f6e56; }
.toast { font-size: 13px; color: #0f6e56; margin: 12px 0 0; }
.disclaimer {
  margin: 32px 0 0;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: #5f5e5a;
}
@media (max-width: 560px) {
  .panel { padding: 24px 20px; }
  .type { font-size: 48px; }
}
</style>
