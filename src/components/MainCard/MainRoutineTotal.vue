<template>
  <div class="routine_total">
    <p>
      <span>
        <strong>{{ isFuture ? '이날의 다짐' : '오늘의 다짐' }}</strong>
        총<em class="t_on">15</em>건
      </span>
      <span>
        <template v-if="isFuture">
          미래에도 다짐 부자시네요!
        </template>
        <template v-else>
          <a href="#none" class="not_done" :class="{ on: selectedRadio === 'notdone' }" @click.prevent="selectedRadio = 'notdone'">
            <strong>미달성</strong> <em class="t_on">5</em>
          </a>
          <a href="#none" class="done" :class="{ on: selectedRadio === 'done' }" @click.prevent="selectedRadio = 'done'">
            <strong>달성완료</strong> <em class="t_on">8</em>
          </a>
          <a href="#none" class="fail_done" :class="{ on: selectedRadio === 'faildone' }" @click.prevent="selectedRadio = 'faildone'">
            <strong>달성실패</strong> <em class="t_on">8</em>
          </a>
          <a href="#none" class="ignored" :class="{ on: selectedRadio === 'ignored' }" @click.prevent="selectedRadio = 'ignored'">
            <strong>흐린눈</strong> <em class="t_on">2</em>
          </a>
        </template>
      </span>
    </p>
    <p class="filter_row">
      <span class="filter_buttons">
        <button type="button" :class="{ on: selectedRadio === 'notdone' }" @click="selectedRadio = 'notdone'">달성 전</button>
        <button type="button" :class="{ on: selectedRadio === 'done' }" @click="selectedRadio = 'done'">달성 완료</button>
        <button type="button" :class="{ on: selectedRadio === 'faildone' }" @click="selectedRadio = 'faildone'">달성 실패</button>
        <button type="button" :class="{ on: selectedRadio === 'ignored' }" @click="selectedRadio = 'ignored'">흐린 눈</button>
        <button type="button" :class="{ on: selectedRadio === null }" @click="handleWeeklyClick">주간보기</button>
      </span>
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const emit = defineEmits(['update:modelValue', 'changeFilter', 'showWeekly'])
const props = defineProps({
  isFuture: Boolean,
  modelValue: { type: String, default: 'notdone' }
})

const selectedRadio = computed({
  get: () => props.modelValue,
  set: (v) => {
    emit('update:modelValue', v)
    emit('changeFilter', v)
  }
})

function handleWeeklyClick() {
  emit('update:modelValue', null)
  emit('changeFilter', null)
  emit('showWeekly')
}
</script>



