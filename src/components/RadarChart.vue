<script setup lang="ts">
import { computed } from 'vue'
import { AXES } from '../core/types'
import type { Axis } from '../core/types'
import { AXIS_LIBRARY } from '../core/report'

const props = defineProps<{ axes: Record<Axis, number> }>()

const CX = 140
const CY = 130
const R = 84
const LABEL_R = 106

function pointAt(index: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI) / 2
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)]
}

function polygonPoints(radius: number): string {
  return AXES.map((_, i) =>
    pointAt(i, radius)
      .map((n) => n.toFixed(1))
      .join(','),
  ).join(' ')
}

const rings = [0.25, 0.5, 0.75, 1].map((factor) => ({
  factor,
  points: polygonPoints(R * factor),
  isMid: factor === 0.5,
}))

const spokes = AXES.map((_, i) => {
  const [x, y] = pointAt(i, R)
  return { x, y }
})

const labels = AXES.map((code, i) => {
  const [x, y] = pointAt(i, LABEL_R)
  return { code, x, y, text: AXIS_LIBRARY[code].highPole }
})

const dataPoints = computed(() =>
  AXES.map((code, i) => {
    const score = Math.min(100, Math.max(0, props.axes[code]))
    const radius = Math.max(2, (score / 100) * R)
    const [x, y] = pointAt(i, radius)
    return { code, x, y }
  }),
)

const dataPolygon = computed(() =>
  dataPoints.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
)
</script>

<template>
  <svg viewBox="0 0 280 260" width="100%" role="img" aria-labelledby="radar-title radar-desc">
    <title id="radar-title">四维倾向雷达图</title>
    <desc id="radar-desc">四个轴分别表示 EI、SN、TF、JP，数值越靠外越偏向该轴的高位字母，虚线圈为中点 50。</desc>
    <g>
      <polygon
        v-for="ring in rings"
        :key="ring.factor"
        :points="ring.points"
        fill="none"
        :stroke="ring.isMid ? '#0f6e56' : '#d3d1c7'"
        :stroke-width="ring.isMid ? 1 : 0.7"
        :stroke-dasharray="ring.isMid ? '4 3' : undefined"
      />
      <line
        v-for="(spoke, i) in spokes"
        :key="i"
        :x1="CX"
        :y1="CY"
        :x2="spoke.x"
        :y2="spoke.y"
        stroke="#d3d1c7"
        stroke-width="0.7"
      />
      <polygon
        :points="dataPolygon"
        fill="rgba(29, 158, 117, 0.18)"
        stroke="#0f6e56"
        stroke-width="1.6"
      />
      <circle
        v-for="p in dataPoints"
        :key="p.code"
        :cx="p.x"
        :cy="p.y"
        r="3.2"
        fill="#0f6e56"
      />
      <text
        v-for="label in labels"
        :key="label.code"
        :x="label.x"
        :y="label.y"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="12"
        fill="#2c2c2a"
      >
        {{ label.text }}
      </text>
    </g>
  </svg>
</template>
