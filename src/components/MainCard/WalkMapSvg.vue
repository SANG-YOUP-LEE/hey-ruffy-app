<template>
  <svg
    class="walk_svg"
    :viewBox="`0 0 ${vbW} ${vbH}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <image v-if="mapSrc" :href="mapSrc" x="0" y="0" :width="vbW" :height="vbH" />
    <path ref="pathRef" :d="pathD" fill="none" stroke="transparent" />

    <g v-for="i in maxPoints" :key="i">
      <circle
        v-if="pts[i-1]"
        :cx="pts[i-1].x"
        :cy="pts[i-1].y"
        :r="pointR"
        class="point"
      />
    </g>
  </svg>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  mapSrc: { type: String, default: '' },
  pathD: { type: String, required: true },
  vbW: { type: Number, default: 1000 },
  vbH: { type: Number, default: 1000 },
  maxPoints: { type: Number, default: 20 },
  pointR: { type: Number, default: 6 }
})

const pathRef = ref(null)
const pts = ref([])

function samplePoints() {
  const el = pathRef.value
  if (!el) return
  const L = el.getTotalLength()
  const arr = []
  for (let i = 0; i < props.maxPoints; i++) {
    const t = i / (props.maxPoints - 1)
    const p = el.getPointAtLength(L * t)
    arr.push({ x: p.x, y: p.y })
  }
  pts.value = arr
}

onMounted(samplePoints)
watch(() => props.pathD, samplePoints)
watch(() => props.maxPoints, samplePoints)
</script>

<style scoped>
.walk_svg { width: 100%; height: 100%; display: block; }
.point { fill: #4da3ff; opacity: 0.9; }
</style>
