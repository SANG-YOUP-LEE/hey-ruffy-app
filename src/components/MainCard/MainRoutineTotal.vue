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
          <a href="#none" class="not_done" @click.prevent="selectedRadio = 'notdone'">
            <strong>미달성</strong> <em class="t_on">5</em>
          </a>
          <a href="#none" class="done" @click.prevent="selectedRadio = 'done'">
            <strong>달성완료</strong> <em class="t_on">8</em>
          </a>
          <a href="#none" class="fail_done" @click.prevent="selectedRadio = 'faildone'">
            <strong>달성실패</strong> <em class="t_on">8</em>
          </a>
          <a href="#none" class="ignored" @click.prevent="selectedRadio = 'ignored'">
            <strong>흐린눈</strong> <em class="t_on">2</em>
          </a>
        </template>
      </span>
    </p>

    <p class="filter_row">
      <span class="filter_label">
        <button @click="handleWeeklyClick"><span>주간다짐보기</span></button>
      </span>
      <span class="filter_radios">
        <span class="today">Today</span>

        <label class="custom-radio">
          <input type="radio" name="filter" value="notdone" v-model="selectedRadio" />
          <span class="circle"></span>
        </label>
        <span class="radio-text" @click="selectedRadio = 'notdone'">달성 전</span>

        <label class="custom-radio">
          <input type="radio" name="filter" value="done" v-model="selectedRadio" />
          <span class="circle"></span>
        </label>
        <span class="radio-text" @click="selectedRadio = 'done'">달성 완료</span>

        <label class="custom-radio">
          <input type="radio" name="filter" value="faildone" v-model="selectedRadio" />
          <span class="circle"></span>
        </label>
        <span class="radio-text" @click="selectedRadio = 'faildone'">달성 실패</span>

        <label class="custom-radio">
          <input type="radio" name="filter" value="ignored" v-model="selectedRadio" />
          <span class="circle"></span>
        </label>
        <span class="radio-text" @click="selectedRadio = 'ignored'">흐린 눈</span>
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
