<template>
  <div id="main_wrap">
    <HeaderView @toggle-lnb="showLnb = !showLnb" />
    <LnbView v-if="showLnb" @close-lnb="showLnb = false" />

    <div id="main_body">
      <MainDateScroll @selectDate="handleSelectDate" />
      <MainRoutineTotal
        :isFuture="isFutureDate"
        v-model:modelValue="selectedFilter"
        :counts="countsForDate"
        :totalCount="totalCountForDate"
        @changeFilter="handleFilterChange"
        @showWeekly="showWeekly = true"
      />

      <!-- ✅ 로딩/없음 분기만 교체 (디자인 유지) -->
      <!-- 로딩 중에는 스켈레톤 -->
      <div v-if="isLoading && !showWeekly" class="skeleton-wrap">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>

      <!-- 스냅샷 도착 후에만 ‘없어요’ 판단 -->
      <div
        v-else-if="!showWeekly && hasFetched && displayedRoutines.length === 0"
        class="no_data"
      >
        <span v-if="rawRoutines.length === 0">
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
          @togglePause="onTogglePause"
        />
      </template>
    </div>

    <FooterView @refresh-main="refreshMain" />

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
import { normalize, isActive as isActiveRule, isDue } from '@/utils/recurrence'

const isLoading = ref(true)      // ✅ 첫 구독 로딩상태
const hasFetched = ref(false)    // ✅ 최소 1번 스냅샷 받았는지
const isAddRoutineOpen = ref(false)
const showLnb = ref(false)

const selectedDate = ref(new Date())
const isFutureDate = ref(false)
const selectedFilter = ref('notdone')
const showWeekly = ref(false)

const rawRoutines = ref([])
const routines = ref([])
let currentUid = null

let editingRoutine = ref(null)

function dateKey(date, tz = 'Asia/Seoul') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date)
}

function getYMDFromAny(v) {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  if (v instanceof Date) return dateKey(v)
  if (typeof v.toDate === 'function') return dateKey(v.toDate())
  return null
}

function inDateRange(r, date) {
  const ymd = dateKey(date)
  const startISO = r.start || getYMDFromAny(r.startDate || r.period?.start)
  const endISO   = r.end   || getYMDFromAny(r.endDate   || r.period?.end)
  const rule     = r.rule || { freq: 'daily', interval: 1, anchor: startISO } // ✅ 가드
  const anchor   = rule.anchor || startISO

  return (
    isActiveRule(ymd, startISO, endISO) &&
    isDue(ymd, rule, anchor)
  )
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

const inRangeRoutinesForDate = computed(() =>
  rawRoutines.value.filter(r => inDateRange(r, selectedDate.value))
)

const pausedRoutinesForDate = computed(() =>
  inRangeRoutinesForDate.value.filter(r => !!r.isPaused)
)
const activeNonPausedForDate = computed(() =>
  inRangeRoutinesForDate.value.filter(r => !r.isPaused)
)

const activeWithStatus = computed(() =>
  mapStatus(activeNonPausedForDate.value, selectedDate.value)
)
const pausedWithStatus = computed(() =>
  mapStatus(pausedRoutinesForDate.value, selectedDate.value)
)

watch([selectedDate, rawRoutines], () => {
  routines.value = [...activeWithStatus.value, ...pausedWithStatus.value]
}, { immediate: true })

const countsForDate = computed(() => {
  const c = { notdone: 0, done: 0, faildone: 0, ignored: 0 }
  for (const r of activeWithStatus.value) {
    const s = getStatus(r)
    if (s === 'done') c.done++
    else if (s === 'faildone' || s === 'fail') c.faildone++
    else if (s === 'ignored' || s === 'skip') c.ignored++
    else c.notdone++
  }
  return c
})
const totalCountForDate = computed(() => activeWithStatus.value.length)

const displayedRoutines = computed(() => {
  if (showWeekly.value) return routines.value
  const activeFiltered = activeWithStatus.value.filter(r => getStatus(r) === selectedFilter.value)
  return [...activeFiltered, ...pausedWithStatus.value]
})

const handleSelectDate = (date, isFuture) => {
  selectedDate.value = date
  isFutureDate.value = isFuture
  selectedFilter.value = 'notdone'
  showWeekly.value = false
}

const handleFilterChange = () => {
  showWeekly.value = false
}

function onSaved(rt) {
  const norm = normalize(rt) // ✅ 정규화
  const idx = rawRoutines.value.findIndex(r => r.id === rt.id)
  if (idx === -1) {
    rawRoutines.value = [{ ...norm }, ...rawRoutines.value]
  } else {
    rawRoutines.value.splice(idx, 1, { ...rawRoutines.value[idx], ...norm })
  }
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
  const j = rawRoutines.value.findIndex(r => r.id === id)
  if (j !== -1) {
    const next = { ...rawRoutines.value[j] }
    next.progress = { ...(next.progress || {}), [key]: status }
    rawRoutines.value.splice(j, 1, next)
  }
  selectedFilter.value = status
  showWeekly.value = false
}

async function onTogglePause({ id, isPaused }) {
  if (!currentUid || !id) return
  try {
    await updateDoc(doc(db, 'users', currentUid, 'routines', id), {
      isPaused: !!isPaused,
      updatedAt: serverTimestamp(),
    })
  } catch (e) {
    console.error('toggle pause failed:', e)
    return
  }
  const j = rawRoutines.value.findIndex(r => r.id === id)
  if (j !== -1) {
    const next = { ...rawRoutines.value[j], isPaused: !!isPaused }
    rawRoutines.value.splice(j, 1, next)
  }
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

function refreshMain() {
  window.location.reload()
}

let stopAuth = null
let stopRoutines = null

const bindRoutines = (uid) => {
  if (stopRoutines) {
    stopRoutines();
    stopRoutines = null;
  }

  isLoading.value = true;   // ✅ 시작 시 로딩 ON
  hasFetched.value = false; // ✅ 초기화

  const q = query(
    collection(db, 'users', uid, 'routines'),
    orderBy('createdAt', 'desc')
  );

  stopRoutines = onSnapshot(
    q,
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...normalize(d.data()) }));

      console.log('[routines] count:', list.length);
      list.forEach((r) => {
        console.log('▶', r.title, 'start:', r.start, 'end:', r.end, 'rule:', r.rule);
      });

      rawRoutines.value = list;
      isLoading.value = false; // ✅ 데이터 도착 → 로딩 OFF
      hasFetched.value = true; // ✅ 첫 스냅샷 수신
    },
    (err) => {
      console.error('routines subscription error:', err);
      rawRoutines.value = [];
      isLoading.value = false; // ✅ 에러 시 로딩 OFF
      hasFetched.value = true; // ✅ 에러여도 판정 가능
    }
  );
};

watch(selectedDate, () => {
  routines.value = [...activeWithStatus.value, ...pausedWithStatus.value]
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
      if (stopRoutines) { stopRoutines(); stopRoutines = null }
      isLoading.value = false
      hasFetched.value = true
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setVh)
  if (stopAuth) stopAuth()
  if (stopRoutines) stopRoutines()
})
</script>
