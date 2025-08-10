<template>
  <div id="main_wrap">
    <HeaderView @toggle-lnb="showLnb = !showLnb" />
    <LnbView v-if="showLnb" @close-lnb="showLnb = false" />

    <div id="main_body">
      <div v-if="displayedRoutines.length === 0" class="no_data">
        <span v-if="routines.length === 0">
          아직 지켜야할 다짐이 없어요.<br />오른쪽 하단 +버튼을 눌러 다짐을 추가해 볼까요?
        </span>
        <span v-else>
          해당 조건에 맞는 다짐이 없어요.
        </span>
      </div>

      <template v-else>
        <MainDateScroll @selectDate="handleSelectDate" />
        <MainRoutineTotal
          :isFuture="isFutureDate"
          v-model:modelValue="selectedFilter"
          @changeFilter="handleFilterChange"
          @showWeekly="showWeekly = true"
        />

        <div
          v-if="selectedFilter === 'notdone' && notdoneCount === 0 && routines.length > 0"
          class="all_clear"
        >
          짝짝짝! 모든 달성을 완료했어요.
        </div>

        <MainCard
          v-if="showWeekly"
          :selected="'weekly'"
          :routine="{}"
        />

        <template v-else>
          <MainCard
            v-for="rt in displayedRoutines"
            :key="rt.id"
            :selected="getStatus(rt)"
            :routine="rt"
            @changeStatus="onChangeStatus"
            @delete="onDelete"
            @edit="onEdit"
          />
        </template>
      </template>
    </div>

    <FooterView />

    <button @click="openAddRoutine" class="add">
      <span>다짐 추가하기</span>
    </button>

    <AddRoutineSelector
      v-if="isAddRoutineOpen"
      :routineToEdit="editingRoutine"
      @close="() => { isAddRoutineOpen = false; editingRoutine = null }"
      @save="onSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { db } from '@/firebase'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'

import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'
import MainDateScroll from '@/components/MainCard/MainDateScroll.vue'
import MainRoutineTotal from '@/components/MainCard/MainRoutineTotal.vue'
import MainCard from '@/components/MainCard/MainCard.vue'

const isAddRoutineOpen = ref(false)
const editingRoutine = ref(null)
const showLnb = ref(false)

const selectedDate = ref(new Date())
const isFutureDate = ref(false)
const selectedFilter = ref('notdone')
const showWeekly = ref(false)

const routines = ref([])

function getStatus(r) {
  // 서버에 status가 없으면 기본값을 notdone으로 취급
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

// 저장 팝업에서 올라온 데이터(낙관적 반영). 실시간 스냅샷이 들어오면 동일 id는 덮어씀.
function onSaved(rt) {
  const i = routines.value.findIndex(r => r.id === rt.id)
  if (i === -1) {
    routines.value.unshift({ ...rt, status: getStatus(rt) })
  } else {
    routines.value[i] = { ...routines.value[i], ...rt }
  }
  isAddRoutineOpen.value = false
  editingRoutine.value = null
  showWeekly.value = false
}

async function onChangeStatus({ id, status }) {
  const i = routines.value.findIndex(r => r.id === id)
  if (i === -1) return

  // 로컬 먼저 반영
  routines.value[i] = { ...routines.value[i], status }

  // 미달성 탭에서는 카드만 사라지게, 필터는 유지
  showWeekly.value = false

  // Firestore 반영
  try {
    if (!currentUid) throw new Error('no-auth')
    await updateDoc(doc(db, 'users', currentUid, 'routines', id), { status })
  } catch (e) {
    console.error('status update failed:', e)
  }
}

async function onDelete(id) {
  // 낙관적 UI
  const backup = routines.value.slice()
  routines.value = routines.value.filter(r => r.id !== id)

  try {
    if (!currentUid) throw new Error('no-auth')
    await deleteDoc(doc(db, 'users', currentUid, 'routines', id))
  } catch (e) {
    console.error('delete failed:', e)
    // 실패 시 롤백 (원하면 토스트만 띄우고 스냅샷 동기화에 맡겨도 됨)
    routines.value = backup
  }
}

function onEdit(rt) {
  window.dispatchEvent(new Event('close-other-popups'))
  editingRoutine.value = rt
  isAddRoutineOpen.value = true
}

function openAddRoutine() {
  window.dispatchEvent(new Event('close-other-popups'))
  editingRoutine.value = null
  isAddRoutineOpen.value = true
}

function setVh() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

/* ---------- Firestore 실시간 구독 (users/{uid}/routines) ---------- */
let stopAuth = null
let stopRoutines = null
let currentUid = null

const bindRoutines = (uid) => {
  if (stopRoutines) { stopRoutines(); stopRoutines = null }

  const q = query(
    collection(db, 'users', uid, 'routines'),
    orderBy('createdAt', 'desc')
  )

  stopRoutines = onSnapshot(q, (snap) => {
    const list = []
    snap.forEach(d => list.push({ id: d.id, ...d.data() }))
    routines.value = list
  }, (err) => {
    console.error('routines subscription error:', err)
    routines.value = []
  })
}

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
