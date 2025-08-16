<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="`0 0 ${vbW} ${vbH}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <image
      v-if="mapSrc"
      :href="mapSrc"
      x="0" y="0"
      :width="vbW" :height="vbH"
      preserveAspectRatio="none"
      :style="{ opacity: mapOpacity }"
    />
    <g :transform="geomTransform">
      <path ref="pathRef" :d="pathD" fill="none" stroke="none" style="display:none" />
      <template v-for="(p, i) in visiblePts" :key="i">
        <circle :cx="p.x" :cy="p.y" :r="pointR" :fill="pointFill" :stroke="pointStroke" :stroke-width="pointStrokeWidth" opacity="0.95" />
      </template>
    </g>
  </svg>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const emit = defineEmits(['first-spot','spots'])

const props = defineProps({
  mapSrc: { type: String, default: '' },
  mapOpacity: { type: Number, default: 1 },
  vbW: { type: Number, required: true },
  vbH: { type: Number, required: true },
  pathD: { type: String, required: true },
  pointR: { type: Number, default: 9 },
  pointFill: { type: String, default: '#ff3b30' },
  pointStroke: { type: String, default: '#ffffff' },
  pointStrokeWidth: { type: Number, default: 3 },
  goalCount: { type: Number, default: 20 },
  basePoints: { type: Number, default: 21 },
  doneCount: { type: Number, default: 0 },
  pathBaseW: { type: Number, required: true },
  pathBaseH: { type: Number, required: true },
  offsetX: { type: Number, default: 0 },
  offsetY: { type: Number, default: 0 },
  startFromEnd: { type: Boolean, default: false }
})

const pathRef = ref(null)
const basePts = ref([])

const scaleX = computed(() => props.vbW / props.pathBaseW)
const scaleY = computed(() => props.vbH / props.pathBaseH)
const geomTransform = computed(() => `translate(${props.offsetX},${props.offsetY}) scale(${scaleX.value},${scaleY.value})`)

function sampleBasePoints() {
  const el = pathRef.value
  if (!el) return
  const L = el.getTotalLength()
  const B = Math.max(2, props.basePoints)
  const arr = []
  for (let i = 0; i < B; i++) {
    const t = i / (B - 1)
    const p = el.getPointAtLength(L * t)
    arr.push({ x: p.x, y: p.y })
  }
  basePts.value = arr
  emitAllSpots()
}

const orderedPts = computed(() => props.startFromEnd ? [...basePts.value].reverse() : basePts.value)

const visiblePts = computed(() => {
  const B = orderedPts.value.length
  if (B === 0) return []
  const target = Math.max(1, Math.min(props.goalCount, 20))
  const N = Math.min(target + 1, B) // 0 포함 → +1
  if (N === B) return orderedPts.value
  if (N === 1) return [orderedPts.value[0]]
  const out = []
  for (let i = 0; i < N; i++) {
    const idx = Math.round((i * (B - 1)) / (N - 1))
    out.push(orderedPts.value[idx])
  }
  return out
})

function toPct(p) {
  const x = props.offsetX + p.x * scaleX.value
  const y = props.offsetY + p.y * scaleY.value
  return { left: (x / props.vbW) * 100, top: (y / props.vbH) * 100 }
}

function emitAllSpots() {
  if (!visiblePts.value.length) return
  const spotsPct = visiblePts.value.map(toPct)
  emit('spots', spotsPct)
  const p0 = spotsPct[0]
  if (p0) emit('first-spot', p0)
}

onMounted(sampleBasePoints)
watch(() => props.pathD, sampleBasePoints)
watch(() => props.basePoints, sampleBasePoints)
watch(() => props.goalCount, emitAllSpots)
watch(() => props.startFromEnd, emitAllSpots)
</script>