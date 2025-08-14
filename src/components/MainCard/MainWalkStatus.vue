<template>
  <div :class="['walk_pop_wrap', courseClass]">
    <div class="walk_info" v-if="hasWalkResolved">
      <span class="walk_ruffy">{{ ruffyMeta?.name }}</span>
      <span class="walk_course">{{ courseMeta?.name }}</span>
      <span class="walk_goal">목표 {{ routine?.goalCount }}회</span>
    </div>
    <div v-else class="walk_info">
      <span class="walk_empty">산책 정보가 없습니다</span>
    </div>

    <div class="walk_canvas">
      <WalkMapSvg
        :map-src="testCourse.image"
        :vb-w="testCourse.vbW"
        :vb-h="testCourse.vbH"
        :path-d="testCourse.pathD"
        :max-points="testCourse.maxPoints"
        :goal-count="routine?.goalCount || 20"
        :done-count="routine?.walkDoneCount || 0"
        :point-r="8"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RUFFY_OPTIONS } from '@/components/common/RuffySelector.vue'
import { COURSE_OPTIONS } from '@/components/common/CourseSelector.vue'
import WalkMapSvg from '@/components/MainCard/WalkMapSvg.vue'
import farmImg from '@/assets/images/temp_map01.JPG'

const props = defineProps({
  routine: { type: Object, default: () => ({}) }
})

const routine = computed(() => props.routine || {})

const hasWalkResolved = computed(() => {
  const r = routine.value
  if (typeof r.hasWalk === 'boolean') return r.hasWalk
  return !!r.ruffy && !!r.course && !!r.goalCount
})

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

const testCourse = {
  id: 'test_farm',
  name: '테스트 코스',
  image: farmImg,
  vbW: 1000,
  vbH: 1000,
  maxPoints: 20,
  pathD: `
    M 80,820
    C 180,780 260,720 340,620
    S 520,440 640,420
    C 760,400 860,440 900,520
    S 880,680 780,740
    C 700,790 560,800 460,780
    S 260,720 180,640
    C 120,580 120,520 160,480
    C 220,420 340,420 440,440
    S 660,480 760,400
    C 840,340 840,260 780,220
    C 720,180 600,180 480,200
    S 260,260 160,320
    C 100,360 80,420 100,480
    C 120,540 160,620 220,680
    C 280,740 360,800 460,820
  `
}
</script>

<style scoped>
.walk_pop_wrap { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; }
.walk_info { flex: 0 0 auto; text-align: center; padding: 8px 0; }
.walk_canvas { flex: 1 1 auto; min-height: 0; }
.walk_canvas :deep(svg) { width: 100%; height: 100%; }
</style>
