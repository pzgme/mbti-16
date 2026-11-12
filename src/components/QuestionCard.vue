<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Choice, Question } from '../core/types'

const props = defineProps<{
  question: Question
  choices: Choice[]
  value?: number
  index: number
  total: number
  answeredCount: number
  prompt: string
  autoAdvance: boolean
  isLast: boolean
}>()

const emit = defineEmits<{
  select: [value: number]
  prev: []
  next: []
  toggleAutoAdvance: []
}>()

const ADVANCE_DELAY = 220
let timer: ReturnType<typeof setTimeout> | null = null
const rootEl = ref<HTMLElement | null>(null)

const progressWidth = computed(() =>
  props.total === 0 ? 0 : (props.answeredCount / props.total) * 100,
)

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

function onSelect(value: number) {
  emit('select', value)
  clearTimer()
  if (props.autoAdvance && !props.isLast) {
    timer = setTimeout(() => {
      timer = null
      emit('next')
    }, ADVANCE_DELAY)
  }
}

function onPrev() {
  clearTimer()
  emit('prev')
}

function onNext() {
  clearTimer()
  emit('next')
}

/** 只在答题卡内生效，避免全局劫持方向键影响页面滚动与读屏浏览 */
function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.matches('input, textarea, select')) return

  const key = event.key
  if (key >= '1' && key <= '5') {
    event.preventDefault()
    onSelect(Number(key))
  } else if (key === 'ArrowLeft') {
    event.preventDefault()
    onPrev()
  } else if (key === 'ArrowRight') {
    event.preventDefault()
    onNext()
  }
}

onMounted(() => rootEl.value?.focus())
onUnmounted(() => clearTimer())
</script>

<template>
  <section ref="rootEl" class="quiz" tabindex="-1" @keydown="onKeydown">
    <header class="head">
      <div class="meta">
        <span aria-live="polite">第 {{ index + 1 }} / {{ total }} 题</span>
        <span>已答 {{ answeredCount }} 题</span>
      </div>
      <div
        class="track"
        role="progressbar"
        aria-label="答题进度"
        aria-valuemin="0"
        :aria-valuemax="total"
        :aria-valuenow="answeredCount"
      >
        <div class="fill" :style="{ width: progressWidth + '%' }" />
      </div>
    </header>

    <p class="prompt">{{ prompt }}</p>
    <h2 class="stem">{{ question.text }}</h2>

    <div class="choices" role="group" :aria-label="prompt">
      <button
        v-for="choice in choices"
        :key="choice.value"
        type="button"
        class="choice"
        :class="{ active: value === choice.value }"
        :aria-pressed="value === choice.value"
        :title="choice.label"
        @click="onSelect(choice.value)"
      >
        <span class="num">{{ choice.value }}</span>
        <span class="label">{{ choice.short ?? choice.label }}</span>
      </button>
    </div>

    <footer class="actions">
      <button type="button" class="ghost" :disabled="index === 0" @click="onPrev">上一题</button>
      <label class="auto">
        <input
          type="checkbox"
          :checked="autoAdvance"
          @change="emit('toggleAutoAdvance')"
        />
        选完自动跳题
      </label>
      <button type="button" class="primary" :disabled="value === undefined" @click="onNext">
        {{ isLast ? '查看结果' : '下一题' }}
      </button>
    </footer>
    <p class="hint">键盘：1–5 选择 · ← / → 切题（焦点在答题卡内）</p>
  </section>
</template>

<style scoped>
.quiz {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 28px 28px 20px;
  box-shadow: 0 2px 16px rgba(15, 110, 86, 0.05);
}
.quiz:focus { outline: none; }
.head { margin-bottom: 32px; }
.meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #5f5e5a;
  margin-bottom: 10px;
}
.track {
  height: 6px;
  border-radius: 999px;
  background: #eef0ee;
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 999px;
  background: #1d9e75;
  transition: width 160ms ease;
}
.prompt { font-size: 13px; color: #5f5e5a; margin: 0 0 10px; }
.stem {
  font-size: 30px;
  font-weight: 500;
  line-height: 1.4;
  margin: 0 0 32px;
  color: #2c2c2a;
  min-height: 42px;
}
.choices {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 4px;
  min-height: 64px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  background: #fff;
  color: #2c2c2a;
  cursor: pointer;
  font: inherit;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.choice:hover { border-color: #1d9e75; background: #f2faf7; }
.choice.active { border-color: #0f6e56; background: #e1f5ee; color: #085041; }
.num {
  font-size: 12px;
  color: #5f5e5a;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  width: 22px;
  height: 22px;
  line-height: 20px;
  text-align: center;
}
.choice.active .num { border-color: #0f6e56; color: #0f6e56; }
.label { font-size: 14px; white-space: nowrap; }
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 28px;
}
button.primary, button.ghost {
  font: inherit;
  font-size: 14px;
  padding: 9px 20px;
  min-height: 44px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
}
button.primary { background: #0f6e56; color: #fff; }
button.primary:hover:not(:disabled) { background: #085041; }
button.ghost { background: #fff; border-color: rgba(0, 0, 0, 0.14); color: #2c2c2a; }
button.ghost:hover:not(:disabled) { border-color: #0f6e56; }
button:disabled { opacity: 0.42; cursor: not-allowed; }
.auto {
  font-size: 13px;
  color: #5f5e5a;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  min-height: 44px;
  padding: 0 6px;
}
.auto input { accent-color: #0f6e56; width: 18px; height: 18px; }
.hint { text-align: center; font-size: 12px; color: #5f5e5a; margin: 16px 0 0; }
@media (max-width: 560px) {
  .quiz { padding: 20px 16px 16px; }
  .stem { font-size: 24px; margin-bottom: 24px; }
  .choices { gap: 4px; }
  .choice { padding: 12px 2px; }
  .label { font-size: 12px; }
  .actions { flex-wrap: wrap; }
}
</style>
