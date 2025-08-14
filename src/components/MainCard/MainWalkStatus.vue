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
        :map-src="selectedCourse.image"
        :map-opacity="0.1"
        :vb-w="selectedCourse.vbW"
        :vb-h="selectedCourse.vbH"
        :path-d="selectedCourse.pathD"
        :base-points="20"
        :goal-count="goalCountResolved"
        :point-r="9"
        :point-stroke-width="3"
        :point-fill="selectedCourse.pointFill"
        point-stroke="#ffffff"
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

const goalCountResolved = computed(() => {
  const n = Number(routine.value?.goalCount || 20)
  return [5,10,15,20].includes(n) ? n : 20
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

const testCourse01 = {
  id: 'test_01',
  name: '테스트 코스 01',
  image: farmImg,
  vbW: 1000,
  vbH: 1000,
  pointFill: '#ff3b30',
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

const testCourse02 = {
  id: 'test_02',
  name: '테스트 코스 02',
  image: farmImg,
  vbW: 1000,
  vbH: 1000,
  pointFill: '#1e90ff',
  pathD: `
    M 120,860
    C 220,780 320,740 420,660
    S 620,520 740,500
    C 860,480 940,520 920,600
    S 820,720 700,760
    C 560,810 420,800 340,760
    S 220,700 160,620
    C 120,560 120,520 160,500
    C 240,460 360,460 500,480
    S 720,520 820,440
    C 900,380 900,300 820,240
    C 720,170 560,170 420,210
    S 240,300 160,360
    C 120,400 110,460 140,520
    C 180,600 220,680 300,740
    C 360,780 440,820 560,840
  `
}

const testCourse03 = {
  id: 'test_03',
  name: '테스트 코스 03',
  image: farmImg,
  vbW: 1000,
  vbH: 1000,
  pointFill: '#111111',
  pathD: `
    M 80,200
    C 180,260 260,320 360,380
    S 560,480 680,520
    C 820,570 900,640 880,720
    S 760,820 620,840
    C 520,860 420,840 340,800
    S 200,720 140,640
    C 100,580 120,520 180,500
    C 260,470 380,480 520,500
    S 760,560 860,520
    C 940,480 940,420 880,380
    C 800,330 660,320 520,340
    S 320,380 220,420
    C 140,460 100,540 140,620
    C 180,700 240,760 340,820
  `
}

const testCourse04 = {
  id: 'test_04',
  name: '테스트 코스 04',
  image: farmImg,
  vbW: 1000,
  vbH: 1000,
  pointFill: '#12c48b',
  pathD: `
    M 200,900
    C 260,820 340,760 460,700
    S 700,600 820,560
    C 900,540 940,520 920,460
    C 900,400 820,360 700,360
    S 460,380 300,440
    C 200,480 140,520 140,580
    C 140,640 200,700 280,740
    C 360,780 460,800 600,800
    C 720,800 820,780 880,740
  `
}

const courseMap = {
  option1: testCourse01,
  option2: testCourse02,
  option3: testCourse03,
  option4: testCourse04
}

const selectedCourse = computed(() => {
  const key = String(routine.value?.course || '').toLowerCase()
  return courseMap[key] || testCourse01
})
</script>

<style scoped>
.walk_pop_wrap { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; }
.walk_info { flex: 0 0 auto; text-align: center; padding: 8px 0; }
.walk_canvas { flex: 1 1 auto; min-height: 0; }
.walk_canvas :deep(svg) { width: 100%; height: 100%; }
</style>
