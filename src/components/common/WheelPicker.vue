<!--버셀-->
<template>
  <div class="scroll-picker vertical" ref="picker">
    <div class="scroll-picker-list">
      <div 
        class="scroll-picker-item"
        v-for="(option, index) in options"
        :key="option"
        @click="handleClick(index)"
      >
        {{ option }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  options: {
    type: Array,
    required: true
  },
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])
const picker = ref(null)
let list, items
const itemHeight = 30

const highlight = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  items.forEach(item => item.classList.remove('light'))
  if (items[index]) {
    items[index].classList.add('light')
    emit('update:modelValue', props.options[index])
  }
}

const handleClick = (index) => {
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  items.forEach(item => item.classList.remove('light'))
  if (items[index]) {
    items[index].classList.add('light')
    emit('update:modelValue', props.options[index])
  }
}

onMounted(() => {
  list = picker.value.querySelector('.scroll-picker-list')
  items = picker.value.querySelectorAll('.scroll-picker-item')

  const defaultIndex = props.options.indexOf(props.modelValue)
  if (defaultIndex !== -1) {
    nextTick(() => {
      list.scrollTo({ top: defaultIndex * itemHeight, behavior: 'auto' })
    })
  }

  list.addEventListener('scroll', highlight)

  nextTick(() => {
    highlight()
  })
})
</script>

