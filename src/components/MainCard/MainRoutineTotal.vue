<template>
  <div class="routine_total">
    <p>
      <span>
        <strong>{{ isFuture ? '이날의 다짐' : '오늘의 다짐' }}</strong>
        총<em class="t_on">15</em>건
        <template v-if="!isFuture"> 중</template>
      </span>
      <span>
        <template v-if="isFuture">
          미래에도 다짐 부자시네요!
        </template>
        <template v-else>
          <strong>미달성</strong> <em class="t_on">5</em>  
          <strong>달성완료</strong> <em class="t_on">8</em>
          <strong>흐린눈</strong> <em class="t_on">2</em>
        </template>
      </span>
    </p>

    <p class="filter_row">
      <span class="filter_label">
        <button><span>주간다짐보기</span></button>
      </span>
      <span class="filter_radios">
        <span class="today">Today</span>
        <label class="custom-radio">
          <input
            type="radio"
            name="filter"
            value="notdone"
            :checked="selectedRadio === 'notdone'"
          />
          <span class="circle"></span>
        </label>
        <span class="radio-text" @click="selectRadio('notdone')">달성 전</span>

        <label class="custom-radio">
          <input
            type="radio"
            name="filter"
            value="done"
            :checked="selectedRadio === 'done'"
          />
          <span class="circle"></span>
        </label>
        <span class="radio-text" @click="selectRadio('done')">달성 완료</span>

        <label class="custom-radio">
          <input
            type="radio"
            name="filter"
            value="ignored"
            :checked="selectedRadio === 'ignored'"
          />
          <span class="circle"></span>
        </label>
        <span class="radio-text" @click="selectRadio('ignored')">흐린 눈</span>
      </span>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const emit = defineEmits(['changeFilter'])

defineProps({
  isFuture: Boolean
})

const selectedRadio = ref('notdone')

function selectRadio(value) {
  selectedRadio.value = value
  emit('changeFilter', value)
}
</script>
