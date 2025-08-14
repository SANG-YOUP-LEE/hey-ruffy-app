<template>
  <svg
    class="walk_svg"
    :viewBox="`0 0 ${vbW} ${vbH}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <rect v-if="!mapSrc" x="0" y="0" :width="vbW" :height="vbH" fill="#f2f2f2" />
    <image v-else :href="mapSrc" x="0" y="0" :width="vbW" :height="vbH" />
    <path
      v-if="showPath"
      :d="pathD"
      :stroke="pathStroke"
      :stroke-width="pathWidth"
      :stroke-dasharray="pathDasharray"
      :class="{ dash: animate }"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path ref="pathRef" :d="pathD" fill="none" stroke="transparent" />
    <g v-if="showBreadcrumbs">
      <circle
        v-for="(p,i) in breadcrumbPts"
        :key="i"
        :cx="p.x"
        :cy="p.y"
        :r="breadcrumbR"
        fill="#999"
        opacity="0.5"
      />
    </g>
    <g v-for="i in maxPoints" :key="i">
      <circle
        v-if="pts[i-1]"
        :cx="pts[i-1].x"
        :cy="pts[i-1].y"
        :r="pointR"
        :class="{
          point: true,
          target: targetSet.has(i),
          reached: reachedSet.has(i)
        }"
      />
    </g>
  </svg>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  mapSrc: { type: String, default: '' },
  pathD: { type: String, required: true },
  vbW: { type: Number, default: 1000 },
  vbH: { type: Number, default: 1000 },
  goalCount: { type: Number, default: 20 },
  doneCount: { type: Number, default: 0 },
  maxPoints: { type: Number, default: 20 },
  pointR: { type: Number, default: 8 },
  showPath: { type: Boolean, default: true },
  pathStroke: { type: String, default: '#ff3b30' },
  pathWidth: { type: Number, default: 14 },
  pathDasharray: { type: String, default: '24 16' },
  animate: { type: Boolean, default: true },
  showBreadcrumbs: { type: Boolean, default: true },
  breadcrumbEvery: { type: Number, default: 30 },
  breadcrumbR: { type: Number, default: 3 }
})

const pathRef = ref(null)
const pts = ref([])
const breadcrumbPts = ref([])

function checkpointsFor(steps, max) {
  const out = []
  for (let k = 1; k <= steps; k++) out.push(Math.ceil((k * max) / steps))
  return out
}

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
  const crumbs = []
  for (let s = 0; s <= L; s += props.breadcrumbEvery) {
    const p = el.getPointAtLength(s)
    crumbs.push({ x: p.x, y: p.y })
  }
  breadcrumbPts.value = crumbs
}

const targets = computed(() => checkpointsFor(props.goalCount, props.maxPoints))
const targetSet = computed(() => new Set(targets.value))
const reachedSet = computed(() => {
  const cnt = Math.min(props.doneCount, props.goalCount)
  return new Set(targets.value.slice(0, cnt))
})

onMounted(samplePoints)
watch(() => props.pathD, samplePoints)
watch(() => props.maxPoints, samplePoints)
watch(() => props.breadcrumbEvery, samplePoints)
</script>

<style scoped>
.walk_svg { width: 100%; height: 100%; display: block; }
.point { fill: #d9d9d9; opacity: .95; }
.point.target { fill: #4da3ff; }
.point.reached { fill: #12c48b; }
.dash { animation: dashmove 2.4s linear infinite; }
@keyframes dashmove {
  to { stroke-dashoffset: -200; }
}
</style>
