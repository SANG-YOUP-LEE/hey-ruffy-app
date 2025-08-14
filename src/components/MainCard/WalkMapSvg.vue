<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="`0 0 ${vbW} ${vbH}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <image
      v-if="mapSrc"
      :href="mapSrc"
      x="0"
      y="0"
      :width="vbW"
      :height="vbH"
      :style="{ opacity: mapOpacity }"
    />
    <path ref="pathRef" :d="pathD" fill="none" stroke="transparent" />

    <g>
      <circle
        v-for="(p, i) in visiblePts"
        :key="i"
        :cx="p.x"
        :cy="p.y"
        :r="pointR"
        :fill="pointFill"
        :stroke="pointStroke"
        :stroke-width="pointStrokeWidth"
        opacity="0.6"
      />
    </g>

    <g v-if="activePt" class="active-dot">
      <circle
        :cx="activePt.x"
        :cy="activePt.y"
        :r="pointR * 1.6"
        :fill="pointFill"
        :stroke="pointStroke"
        :stroke-width="pointStrokeWidth"
        filter="url(#glow)"
      />
    </g>
  </svg>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  mapSrc: { type: String, default: '' },
  mapOpacity: { type: Number, default: 0.1 },
  vbW: { type: Number, default: 1000 },
  vbH: { type: Number, default: 1000 },
  pathD: { type: String, required: true },
  pointR: { type: Number, default: 9 },
  pointFill: { type: String, default: '#1e90ff' },
  pointStroke: { type: String, default: '#ffffff' },
  pointStrokeWidth: { type: Number, default: 3 },
  goalCount: { type: Number, default: 20 },
  basePoints: { type: Number, default: 20 },
  doneCount: { type: Number, default: 0 }
})

const pathRef = ref(null)
const basePts = ref([])

function sampleBasePoints() {
  const el = pathRef.value
  if (!el) return
  const L = el.getTotalLength()
  const arr = []
  const B = Math.max(2, props.basePoints)
  for (let i = 0; i < B; i++) {
    const t = i / (B - 1)
    const p = el.getPointAtLength(L * t)
    arr.push({ x: p.x, y: p.y })
  }
  basePts.value = arr
}

const visiblePts = computed(() => {
  const B = basePts.value.length
  const N = Math.min(Math.max(1, props.goalCount || 1), B || 1)
  if (B === 0) return []
  if (N === B) return basePts.value
  if (N === 1) return [basePts.value[0]]
  const out = []
  for (let i = 0; i < N; i++) {
    const idx = Math.round((i * (B - 1)) / (N - 1))
    out.push(basePts.value[idx])
  }
  return out
})

const activePt = computed(() => {
  if ((props.doneCount || 0) <= 0) return { x: 0, y: props.vbH }
  const N = visiblePts.value.length
  const idx = Math.min(props.doneCount, N) - 1
  return visiblePts.value[idx] || null
})

onMounted(sampleBasePoints)
watch(() => props.pathD, sampleBasePoints)
watch(() => props.basePoints, sampleBasePoints)
</script>

<style scoped>
svg { width: 100%; height: 100%; display: block; }
.active-dot { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.9; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
