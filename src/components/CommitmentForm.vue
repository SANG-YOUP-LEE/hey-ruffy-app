<template>

  <div class="paper">
    <form @submit.prevent="handleSubmit">
      <!-- 다짐명 입력 -->
      <div class="p_title">
        <h3><lable>당신의 다짐을 말해주세요.</lable></h3>
        <div class="input_set">
           <input v-model="title" type="text" placeholder="ex)외로워도 슬퍼도 탄수화물 끊기" required />
        </div>
      </div>
      <!-- //다짐명 입력 -->
    

    <div class="save_btn">
      <button @click=""  type="submit">다짐 저장하기</button>
    </div>
      
     
    <button class="close_btn" type="button" @click="handleClose"><span>닫기</span></button>

    <!-- <p>
      <label>다짐 주기를 정해줄래?</label>
      <div>
        <label><input type="radio" value="매일" v-model="frequency" /> 매일</label>
        <label><input type="radio" value="매주" v-model="frequency" /> 매주</label>
        <label><input type="radio" value="매월" v-model="frequency" /> 매월</label>
        <label>
          <input type="radio" value="매년" v-model="frequency" /> 매년
          <select v-if="frequency === '매년'" v-model="month"><option v-for="m in 12" :key="m" :value="m">{{ m }}월</option></select>
          <select v-if="frequency === '매년'" v-model="day"><option v-for="d in 31" :key="d" :value="d">{{ d }}일</option></select>
        </label>
        <label><input type="radio" value="특별히 한번만" v-model="frequency" /> 특별히 한번만</label>
      </div>
    </p>

    <p>
      <label>알람해줘?</label>
      <input v-model="reminder" type="text" placeholder="ex) 하루 전 오전 10:30분" />

      <label>얼마나 중요한 거야?</label>
      <select v-model="importance">
        <option value="⭐️">⭐️ (중요)</option>
        <option value="🌟">🌟 (매우 중요)</option>
      </select>
    </p>


    <p>
      <label>메모할 거 있어?</label>
      <textarea v-model="note" placeholder="이것만 지켜도 행복해질 수 있어!"></textarea>
    </p> -->


    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const emit = defineEmits(['submit', 'close'])

const title = ref('')
const frequency = ref('')
const month = ref('')
const day = ref('')
const reminder = ref('')
const importance = ref('⭐️')
const note = ref('')
const description = ref('') // 추가 설명은 기존대로 유지

const handleSubmit = () => {
  emit('submit', {
    title: title.value,
    description: description.value,
    frequency: frequency.value,
    month: month.value,
    day: day.value,
    reminder: reminder.value,
    importance: importance.value,
    note: note.value
  })

  // 초기화
  title.value = ''
  frequency.value = ''
  month.value = ''
  day.value = ''
  reminder.value = ''
  importance.value = '⭐️'
  note.value = ''
  description.value = ''

  emit('close') // ✅ 다짐 저장 후 팝업 닫기
}
const handleClose = () => {
  emit('close') // 부모에게 닫으라고 신호 보냄
}
</script>
