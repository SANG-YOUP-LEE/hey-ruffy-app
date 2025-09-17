<template>
  <div class="admin_wrap">
    <h1>캡션 관리</h1>

    <div class="who">
      <span>로그인 UID: {{ currentUid }}</span>
      <span :class="adminClient ? 'ok' : 'no'">{{ adminClient ? '관리자 권한' : '관리자 아님' }}</span>
      <span>프로젝트: {{ projectId }}</span>
    </div>

    <div class="controls">
      <input type="date" v-model="dateKey" />
      <button type="button" @click="toToday">오늘</button>
      <button type="button" :disabled="loading" @click="loadDoc">불러오기</button>
      <button type="button" :disabled="saving || !adminClient" class="primary" @click="saveDoc">저장</button>
    </div>

    <textarea v-model="raw" placeholder="한 줄에 한 문구씩 입력"></textarea>

    <div class="preview" v-if="lines.length">
      <h2>미리보기 ({{ lines.length }}줄)</h2>
      <ul>
        <li v-for="(l,i) in lines" :key="i">{{ l }}</li>
      </ul>
    </div>
    <p>내 UID: {{ currentUid }}</p>
    <p v-if="lastError" class="err">{{ lastError }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { db } from '@/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { todayKey as tk } from '@/utils/date'

const ADMIN_UIDS = ['qxPKKEcQkzfpChkSFFpxmdjg6WZ2','VvwFeUErupcYPut0UyV6LhtKp8G2']

const dateKey = ref(tk())
const raw = ref('')
const loading = ref(false)
const saving = ref(false)
const lastError = ref('')

const currentUid = computed(() => getAuth().currentUser?.uid || '')
const adminClient = computed(() => ADMIN_UIDS.includes(currentUid.value))
const projectId = import.meta.env?.VITE_FIREBASE_PROJECT_ID || ''

const lines = computed(() =>
  raw.value.split('\n').map(s => s.trim()).filter(Boolean)
)

async function loadDoc() {
  lastError.value = ''
  loading.value = true
  try {
    const snap = await getDoc(doc(db, 'dailyCaptions', dateKey.value))
    raw.value = snap.exists() ? (snap.data()?.lines ?? []).join('\n') : ''
    toast('불러왔어요.')
  } catch (e) {
    lastError.value = `불러오기 실패: ${e?.code || ''} ${e?.message || e}`
  } finally {
    loading.value = false
  }
}

async function saveDoc() {
  lastError.value = ''
  saving.value = true
  try {
    await setDoc(
      doc(db, 'dailyCaptions', dateKey.value),
      { lines: lines.value, updatedAt: serverTimestamp() },
      { merge: true }
    )
    toast('저장 완료!')
  } catch (e) {
    lastError.value = `저장 실패: ${e?.code || ''} ${e?.message || e}`
  } finally {
    saving.value = false
  }
}

function toToday() {
  dateKey.value = tk()
  loadDoc()
}

function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    saveDoc()
  }
}

function toast(msg) {
  const t = document.createElement('div')
  t.textContent = msg
  t.style.position = 'fixed'
  t.style.left = '50%'
  t.style.bottom = '20px'
  t.style.transform = 'translateX(-50%)'
  t.style.background = '#111'
  t.style.color = '#fff'
  t.style.padding = '8px 12px'
  t.style.borderRadius = '8px'
  t.style.fontSize = '14px'
  t.style.zIndex = 9999
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 1200)
}

onMounted(() => {
  loadDoc()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.admin_wrap { padding: 1rem; display: grid; gap: 1rem; }
.controls { display: flex; gap: .5rem; align-items: center; }
.who { display: flex; gap: .5rem; flex-wrap: wrap; font-size: .85rem; color: #555; }
.who .ok { color: #0a7; }
.who .no { color: #c30; }
textarea { width: 100%; min-height: 220px; padding: .75rem; box-sizing: border-box; border: 1px solid #ddd; border-radius: .5rem; font-size: .95rem; line-height: 1.5; }
button { padding: .5rem .9rem; border: 1px solid #ddd; background: #fff; border-radius: .5rem; }
button.primary { background: #111; color: #fff; border-color: #111; }
.preview ul { margin: .5rem 0 0; padding-left: 1rem; }
.err { color: #c30; font-size: .85rem; }
</style>
