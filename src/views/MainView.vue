<template>
  <div id="main_wrap">
    <HeaderView @toggle-lnb="showLnb = !showLnb" />
    <LnbView v-if="showLnb" @close-lnb="showLnb = false" />

    <div id="main_body">
      <MainDateScroll @selectDate="handleSelectDate" />
      <MainRoutineTotal
        :isFuture="isFutureDate"
        v-model:modelValue="selectedFilter"
        @changeFilter="handleFilterChange"
        @showWeekly="showWeekly = true"
      />

      <div
        v-if="!showWeekly && displayedRoutines.length === 0 && !(selectedFilter === 'notdone' && routines.length > 0 && notdoneCount === 0)"
        class="no_data"
      >
        <span v-if="routines.length === 0">
          아직 지켜야할 다짐이 없어요.<br />오른쪽 하단 +버튼을 눌러 다짐을 추가해 볼까요?
        </span>
        <span v-else>
          해당 조건에 맞는 다짐이 없어요.
        </span>
      </div>

      <MainCard v-if="showWeekly" :selected="'weekly'" :routine="{}" />
      <template v-else>
        <MainCard
          v-for="rt in displayedRoutines"
          :key="rt.id"
          :selected="getStatus(rt)"
          :routine="rt"
          @changeStatus="onChangeStatus"
          @delete="onDelete"
          @edit="openEditRoutine"
        />
      </template>
    </div>

    <FooterView />

    <button @click="openAddRoutine" class="add">
      <span>다짐 추가하기</span>
    </button>

    <AddRoutineSelector
      v-if="isAddRoutineOpen"
      @close="isAddRoutineOpen = false; editingRoutine = null"
      @save="onSaved"
      :routineToEdit="editingRoutine"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { db } from '@/firebase'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'
import MainDateScroll from '@/components/MainCard/MainDateScroll.vue'
import MainRoutineTotal from '@/components/MainCard/MainRoutineTotal.vue'
import MainCard from '@/components/MainCard/MainCard.vue'

const isAddRoutineOpen = ref(false)
const showLnb = ref(false)

const selectedDate = ref(new Date())
const isFutureDate = ref(false)
const selectedFilter = ref('notdone')
const showWeekly = ref(false)

const routines = ref([])
const rawRoutines = ref([])
let currentUid = null

let editingRoutine = ref(null)

function dateKey(date, tz = 'Asia/Seoul') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date)
}

function mapStatus(list, date) {
  const key = dateKey(date)
  return list.map(r => {
    const st = r?.progress?.[key] ?? 'notdone'
    return { ...r, status: st }
  })
}

function getStatus(r) {
  return r?.status || 'notdone'
}

const notdoneCount = computed(
  () => routines.value.filter(r => getStatus(r) === 'notdone').length
)

const displayedRoutines = computed(() => {
  if (showWeekly.value) return routines.value
  return routines.value.filter(r => getStatus(r) === selectedFilter.value)
})

const handleSelectDate = (date, isFuture) => {
  selectedDate.value = date
  isFutureDate.value = isFuture
}

const handleFilterChange = () => {
  showWeekly.value = false
}

function onSaved(rt) {
  const idx = rawRoutines.value.findIndex(r => r.id === rt.id)
  if (idx === -1) {
    rawRoutines.value = [{ ...rt }, ...rawRoutines.value]
  } else {
    rawRoutines.value.splice(idx, 1, { ...rawRoutines.value[idx], ...rt })
  }
  routines.value = mapStatus(rawRoutines.value, selectedDate.value)
  isAddRoutineOpen.value = false
  editingRoutine.value = null
  selectedFilter.value = 'notdone'
  showWeekly.value = false
}

async function onChangeStatus({ id, status }) {
  const key = dateKey(selectedDate.value)
  if (!currentUid) return
  try {
    await updateDoc(doc(db, 'users', currentUid, 'routines', id), {
      [`progress.${key}`]: status,
      updatedAt: serverTimestamp(),
    })
  } catch (e) {
    console.error('update status failed:', e)
  }
  const i = routines.value.findIndex(r => r.id === id)
  if (i !== -1) {
    routines.value[i] = { ...routines.value[i], status }
  }
  const j = rawRoutines.value.findIndex(r => r.id === id)
  if (j !== -1) {
    const next = { ...rawRoutines.value[j] }
    next.progress = { ...(next.progress || {}), [key]: status }
    rawRoutines.value.splice(j, 1, next)
  }
  selectedFilter.value = status
  showWeekly.value = false
}

async function onDelete(id) {
  if (!currentUid) return
  try {
    await deleteDoc(doc(db, 'users', currentUid, 'routines', id))
  } catch (e) {
    console.error('delete routine failed:', e)
    return
  }
  rawRoutines.value = rawRoutines.value.filter(r => r.id !== id)
  routines.value = routines.value.filter(r => r.id !== id)
}

function openAddRoutine() {
  window.dispatchEvent(new Event('close-other-popups'))
  editingRoutine.value = null
  isAddRoutineOpen.value = true
}

function openEditRoutine(rt) {
  window.dispatchEvent(new Event('close-other-popups'))
  editingRoutine.value = rt
  isAddRoutineOpen.value = true
}

function setVh() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

let stopAuth = null
let stopRoutines = null

const bindRoutines = (uid) => {
  if (stopRoutines) { stopRoutines(); stopRoutines = null }
  const q = query(
    collection(db, 'users', uid, 'routines'),
    orderBy('createdAt', 'desc')
  )
  stopRoutines = onSnapshot(q, (snap) => {
    const list = []
    snap.forEach(d => list.push({ id: d.id, ...d.data() }))
    rawRoutines.value = list
    routines.value = mapStatus(rawRoutines.value, selectedDate.value)
  }, (err) => {
    console.error('routines subscription error:', err)
    rawRoutines.value = []
    routines.value = []
  })
}

watch(selectedDate, () => {
  routines.value = mapStatus(rawRoutines.value, selectedDate.value)
})

onMounted(() => {
  setVh()
  window.addEventListener('resize', setVh)
  const auth = getAuth()
  stopAuth = onAuthStateChanged(auth, (user) => {
    if (user && user.uid !== currentUid) {
      currentUid = user.uid
      bindRoutines(currentUid)
    } else if (!user) {
      currentUid = null
      rawRoutines.value = []
      routines.value = []
      if (stopRoutines) { stopRoutines(); stopRoutines = null }
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setVh)
  if (stopAuth) stopAuth()
  if (stopRoutines) stopRoutines()
})
</script>
