<template>
  <div class="form_box_g">
    <h3>다짐 제목을 적어주세요.</h3>
    <p>
      <label for="rt_name">새 다짐 명</label>
      <input
        id="rt_name"
        type="text"
        placeholder="ex)외로워도 슬퍼도 탄수화물 끊기"
        class="uline"
        :value="inner"
        @input="onInput"
      />
    </p>
  </div>
</template>

<script setup>
//  start
import { ref, watch } from 'vue'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])

const inner = ref(props.modelValue)
watch(() => props.modelValue, v => { if (v !== inner.value) inner.value = v })

function onInput(e) {
  inner.value = e.target.value
  emit('update:modelValue', inner.value)
}

function setFromRoutine(rt) {
  emit('update:modelValue', rt?.title || '')
}

defineExpose({ setFromRoutine })
</script>