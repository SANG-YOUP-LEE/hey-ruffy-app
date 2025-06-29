<template>
  <div class="add-commitment">
    <CommitmentForm @submit="saveCommitment" />
    <p v-if="message" class="message">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import CommitmentForm from '../components/CommitmentForm.vue'

const message = ref('')
const error = ref('')

const saveCommitment = async (data) => {
  message.value = ''
  error.value = ''
  try {
    await addDoc(collection(db, 'commitments'), {
      ...data,
      createdAt: serverTimestamp()
    })
    message.value = '다짐이 저장되었습니다!'
  } catch (err) {
    console.error('저장 오류:', err)
    error.value = '저장 중 문제가 발생했습니다.'
  }
}
</script>

