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

      <!-- 팝업 -->
      <div class="speech-bubble-wrapper" v-if="showRuffyPopup">
        <div class="speech-bubble">
          <button class="close-btn" @click="closeRuffyPopup">
            <img :src="closeIcon" alt="닫기" />
          </button>
          <div class="tail" :class="selectedOption"></div>

          <div v-if="selectedOption === 'option1'" class="r_detail01">
            <p><span>러피 이미지</span><span>Furry Ruffy</span></p>
            귀여운 잠보 퓨리예요. 움직이기 싫어해서 산책 한번 나가기 힘들지만 막상 나가면 날라날라~ 6개월째 생일날 받은 노란색 안대는 최애템!
          </div>
          <div v-else-if="selectedOption === 'option2'" class="r_detail02">
            <p><span>러피 이미지</span><span>Billy Ruffy</span></p>
            언제나 씩씩한 빌리의 비밀은 할머니가 준 파란색 담요! 이것만 두르면 용기 백배지만 요거 없으면 무서워서 잠도 잘 못자는건 안 비밀~
          </div>
          <div v-else-if="selectedOption === 'option3'" class="r_detail03">
            <p><span>러피 이미지</span><span>Mari Ruffy</span></p>
            새침 숙녀 마리예요. 수족냉증이 있어서 사계절 내내 수면양말 네짝은 필수랍니다. 그중 요키 이모가 짜준 핑크 하트 수면 양말이 최고!
          </div>
          <div v-else-if="selectedOption === 'option4'" class="r_detail04">
            <p><span>러피 이미지</span><span>Dory Ruffy</span></p>
            세상 순둥순둥하고 착한 도리예요. 두달쯤 되던 달 번개소리에 놀라 잠을 깬 이후로 귀마개가 없으면 잠들지 못하는 짠한 겁보랍니다.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// src/assets/images 내부 이미지 안전하게 불러오기
const closeIcon = new URL('@/assets/images/ico_close02.png', import.meta.url).href

const ruffyOptions = [
  {
    value: 'option1',
    name: '퓨리 러피',
    img: new URL('@/assets/images/hey_ruffy_temp01.png', import.meta.url).href,
  },
  {
    value: 'option2',
    name: '빌리 러피',
    img: new URL('@/assets/images/hey_ruffy_temp02.png', import.meta.url).href,
  },
  {
    value: 'option3',
    name: '마리 러피',
    img: new URL('@/assets/images/hey_ruffy_temp03.png', import.meta.url).href,
  },
  {
    value: 'option4',
    name: '도리 러피',
    img: new URL('@/assets/images/hey_ruffy_temp04.png', import.meta.url).href,
  },
]

const props = defineProps({
  modelValue: String,
})
const emit = defineEmits(['update:modelValue'])

const showRuffyPopup = ref(false)
const selectedOption = ref('')
const ruffysRef = ref(null)

const selectRuffy = (value) => {
  emit('update:modelValue', value)
  selectedOption.value = value
  showRuffyPopup.value = true
}

const closeRuffyPopup = () => {
  showRuffyPopup.value = false
}

const handleClickOutside = (e) => {
  if (ruffysRef.value && !ruffysRef.value.contains(e.target)) {
    showRuffyPopup.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
