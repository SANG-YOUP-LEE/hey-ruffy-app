<template>
  <div class="select_card">
    <div class="card" ref="cardRef">
      <a
        v-for="option in cardOptions"
        :key="option.value"
        href="#none"
        :class="{ on: modelValue === option.value }"
        @click.prevent="selectCard(option.value)"
      >
        <span class="img"><img :src="option.img" :alt="option.name" /></span>
        <label class="custom-radio">
          <input 
            type="radio" 
            :name="uniqueName || 'choice-card'" 
            :value="option.value" 
            :checked="modelValue === option.value" 
          />
          <span class="circle"></span>
        </label>
        <span class="name" :class="{ on: modelValue === option.value }">
          {{ option.name }}
        </span>
      </a>

      <div class="speech-bubble-wrapper" v-if="showCardPopup">
        <button class="popup-close-area" @click="closeCardPopup"></button>
        <div class="speech-bubble" @click.stop>
          <button class="close-btn" @click="closeCardPopup">
            <img :src="closeIcon" alt="닫기" />
          </button>
          <div class="tail" :class="selectedOption"></div>

          <div v-if="selectedOption === 'option01'" class="r_detail01">
            <p><span>기본 카드 이미지</span><span>기본</span></p>
            기본 카드 설명입니다.
          </div>
          <div v-else-if="selectedOption === 'option02'" class="r_detail02">
            <p><span>나리꽃 카드 이미지</span><span>나리꽃</span></p>
            나리꽃 카드 설명입니다.
          </div>
          <div v-else-if="selectedOption === 'option03'" class="r_detail03">
            <p><span>커피눈물 카드 이미지</span><span>커피눈물</span></p>
            커피눈물 카드 설명입니다.
          </div>
          <div v-else-if="selectedOption === 'option04'" class="r_detail04">
            <p><span>노란우체국 카드 이미지</span><span>노란우체국</span></p>
            노란우체국 카드 설명입니다.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  modelValue: String,
  uniqueName: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const myName = computed(() => props.uniqueName || 'card-selector')
const closeIcon = new URL('@/assets/images/ico_close.png', import.meta.url).href

const cardOptions = [
  { value: 'option01', name: '기본',     img: new URL('@/assets/images/card_temp01.png', import.meta.url).href },
  { value: 'option02', name: '나리꽃',   img: new URL('@/assets/images/card_temp02.png', import.meta.url).href },
  { value: 'option03', name: '커피눈물', img: new URL('@/assets/images/card_temp03.png', import.meta.url).href },
  { value: 'option04', name: '노란우체국', img: new URL('@/assets/images/card_temp04.png', import.meta.url).href },
]

const showCardPopup = ref(false)
const selectedOption = ref('')

const selectCard = (value) => {
  emit('update:modelValue', value)
  selectedOption.value = value
  showCardPopup.value = true
  window.dispatchEvent(new CustomEvent('bubble-open', { detail: { who: myName.value } }))
}
const closeCardPopup = () => { showCardPopup.value = false }
const onBubbleOpen = (e) => { if (e?.detail?.who !== myName.value) showCardPopup.value = false }

onMounted(() => window.addEventListener('bubble-open', onBubbleOpen))
onBeforeUnmount(() => window.removeEventListener('bubble-open', onBubbleOpen))
</script>
