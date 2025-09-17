<template>
  <div class="admin_wrap">
    <h1>캡션 관리</h1>
    <div class="controls">
      <input type="date" v-model="dateKey" />
      <button @click="toToday">오늘</button>
      <button :disabled="loading" @click="loadDoc">불러오기</button>
      <button :disabled="saving" class="primary" @click="saveDoc">저장</button>
    </div>
    <textarea v-model="raw" placeholder="한 줄에 한 문구씩 입력"></textarea>
    <div class="preview">
      <h2>미리보기 ({{ lines.length }}줄)</h2>
      <ul>
        <li v-for="(l,i) in lines" :key="i">{{ l }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '@/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { todayKey as tk } from '@/utils/date'

const dateKey = ref(tk())
const raw = ref('')
const loading = ref(false)
const saving = ref(false)

const lines = computed(() =>
  raw.value.split('\n').map(s => s.trim()).filter(Boolean)
)

const loadDoc = async () => {
  loading.value = true
  try {
    const snap = await getDoc(doc(db, 'dailyCaptions', dateKey.value))
    raw.value = snap.exists() ? (snap.data()?.lines ?? []).join('\n') : ''
  } finally {
    loading.value = false
  }
}

const saveDoc = async () => {
  saving.value = true
  try {
    await setDoc(
      doc(db, 'dailyCaptions', dateKey.value),
      { lines: lines.value, updatedAt: serverTimestamp() },
      { merge: true }
    )
  } finally {
    saving.value = false
  }
}

const toToday = () => {
  dateKey.value = tk()
  loadDoc()
}

onMounted(loadDoc)
</script>

<style scoped>
.admin_wrap { padding: 1rem; display: grid; gap: 1rem; }
.controls { display: flex; gap: .5rem; align-items: center; }
textarea { width: 100%; min-height: 200px; padding: .75rem; box-sizing: border-box; border: 1px solid #ddd; border-radius: .5rem; font-size: .95rem; line-height: 1.5; }
button { padding: .5rem .9rem; border: 1px solid #ddd; background: #fff; border-radius: .5rem; }
button.primary { background: #111; color: #fff; border-color: #111; }
.preview ul { margin: .5rem 0 0; padding-left: 1rem; }
</style>
