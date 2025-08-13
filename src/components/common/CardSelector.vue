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
            :name="uniqueName || 'choice-course'" 
            :value="option.value" 
            :checked="modelValue === option.value" 
          />
          <span class="circle"></span>
        </label>
        <span class="name" :class="{ on: modelValue === option.value }">
          {{ option.name }}
        </span>
      </a>

      
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

const myName = computed(() => props.uniqueName || 'course-selector')

const closeIcon = new URL('@/assets/images/ico_close.png', import.meta.url).href

const courseOptions = [
  { value: 'option1', name: '초록숲길', img: new URL('@/assets/images/course_temp01.png', import.meta.url).href },
  { value: 'option2', name: '물빛공원', img: new URL('@/assets/images/course_temp02.png', import.meta.url).href },
  { value: 'option3', name: '별빛강길', img: new URL('@/assets/images/course_temp03.png', import.meta.url).href },
  { value: 'option4', name: '은빛호수길', img: new URL('@/assets/images/course_temp04.png', import.meta.url).href },
]

</script>
