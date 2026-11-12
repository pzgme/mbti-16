<script setup lang="ts">
import rawBank from './data/questions.zh-cn.json'
import { parseQuestionBank } from './core/types'
import { useQuiz } from './composables/useQuiz'
import QuestionCard from './components/QuestionCard.vue'
import ResultPanel from './components/ResultPanel.vue'

const bank = parseQuestionBank(rawBank)
const {
  state,
  total,
  currentQuestion,
  answeredCount,
  hasSavedProgress,
  result,
  select,
  next,
  prev,
  start,
  toggleAutoAdvance,
  reset,
} = useQuiz(bank)
</script>

<template>
  <main>
    <section v-if="state.phase === 'intro'" class="panel intro">
      <p class="eyebrow">基于 IPIP 大五量表</p>
      <h1>16 型人格倾向测试</h1>
      <p class="lede">{{ bank.meta.prompt }}</p>
      <ul class="facts">
        <li>{{ total }} 道题 · 5 级选项 · 约 5–8 分钟</li>
        <li>答题进度自动保存，中途刷新可继续</li>
        <li>输出四维连续倾向，而非简单贴标签</li>
      </ul>
      <div class="cta">
        <button type="button" class="primary big" @click="start()">
          {{ hasSavedProgress ? `继续上次（已答 ${answeredCount} / ${total}）` : '开始测试' }}
        </button>
        <button v-if="hasSavedProgress" type="button" class="ghost" @click="reset()">清空重来</button>
      </div>
      <p class="disclaimer">
        {{ bank.meta.caveat }}；仅供自我探索，不用于招聘筛选或临床诊断。
      </p>
    </section>

    <div v-else-if="state.phase === 'quiz' && currentQuestion" class="quiz-wrap">
      <div class="toolbar">
        <span>16 型人格倾向测试</span>
        <button type="button" class="link" @click="reset()">重新开始</button>
      </div>
      <QuestionCard
        :question="currentQuestion"
        :choices="bank.choices"
        :value="state.answers[currentQuestion.id]"
        :index="state.currentIndex"
        :total="total"
        :answered-count="answeredCount"
        :prompt="bank.meta.prompt"
        :auto-advance="state.autoAdvance"
        :is-last="state.currentIndex === total - 1"
        @select="select"
        @prev="prev()"
        @next="next()"
        @toggle-auto-advance="toggleAutoAdvance()"
      />
    </div>

    <ResultPanel
      v-else
      :result="result"
      @restart="reset()"
      @back="state.phase = 'quiz'"
    />
  </main>
</template>

<style scoped>
main {
  max-width: 680px;
  margin: 0 auto;
  padding:
    40px
    calc(20px + env(safe-area-inset-right, 0px))
    calc(64px + env(safe-area-inset-bottom, 0px))
    calc(20px + env(safe-area-inset-left, 0px));
  font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  color: #2c2c2a;
  line-height: 1.7;
}
.panel {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 2px 16px rgba(15, 110, 86, 0.05);
}
.eyebrow { font-size: 12px; letter-spacing: 0.08em; color: #0f6e56; margin: 0 0 8px; }
h1 { font-size: 34px; font-weight: 500; margin: 0 0 16px; line-height: 1.3; }
.lede { font-size: 15px; color: #5f5e5a; margin: 0 0 24px; }
.facts { padding-left: 20px; margin: 0 0 32px; color: #444441; font-size: 14px; }
.facts li { margin-bottom: 6px; }
.cta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
button.primary, button.ghost {
  font: inherit;
  font-size: 14px;
  padding: 10px 22px;
  min-height: 44px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
}
button.primary { background: #0f6e56; color: #fff; }
button.primary:hover { background: #085041; }
button.big { font-size: 16px; padding: 12px 28px; }
button.ghost { background: #fff; border-color: rgba(0, 0, 0, 0.14); color: #2c2c2a; }
button.ghost:hover { border-color: #0f6e56; }
.disclaimer {
  margin: 32px 0 0;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: #5f5e5a;
}
.quiz-wrap { display: flex; flex-direction: column; gap: 12px; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #5f5e5a;
  padding: 0 4px;
}
.link {
  font: inherit;
  font-size: 13px;
  background: none;
  border: none;
  color: #0f6e56;
  cursor: pointer;
  padding: 4px 8px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.link:hover { text-decoration: underline; }
@media (max-width: 560px) {
  main { padding: 24px 12px 48px; }
  .panel { padding: 24px 20px; }
  h1 { font-size: 28px; }
}
</style>
