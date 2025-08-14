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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RUFFY_OPTIONS } from '@/components/common/RuffySelector.vue'
import { COURSE_OPTIONS } from '@/components/common/CourseSelector.vue'

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
</script>
