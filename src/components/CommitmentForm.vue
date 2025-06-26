<template>
  <form @submit.prevent="handleSubmit" class="commitment-form">
    <h2>✍️ 새 다짐 추가</h2>
    <p class="guide">
      작은 것부터 시작해봐.<br />
      다짐을 이루면 날 꼭 쓰다듬어줘야 해.<br />
      러피의 꿀잠은 너한테 달린 거, 알지?
    </p>

    <label>이루고 싶은 다짐이 뭐야?</label>
    <input v-model="title" type="text" placeholder="ex) 하루에 세번씩 웃기" required />

    <label>다짐 주기를 정해줄래?</label>
    <div class="frequency-options">
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

    <label>알람해줘?</label>
    <input v-model="reminder" type="text" placeholder="ex) 하루 전 오전 10:30분" />

    <label>얼마나 중요한 거야?</label>
    <select v-model="importance">
      <option value="⭐️">⭐️ (중요)</option>
      <option value="🌟">🌟 (매우 중요)</option>
    </select>

    <label>메모할 거 있어?</label>
    <textarea v-model="note" placeholder="이것만 지켜도 행복해질 수 있어!"></textarea>

    <button type="submit">다짐 저장하기</button>
  </form>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['submit'])

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
}
</script>

<style scoped>
.commitment-form {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1.5rem;
  background: #fffefc;
  border-radius: 10px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 14px;
}
h2 {
  font-size: 20px;
  margin-bottom: 0.5rem;
}
.guide {
  font-size: 13px;
  line-height: 1.4;
  color: #666;
}
input,
textarea,
select {
  width: 100%;
  padding: 8px;
  font-size: 14px;
  border-radius: 6px;
  border: 1px solid #ccc;
}
.frequency-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
button {
  background-color: peachpuff;
  padding: 10px;
  font-weight: bold;
  font-size: 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
