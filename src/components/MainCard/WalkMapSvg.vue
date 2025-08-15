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
      x="0" y="0"
      :width="vbW" :height="vbH"
      :style="{ opacity: mapOpacity }"
    />

    <text x="8" y="20" font-size="14" font-weight="700" fill="#111">
      pts: {{ visiblePts.length }}
    </text>

    <g :transform="geomTransform">
      <path
        ref="pathRef"
        :d="pathD"
        fill="none"
        stroke="#eee"
        stroke-width="20"
        stroke-linejoin="round"
        stroke-linecap="butt"
        opacity="0.95"
        vector-effect="non-scaling-stroke"
      />

      <template v-for="(p, i) in visiblePts" :key="i">
        <circle
          :cx="p.x" :cy="p.y"
          :r="pointR"
          fill="#ccc"
          stroke="#ccc"
          stroke-width="2"
          opacity="1"
        />
        <text
          :x="p.x + pointR + 2" :y="p.y + 4"
          font-size="14" font-weight="700" fill="#000"
        >{{ i + 1 }}</text>
      </template>
    </g>
  </svg>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  mapSrc: { type: String, default: '' },
  mapOpacity: { type: Number, default: 1 },
  vbW: { type: Number, default: 421 },   // 배경 JPG 실제 좌표계
  vbH: { type: Number, default: 600 },
  pathD: { type: String, required: true }, // 네가 준 SVG path
  pointR: { type: Number, default: 9 },
  pointFill: { type: String, default: '#1e90ff' },
  pointStroke: { type: String, default: '#ffffff' },
  pointStrokeWidth: { type: Number, default: 3 },
  goalCount: { type: Number, default: 20 },
  basePoints: { type: Number, default: 20 },
  doneCount: { type: Number, default: 0 },

  // 경로 원본 좌표계(일러에서 export한 아트보드 크기)
  pathBaseW: { type: Number, default: 211 },
  pathBaseH: { type: Number, default: 600 },

  // 크롭/여백 차이 보정용 오프셋(픽셀)
  offsetX: { type: Number, default: -10 },
  offsetY: { type: Number, default: -6 }
})

const pathRef = ref(null)
const basePts = ref([])

const scaleX = computed(() => props.vbW / props.pathBaseW)
const scaleY = computed(() => props.vbH / props.pathBaseH)
const geomTransform = computed(() =>
  `translate(${props.offsetX},${props.offsetY}) scale(${scaleX.value},${scaleY.value})`
)

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