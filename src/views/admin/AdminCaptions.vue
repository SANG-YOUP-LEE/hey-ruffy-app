<!-- src/views/admin/AdminCaptions.vue -->
<template>
  <div class="admin_wrap">
    <h1>캡션 관리</h1>

    <div class="layout">
      <div class="editor">
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

        <p v-if="lastError" class="err">{{ lastError }}</p>
      </div>

      <aside class="recent">
        <div class="head">
          <strong>최근 문구</strong>
          <input type="text" v-model="q" placeholder="YYYY-MM-DD 검색" @keyup.enter="searchOne" />
        </div>
        <ul>
          <li v-for="d in recents" :key="d" :class="{ active: d===dateKey }">
            <button type="button" @click="openDate(d)">{{ d }}</button>
          </li>
        </ul>
        <button type="button" class="more" :disabled="!nextCursor" @click="loadMore">이전 30일</button>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { db } from '@/firebase'
import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, query, orderBy, limit, startAfter, getDocs, documentId
} from 'firebase/firestore'
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
    await refreshRecentHead() // 저장 후 리스트 갱신
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

/* 최근 문서 목록 */
const recents = ref([])
const nextCursor = ref('')
async function loadRecent(first = true) {
  const col = collection(db, 'dailyCaptions')
  const base = first
    ? query(col, orderBy(documentId(), 'desc'), limit(30))
    : query(col, orderBy(documentId(), 'desc'), startAfter(nextCursor.value), limit(30))
  const sn = await getDocs(base)
  const ids = sn.docs.map(d => d.id)
  if (first) recents.value = ids
  else recents.value = [...recents.value, ...ids]
  nextCursor.value = ids.length ? ids[ids.length - 1] : ''
}
async function refreshRecentHead() {
  await loadRecent(true)
}
async function loadMore() {
  if (!nextCursor.value) return
  await loadRecent(false)
}

function openDate(d) {
  dateKey.value = d
  loadDoc()
}

/* 간단 검색: 정확한 날짜 문서 열기 */
const q = ref('')
function searchOne() {
  if (!q.value) return
  dateKey.value = q.value
  loadDoc()
}

onMounted(async () => {
  await loadRecent(true)
  await loadDoc()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.admin_wrap { padding: 1rem; display: grid; gap: 1rem; }
.layout { display: grid; grid-template-columns: 1fr 260px; gap: 1rem; align-items: start; }
.editor .controls { display: flex; gap: .5rem; align-items: center; margin-bottom: .5rem; }
textarea { width: 100%; min-height: 220px; padding: .75rem; box-sizing: border-box; border: 1px solid #ddd; border-radius: .5rem; font-size: .95rem; line-height: 1.5; }
button { padding: .5rem .9rem; border: 1px solid #ddd; background: #fff; border-radius: .5rem; }
button.primary { background: #111; color: #fff; border-color: #111; }
.preview ul { margin: .5rem 0 0; padding-left: 1rem; }
.err { color: #c30; font-size: .85rem; }

.recent { border: 1px solid #eee; border-radius: .5rem; padding: .75rem; }
.recent .head { display: grid; gap: .5rem; margin-bottom: .5rem; }
.recent ul { list-style: none; padding: 0; margin: 0; max-height: 360px; overflow: auto; }
.recent li { margin: 0; }
.recent li.active button { font-weight: 700; text-decoration: underline; }
.recent li button { width: 100%; text-align: left; padding: .4rem .3rem; border: 0; background: transparent; }
.recent .more { width: 100%; margin-top: .5rem; }
@media (max-width: 800px) {
  .layout { grid-template-columns: 1fr; }
  .recent { order: -1; }
}
</style>
