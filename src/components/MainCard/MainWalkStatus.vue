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
    <div class="walk_canvas">
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
        :base-points="20"
        :goal-count="goalCountResolved"
        :done-count="doneCountResolved"
        :point-r="9"
        :point-stroke-width="3"
        :point-fill="selectedCourse.pointFill"
        point-stroke="#ffffff"
      />
    </div>
    <div v-if="isCompleted" class="walk_complete">산책 완료! 보상을 확인하세요</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RUFFY_OPTIONS } from '@/components/common/RuffySelector.vue'
import { COURSE_OPTIONS } from '@/components/common/CourseSelector.vue'
import WalkMapSvg from '@/components/MainCard/WalkMapSvg.vue'
import bgImage from '@/assets/images/temp_map01.jpg'

const props = defineProps({
  routine: { type: Object, default: () => ({}) }
})

const routine = computed(() => props.routine || {})

const hasWalkResolved = computed(() => {
  const r = routine.value
  if (typeof r.hasWalk === 'boolean') return r.hasWalk
  return !!r.ruffy && !!r.course && !!r.goalCount
})

const goalCountResolved = computed(() => {
  const n = Number(routine.value?.goalCount || 20)
  return [5,10,15,20].includes(n) ? n : 20
})

const doneCountResolved = computed(() => {
  const n = Number(routine.value?.walkDoneCount || 0)
  return Math.max(0, Math.min(n, goalCountResolved.value))
})

const isCompleted = computed(() => doneCountResolved.value >= goalCountResolved.value)

const ruffyMeta = computed(() => {
  return RUFFY_OPTIONS.find(r => r.value === routine.value?.ruffy) || null
})

const courseMeta = computed(() => {
  return COURSE_OPTIONS.find(c => c.value === routine.value?.course) || null
})

const courseClass = computed(() => {
  const v = String(routine.value?.course || '')
  const m = v.match(/(\d+)/)
  if (!m) return ''
  const n = m[1].padStart(2,'0')
  return `course${n}`
})

const courseCustom = {
  id: 'course_custom',
  name: '사용자 코스',
  image: bgImage,         // 421×600 JPG
  vbW: 421,
  vbH: 600,
  pointFill: '#ff3b30',
  pathBaseW: 211,
  pathBaseH: 600,
  // 처음 보정값(스크린샷 기준): 필요시 숫자만 살짝 조절
  offsetX: -10,
  offsetY: -6,
  pathD: `
    M 0 600 L 98 333 196 333 196 216 14 216 15 130 196 130 197 0
    211 0 211 79 209 146 30 147 29 198 211 200 211 347
    116 347 17 600 0 600 Z
  `
}

const courseMap = {
  option1: courseCustom,
  option2: courseCustom,
  option3: courseCustom,
  option4: courseCustom
}

const selectedCourse = computed(() => {
  const key = String(routine.value?.course || '').toLowerCase()
  return courseMap[key] || courseCustom
})
</script>