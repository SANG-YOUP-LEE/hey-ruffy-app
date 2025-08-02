<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>알람 시간 설정</h2>
      </div>
      <div class="title date light">
        <span>오전/오후</span><span>시</span><span>분</span>
      </div>
      <div class="popup_body picker_group">
        <WheelPicker v-model="localValue.ampm" :options="ampmOptions" />
        <WheelPicker v-model="localValue.hour" :options="hourOptions" />
        <WheelPicker v-model="localValue.minute" :options="minuteOptions" />
      </div>
      <div class="popup_btm">
        <button @click="confirmSelection" class="p_basic">확인</button>
        <button @click="$emit('close')" class="p_white">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import WheelPicker from './WheelPicker.vue'

const props = defineProps({
  modelValue: { 
    type: Object, 
    default: () => ({ ampm: 'AM', hour: '7', minute: '00' }) 
  }
})
const emit = defineEmits(['update:modelValue', 'close'])

const localValue = ref({ ...props.modelValue })

// 옵션
const ampmOptions = ['AM', 'PM']
const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1))
const minuteOptions = Array.from({ length: 60 }, (_, i) => i < 10 ? '0' + i : String(i))

const confirmSelection = () => {
  emit('update:modelValue', { ...localValue.value })
  emit('close')
}
</script>