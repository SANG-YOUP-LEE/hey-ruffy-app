<template>
  <div class="select_course">
    <div class="course">
      <a
        v-for="option in courseOptions"
        :key="option.value"
        href="#none"
        :class="{ on: modelValue === option.value }"
        @click.prevent="selectCourse(option.value)"
      >
        <span class="img"><img :src="option.img" :alt="option.name" /></span>
        <label class="custom-radio">
          <input 
            type="radio"
            :id="`${groupName}-${option.value}`"
            :name="groupName"
            :value="option.value"
            :checked="modelValue === option.value"
          />
          <span class="circle"></span>
        </label>
        <span class="name" :class="{ on: modelValue === option.value }">
          {{ option.name }}
        </span>
      </a>

      <div class="speech-bubble-wrapper" v-if="showCoursePopup">
        <button class="popup-close-area" @click="closeCoursePopup"></button>
        <div class="speech-bubble" @click.stop>
          <button class="close-btn" @click="closeCoursePopup">
            <img :src="closeIcon" alt="닫기" />
          </button>
          <div class="tail" :class="selectedOption"></div>

          <div v-if="selectedOption === 'option1'" class="r_detail01">
            <p><span>초록숲길 이미지</span><span>초록숲길</span></p>
            초록숲길 설명입니다.
          </div>
          <div v-else-if="selectedOption === 'option2'" class="r_detail02">
            <p><span>물빛공원 이미지</span><span>물빛공원</span></p>
            물빛공원 설명입니다.
          </div>
          <div v-else-if="selectedOption === 'option3'" class="r_detail03">
            <p><span>별빛강길 이미지</span><span>별빛강길</span></p>
            별빛강길 설명입니다.
          </div>
          <div v-else-if="selectedOption === 'option4'" class="r_detail04">
            <p><span>은빛호수길 이미지</span><span>은빛호수길</span></p>
            은빛호수길 설명입니다.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export const COURSE_OPTIONS = [
  { value: 'option1', name: '초록숲길', img: new URL('@/assets/images/course_temp01.png', import.meta.url).href },
  { value: 'option2', name: '물빛공원', img: new URL('@/assets/images/course_temp02.png', import.meta.url).href },
  { value: 'option3', name: '별빛강길', img: new URL('@/assets/images/course_temp03.png', import.meta.url).href },
  { value: 'option4', name: '은빛호수길', img: new URL('@/assets/images/course_temp04.png', import.meta.url).href }
]
</script>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  uniqueName: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const closeIcon = new URL('@/assets/images/ico_close.png', import.meta.url).href
const courseOptions = COURSE_OPTIONS

const showCoursePopup = ref(false)
const selectedOption = computed(() => props.modelValue || '')
const groupName = computed(() => props.uniqueName || 'choice-course')
const myName = computed(() => props.uniqueName || 'course-selector')

const selectCourse = (value) => {
  emit('update:modelValue', value)
  showCoursePopup.value = true
  window.dispatchEvent(new CustomEvent('bubble-open', { detail: { who: myName.value } }))
}

const closeCoursePopup = () => { showCoursePopup.value = false }

const onBubbleOpen = (e) => {
  const who = e?.detail?.who
  if (who && who !== myName.value) showCoursePopup.value = false
}

onMounted(() => { window.addEventListener('bubble-open', onBubbleOpen) })
onBeforeUnmount(() => { window.removeEventListener('bubble-open', onBubbleOpen) })
</script>
