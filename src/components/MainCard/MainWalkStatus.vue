<template>
  <div :class="['walk_pop_wrap', courseClass]">
    <div class="walk_info" v-if="hasWalkResolved">
      <span class="walk_ruffy_white">{{ ruffyMeta?.name }}</span>
      <span class="walk_course_white">{{ courseMeta?.name }}</span>
      <span class="walk_goal_white">목표 {{ goalCountResolved }}회</span>
      <span class="walk_done_white">진행 {{ doneCountResolved }}회</span>
    </div>
    <div v-else class="walk_info">
      <span class="walk_empty">산책 정보가 없습니다</span>
    </div>

    <div class="walk_canvas" ref="canvasRef">
      <WalkMapSvg
        :map-src="selectedCourse.image"
        :map-opacity="1"
        :vb-w="selectedCourse.vbW"
        :vb-h="selectedCourse.vbH"
        :path-d="selectedCourse.pathD"
        :path-base-w="selectedCourse.pathBaseW"
        :path-base-h="selectedCourse.pathBaseH"
        :offset-x="selectedCourse.offsetX"
        :offset-y="selectedCourse.offsetY"
        :base-points="24"
        :goal-count="goalCountResolved"
        :done-count="doneCountResolved"
        :point-r="9"
        :point-stroke-width="3"
        :point-fill="selectedCourse.pointFill"
        point-stroke="#ffffff"
        :start-from-end="selectedCourse.startFromEnd"
        @first-spot="onFirstSpot"
        @spots="onSpots"
      />
      <div
        v-if="ruffyAnchor"
        class="ruffys_item"
        ref="ruffyEl"
        :style="{
          left: ruffyAnchor.left + '%',
          top: ruffyAnchor.top + '%',
          transition: isTransitionOn ? `left ${stepDuration}ms ease, top ${stepDuration}ms ease` : 'none'
        }"
      >
        <span :class="ruffyClass"></span>
      </div>
    </div>

    <div v-if="isCompleted" class="walk_complete">산책 완료! 보상을 확인하세요</div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { RUFFY_OPTIONS } from '@/components/common/RuffySelector.vue'
import { COURSE_OPTIONS } from '@/components/common/CourseSelector.vue'
import WalkMapSvg from '@/components/MainCard/WalkMapSvg.vue'
import imgCourse01 from '@/assets/images/temp_map01.jpg'
import imgCourse02 from '@/assets/images/temp_map02.jpg'
import imgCourse03 from '@/assets/images/temp_map03.jpg'
import imgCourse04 from '@/assets/images/temp_map04.jpg'

const props = defineProps({
  routine: { type: Object, default: () => ({}) },
  playSeq: { type: Number, default: 0 },
  doneOverride: { type: Number, default: null }
})

const routine = computed(() => props.routine || {})

const hasWalkResolved = computed(() => {
  const r = routine.value
  if (typeof r.hasWalk === 'boolean') return r.hasWalk
  return !!r.ruffy && !!r.course && !!r.goalCount
})

const goalCountResolved = computed(() => {
  const n = Number(routine.value?.goalCount || 20)
  return [5, 10, 15, 20].includes(n) ? n : 20
})

const rawDone = computed(() => {
  const base = Number(routine.value?.walkDoneCount || 0)
  const ov = props.doneOverride
  return typeof ov === 'number' ? ov : base
})

const doneCountResolved = computed(() => {
  const n = Number(rawDone.value || 0)
  return Math.max(0, Math.min(n, goalCountResolved.value))
})

const isCompleted = computed(() => doneCountResolved.value >= goalCountResolved.value)

const ruffyMeta = computed(() => RUFFY_OPTIONS.find(r => r.value === routine.value?.ruffy) || null)
const courseMeta = computed(() => COURSE_OPTIONS.find(c => c.value === routine.value?.course) || null)

function normalizeCourseKey(v) {
  const s = String(v || '').toLowerCase()
  if (/^course\d+$/.test(s)) {
    const n = s.match(/\d+/)?.[0] || '1'
    return `course${n.padStart(2,'0')}`
  }
  if (/^option\d+$/.test(s)) {
    const n = s.match(/\d+/)?.[0] || '1'
    return `course${n.padStart(2,'0')}`
  }
  return 'course01'
}

const courseClass = computed(() => normalizeCourseKey(routine.value?.course))

const vbW = 768
const vbH = 1024

const course01 = { id: 'course01', name: '코스 01', image: imgCourse01, vbW, vbH, pointFill: '#ff3b30', pathBaseW: 768, pathBaseH: 1024, offsetX: 0, offsetY: 0, startFromEnd: false,
  pathD: 'M33.13,821.12s74.87-33.12,98.87-80.12,37-136,35-184-12-102,11-135c17-24.39,36.46-44.99,88-38,59,8,46,24,137,28,35.19,1.55,75-28,83-48s13-65,0-98-37.25-84.94-54.66-109c-34-47-57.05-116.89-57.05-116.89'
}
const course02 = { id: 'course02', name: '코스 02', image: imgCourse02, vbW, vbH, pointFill: '#1e90ff', pathBaseW: 768, pathBaseH: 1024, offsetX: 0, offsetY: 0, startFromEnd: false,
  pathD: 'M29.53,979.66s10.21-65.2,71.01-141.06c51.26-63.97,100.86-106.43,205.41-135.91,109.34-30.83,282.01-15.13,392.29-52.51,23.13-7.84,49.42-18.53,54.06-66.41,12.47-128.88-41.7-161.39-84.94-153.67s-46.59,35.56-77.99,59.46c-51.74,39.38-125.67,33.95-134.17-32.2-6.44-50.13,58.09-159.34,63.73-180.27,7.88-29.24,10.97-68.63-33.82-87.16s-159.85-19.31-209.27-34.75-119.69-43.24-158.81-75.58c-23.96-19.8-42.41-47.84-42.41-47.84'
}
const course03 = { id: 'course03', name: '코스 03', image: imgCourse03, vbW, vbH, pointFill: '#111111', pathBaseW: 768, pathBaseH: 1024, offsetX: 0, offsetY: 0, startFromEnd: false,
  pathD: 'M39.53,915.81s140.16,18.53,233.98-86.49c38.59-43.19,51.74-59.46,54.06-75.68s-8.49-64.87-18.53-84.17-48.49-68.73-61.01-81.08-81.08-71.7-84.94-76.39,5.41-10.1,30.12-61.06,41.7-91.89,41.7-91.89c0,0,15.44-26.26,48.65-12.36s109.66,31.66,129.73,38.61,101.16,44.02,112.74,51.74,33.21,3.09,38.61-10.81,28.57-54.06,21.62-77.22-30.89-58.69-47.11-70.27-75.68-50.19-83.4-62.55-19.31-55.6.77-66.41,33.98-23.94,88.81-21.62,79.54,3.86,105.02-5.41,48.65-27.8,53.28-42.47,9.66-38.95,5.03-41.27'
}
const course04 = { id: 'course04', name: '코스 04', image: imgCourse04, vbW, vbH, pointFill: '#12c48b', pathBaseW: 768, pathBaseH: 1024, offsetX: 0, offsetY: 0, startFromEnd: true,
  pathD: 'M731.06,371.4c-3.76-16.37-47.49-13.13-75.29-24.71s-30.89-36.29-40.16-71.04,18.53-142.86,16.22-170.66-24.71-40.93-41.7-52.51-71.04-16.99-95.76-19.31-141.32.77-181.47,5.41-81.86,18.53-115.06,44.79-51.74,98.84-61.78,132.82,7.72,30.12,33.08,39.38,33.33,20.08,52.64,35.52,33.21,57.14,20.08,85.72-32.43,47.11-48.65,57.14-40.93,8.49-57.92,9.27-22.39,9.27-29.34,24.71-10.81,27.8-7.72,85.72,31.66,107.34,44.79,131.28,20.85,38.61,20.85,38.61c0,0-4.63,13.13-34.75,55.6s-38.61,105.41-38.61,105.41'
}

const courseMap = { course01, course02, course03, course04 }
const selectedCourse = computed(() => {
  const key = normalizeCourseKey(routine.value?.course)
  return courseMap[key] || course01
})

const ruffyClass = computed(() => {
  const v = String(routine.value?.ruffy || '').toLowerCase()
  const n = v.match(/\d+/)?.[0] || '1'
  return `ruffy${String(n).padStart(2,'0')}`
})

const canvasRef = ref(null)
const ruffyEl = ref(null)
const allSpots = ref([])
const ruffyAnchor = ref(null)
const isTransitionOn = ref(false)
const isPlaying = ref(false)
const wantPlayOnOpen = ref(false)
const stepDuration = 220

function onFirstSpot(pct) {
  if (!allSpots.value.length) ruffyAnchor.value = pct
}

function onSpots(arr) {
  allSpots.value = Array.isArray(arr) ? arr : []
  if (wantPlayOnOpen.value) playFromZeroToCurrent()
  else updateRuffyAnchor()
}

function updateRuffyAnchor() {
  if (!allSpots.value.length || isPlaying.value) return
  const idx = Math.max(0, Math.min(doneCountResolved.value, allSpots.value.length - 1))
  ruffyAnchor.value = allSpots.value[idx]
}

function waitTransitionOnce() {
  return new Promise((resolve) => {
    let done = false
    const el = ruffyEl.value
    const timer = setTimeout(() => {
      if (done) return
      done = true
      el && el.removeEventListener('transitionend', onEnd)
      resolve()
    }, stepDuration + 40)
    const onEnd = (e) => {
      if (done) return
      if (e.target !== el) return
      if (e.propertyName !== 'left' && e.propertyName !== 'top') return
      done = true
      clearTimeout(timer)
      el && el.removeEventListener('transitionend', onEnd)
      resolve()
    }
    el && el.addEventListener('transitionend', onEnd, { once: true })
  })
}

async function playFromZeroToCurrent() {
  if (!allSpots.value.length) { wantPlayOnOpen.value = true; return }
  wantPlayOnOpen.value = false
  isPlaying.value = true
  const targetIdx = Math.max(0, Math.min(doneCountResolved.value, allSpots.value.length - 1))
  isTransitionOn.value = false
  ruffyAnchor.value = allSpots.value[0]
  await nextTick()
  canvasRef.value?.offsetWidth
  isTransitionOn.value = true
  for (let i = 1; i <= targetIdx; i++) {
    if (!isPlaying.value) break
    ruffyAnchor.value = allSpots.value[i]
    await waitTransitionOnce()
  }
  isPlaying.value = false
}

watch(() => props.playSeq, () => {
  wantPlayOnOpen.value = true
  playFromZeroToCurrent()
})

watch(doneCountResolved, updateRuffyAnchor)
</script>