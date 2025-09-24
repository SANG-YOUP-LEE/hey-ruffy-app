<template>
  <div class="page_wrap">
    <!-- LNB -->
    <SlidePanel :show="route.path === '/lnb'" @close="router.replace('/main')">
      <LnbView @close="router.replace('/main')" />
    </SlidePanel>

    <!-- AddRoutine -->
    <teleport to="body">
      <AddRoutineSelector
        v-if="openAdd"
        @close="closeAdd"
        @save="onSaved"
        :routineToEdit="editingRoutine"
      />
    </teleport>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, computed, ref, nextTick } from 'vue'
import { Capacitor } from '@capacitor/core'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import SlidePanel from '@/components/common/SlidePanel.vue'
import LnbView from '@/components/common/Lnb.vue'
import AddRoutineSelector from '@/views/AddRoutineSelector.vue'

import { iosMainView } from '@/utils/iosMainView'
import { useRoutinesStore } from '@/stores/routines'
import { useMainViewStore } from '@/stores/mainView'
import { useRoutineBinding } from '@/composables/useRoutineBinding'

const route = useRoute()
const router = useRouter()

const rStore = useRoutinesStore()
const mv = useMainViewStore()
const { selectedDate, editingRoutine } = storeToRefs(mv)
const { initBinding, refreshBinding } = useRoutineBinding(rStore, mv, () => {})

const IS_IOS = Capacitor.getPlatform?.() === 'ios'
let offNative

// AddRoutine 열림 여부
const openAdd = computed(() => route.query.add === '1')
function closeAdd () {
  router.replace({ path: '/main', query: {} })
  editingRoutine.value = null
}
async function onSaved () {
  router.replace({ path: '/main', query: {} })
  editingRoutine.value = null
  await refreshBinding()
  await iosMainView.update(toRenderModel())
}

// JS → 네이티브 렌더 모델
function toRenderModel () {
  const list = mv.displayedRoutines?.length ? mv.displayedRoutines : (rStore.items || [])
  return {
    v: 1,
    routines: (list || []).map((rt) => ({
      id: String(rt.id || '').split('-')[0],
      status: rt.status || 'notdone',
      isPaused: !!rt.isPaused,
      ui: {
        titleText: rt.title || '',
        repeatLabel: rt.repeatLabel || '',
        repeatDetail: rt.repeatDetail || rt.alarmText || '',
        periodText: rt.periodText || '',
        alarmText: rt.alarmText || '',
        commentText: rt.commentText || '',
        colorClass: rt.colorClass || 'yellow',
        ruffyName: rt.ruffyName || '',
        courseName: rt.courseName || '',
        goalCount: rt.goalCount || '',
      },
    })),
    footer: {
      style: 'solid',
      safePadding: true,
      buttons: [
        { id: 'home',  title: '홈',   icon: 'house', enabled: true },
        { id: 'walk',  title: '산책', icon: 'paw',   enabled: true },
        { id: 'feed',  title: '피드', icon: 'list',  enabled: true },
        { id: 'alarm', title: '알림', icon: 'bell',  enabled: true },
      ],
    },
  }
}

onMounted(async () => {
  if (!IS_IOS) return
  await initBinding()

  // ✅ 최초 진입시 데이터가 있을 때까지 기다렸다가 present 실행
  let stopWatch = null
  const tryPresent = async () => {
    await nextTick()
    await iosMainView.present(toRenderModel())
  }

  stopWatch = watch(
    [() => mv.displayedRoutines, () => rStore.items, () => rStore.hasFetched],
    async ([disp, items, fetched]) => {
      if ((disp?.length || items?.length) && fetched) {
        await tryPresent()
        stopWatch?.()
      }
    },
    { deep: true, immediate: true }
  )

  // 3초 초과시 강제로 실행 (네트워크 늦을 때 대비)
  setTimeout(async () => {
    if (await iosMainView.isPresented() === false) {
      await tryPresent()
    }
  }, 3000)

  // 네이티브 액션 → JS 처리
  offNative = iosMainView.onAction(async (type, payload) => {
    if (type === 'navigate') {
      const route = String(payload?.route || '')
      if (route === '/lnb') {
        router.replace('/lnb')
        return
      }
      if (route.startsWith('/main') && route.includes('add=1')) {
        window.dispatchEvent(new Event('close-other-popups'))
        editingRoutine.value = null
        router.replace({ path: '/main', query: { add: '1' } })
        return
      }
      router.replace(route || '/main')
      return
    }

    if (type === 'status') {
      rStore.changeStatus({
        id: payload?.rid,
        status: 'done',
        date: mv.dateKey(selectedDate.value),
      })
    } else if (type === 'edit') {
      const rt = rStore.items?.find(x => String(x.id).startsWith(payload?.rid))
      window.dispatchEvent(new Event('close-other-popups'))
      editingRoutine.value = rt || null
      router.replace({ path: '/main', query: { add: '1' } })
      return
    } else if (type === 'delete') {
      rStore.deleteRoutines([payload?.rid].filter(Boolean))
    } else if (type === 'pauseRestart') {
      rStore.togglePause({ id: payload?.rid, isPaused: !!payload?.isPaused })
    }

    if (type === 'footerTap') {
      const id = payload?.id
      if (id === 'home')  router.replace('/main')
      if (id === 'walk')  router.replace('/walk')
      if (id === 'feed')  router.replace('/feed')
      if (id === 'alarm') router.replace('/alarm')
    }

    await iosMainView.update(toRenderModel())
  })
  // store 변화 → 네이티브 갱신
  // store 변화 → 네이티브 갱신
  watch(
    [() => mv.displayedRoutines, () => rStore.items, () => rStore.selectedFilter, selectedDate],
    async () => { await iosMainView.update(toRenderModel()) },
    { deep: true }
  )
})

onBeforeUnmount(() => {
  if (!IS_IOS) return
  try { offNative?.() } catch {}
  iosMainView.dismiss()
})
</script>
