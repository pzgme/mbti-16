<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: number
  lowLabel: string
  highLabel: string
  borderline?: boolean
}>()

const width = computed(() => `${Math.min(100, Math.max(0, props.value))}%`)
const rounded = computed(() => Math.round(Math.min(100, Math.max(0, props.value))))
</script>

<template>
  <div class="bar">
    <div class="head">
      <span class="label">{{ label }}</span>
      <span class="score">{{ rounded }}</span>
    </div>
    <div class="track">
      <div class="mid" />
      <div class="fill" :style="{ width }" />
    </div>
    <div class="poles">
      <span>{{ lowLabel }}</span>
      <span v-if="borderline" class="warn">倾向不明显</span>
      <span>{{ highLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.bar { margin-bottom: 20px; }
.head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.label { font-size: 14px; color: #2c2c2a; }
.score { font-size: 18px; font-weight: 500; color: #0f6e56; }
.track {
  position: relative;
  height: 10px;
  border-radius: 999px;
  background: #eef0ee;
  overflow: hidden;
}
.mid {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.16);
  z-index: 1;
}
.fill { height: 100%; border-radius: 999px; background: #1d9e75; }
.poles {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #5f5e5a;
  margin-top: 6px;
}
.warn { color: #854f0b; }
</style>
