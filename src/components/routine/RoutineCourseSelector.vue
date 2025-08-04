<template>
  <div class="form_box_g">
    <h3>즐거운 산책 코스를 선택해주세요.</h3>
    <CourseSelector v-model="selectedCourse" unique-name="routine-course" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CourseSelector from '@/components/common/CourseSelector.vue'

const selectedCourse = ref('')

defineExpose({
  course: selectedCourse
})

</script>