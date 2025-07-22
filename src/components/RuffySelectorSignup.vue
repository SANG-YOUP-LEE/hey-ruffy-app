<template>
  <div class="select_ruffy">
    <div class="info_text">친구가 되고 싶은 러피를 선택해주세요.</div>
    <div class="ruffys" ref="ruffysRef">
      <a
        v-for="option in ruffyOptions"
        :key="option.value"
        href="#none"
        :class="{ on: modelValue === option.value }"
        @click.prevent="selectRuffy(option.value)"
      >
        <span class="img"><img :src="option.img" :alt="option.name" /></span>
        <label class="custom-radio">
          <input type="radio" name="choice" :value="option.value" :checked="modelValue === option.value" />
          <span class="circle"></span>
        </label>
        <span class="name">{{ option.name }}</span>
      </a>

      <!-- 팝업도 여기에 포함 -->
      <div class="speech-bubble-wrapper" v-if="showPopup">
        <!-- ...팝업 내용은 기존과 동일 -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: String,
})
const emit = defineEmits(['update:modelValue'])

const showPopup = ref(false)

const ruffyOptions = [
  { value: 'option1', name: '퓨리 러피', img: '/src/assets/images/hey_ruffy_temp01.png' },
  { value: 'option2', name: '빌리 러피', img: '/src/assets/images/hey_ruffy_temp02.png' },
  { value: 'option3', name: '마리 러피', img: '/src/assets/images/hey_ruffy_temp03.png' },
  { value: 'option4', name: '도리 러피', img: '/src/assets/images/hey_ruffy_temp04.png' },
]

const selectRuffy = (value) => {
  emit('update:modelValue', value)
  showPopup.value = true
}

const handleClickOutside = (e) => {
  if (!e.target.closest('.select_ruffy')) {
    showPopup.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
