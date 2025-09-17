<template>
  <div class="page_wrap" v-cloak>
    <HeaderView @toggle-lnb="showLnb = !showLnb" />

    <div id="main_wrap" :class="{ selecting: rStore.deleteMode }" ref="scrollEl" @scroll="update">
      <SlidePanel :show="panelOpen" @close="closePanel">
        <LnbView @close="closePanel" />
      </SlidePanel>

      <div class="main_scroll">
        <div v-show="hasFetched">
          <div v-show="!scrolledRef">
            <MainDateScroll :selectedDate="selectedDate" @selectDate="onSelectDate" />
            <MainRoutineTotal
              :key="rtResetKey"
              :isFuture="isFutureDate"
              :selectedDate="selectedDate"
              v-model:modelValue="rStore.selectedFilter"
              :counts="mv.headerCounts"
              :totalCount="mv.headerTotal"
              :periodMode="rStore.selectedPeriod"
              @requestPrev="onRequestPrev"
              @requestNext="onRequestNext"
              @changePeriod="onChangePeriod"
            />
          </div>

          <div class="sticky_head" v-show="scrolledRef">
            <div class="routine_total sum">
              <div class="total_area">
                <div class="date">
                  <p class="today">
                    <button class="prev" @click.prevent="onClickPrev"><span>{{ prevLabel }}</span></button>
                    <span class="y_m">{{ sumYear }}.{{ sumMonth }}.</span>
                    <em>{{ sumDay }}</em>
                    <button class="next" @click.prevent="onClickNext"><span>{{ nextLabel }}</span></button>
                  </p>
                </div>
                <div class="r_state">
                  <a href="#none" class="not_done" :class="{ on: rStore.selectedFilter==='notdone' }" @click.prevent="rStore.setFilter('notdone')">
                    <span>체크전 다짐</span><img :src="getFace('01')"><em>{{ (mv.headerCounts && mv.headerCounts.notdone) || 0 }}</em>
                  </a>
                  <a href="#none" class="done" :class="{ on: rStore.selectedFilter==='done' }" @click.prevent="rStore.setFilter('done')">
                    <span>달성완료</span><img :src="getFace('02')"><em>{{ (mv.headerCounts && mv.headerCounts.done) || 0 }}</em>
                  </a>
                  <a href="#none" class="fail" :class="{ on: rStore.selectedFilter==='faildone' || rStore.selectedFilter==='fail' }" @click.prevent="rStore.setFilter('faildone')">
                    <span>달성실패</span><img :src="getFace('03')"><em>{{ (mv.headerCounts && (mv.headerCounts.faildone ?? mv.headerCounts.fail)) || 0 }}</em>
                  </a>
                  <a href="#none" class="ignore" :class="{ on: rStore.selectedFilter==='ignored' || rStore.selectedFilter==='ign' }" @click.prevent="rStore.setFilter('ignored')">
                    <span>흐린눈</span><img :src="getFace('04')"><em>{{ (mv.headerCounts && (mv.headerCounts.ignored ?? mv.headerCounts.ign)) || 0 }}</em>
                  </a>
                </div>
              </div>
            </div>

            <div class="today_tools">
              <div class="today">
                <a href="#none" class="prev" @click.prevent="onClickPrev"><span>{{ prevLabel }}</span></a>
                <span class="term"></span> <em>{{ periodTitle }}</em>
                <a href="#none" class="next" @click.prevent="onClickNext"><span>{{ nextLabel }}</span></a>
              </div>
              <div class="tools">
                <a href="#none" class="r_card" :class="{ on: activeTool === 'card' }" @click.prevent="onChangeView('card')"><span>다짐카드보기</span></a>
                <a href="#none" class="r_list" :class="{ on: activeTool === 'list' }" @click.prevent="onChangeView('list')"><span>다짐목록보기</span></a>
                <a href="#none" class="r_carousel" :class="{ on: activeTool === 'carousel' }" @click.prevent="onChangeView('carousel')"><span>다짐캐러셀보기</span></a>
                <a href="#none" :class="[ localDelete ? 'r_del' : 'r_select', { on: activeTool === 'delete' } ]" @click.prevent="toggleDeleteMode"><span>{{ localDelete ? '삭제하기' : '다짐선택' }}</span></a>
              </div>
            </div>
          </div>

          <div class="today_tools" :class="{ sum: scrolledRef }">
            <div class="today">
              <a href="#none" class="prev" @click.prevent="onClickPrev"><span>{{ prevLabel }}</span></a>
              <span class="term"></span> <em>{{ periodTitle }}</em>
              <a href="#none" class="next" @click.prevent="onClickNext"><span>{{ nextLabel }}</span></a>
            </div>
            <div class="tools">
              <a href="#none" class="r_card" :class="{ on: activeTool === 'card' }" @click.prevent="onChangeView('card')"><span>다짐카드보기</span></a>
              <a href="#none" class="r_list" :class="{ on: activeTool === 'list' }" @click.prevent="onChangeView('list')"><span>다짐목록보기</span></a>
              <a href="#none" class="r_carousel" :class="{ on: activeTool === 'carousel' }" @click.prevent="onChangeView('carousel')"><span>다짐캐러셀보기</span></a>
              <a href="#none" :class="[ localDelete ? 'r_del' : 'r_select', { on: activeTool === 'delete' } ]" @click.prevent="toggleDeleteMode"><span>{{ localDelete ? '삭제하기' : '다짐선택' }}</span></a>
            </div>
          </div>

          <div v-if="isLoading" class="skeleton-wrap"><div class="skeleton-card"></div><div class="skeleton-card"></div></div>
          <div v-else-if="hasFetched && !filteredRoutines.length" class="no_data">
            <span v-if="!rStore.items?.length">아직 지켜야할 다짐이 없어요.<br />오른쪽 하단 +버튼을 눌러 다짐을 추가해 볼까요?</span>
            <span v-else>해당 조건에 맞는 다짐이 없어요.</span>
          </div>

          <!-- ✅ 네이티브 영역 (card/list 뷰 공용 host), 캐러셀일 땐 위에서 분기 -->
          <template v-else>
            <MainCardCarousel
              v-if="selectedView==='carousel'"
              :routines="filteredRoutines"
              :layout="ViewCardSet"
              :layout-variant="selectedView"
              :period-mode="rStore.selectedPeriod"
              :delete-targets="rStore.deleteTargets"
              :delete-mode="rStore.deleteMode"
              :period-start-raw="mv.periodStartRaw"
              @changeStatus="onChangeStatus"
              @delete="onDelete"
              @edit="openRoutine"
              @togglePause="onTogglePause"
              @toggleSelect="rStore.toggleSelect"
            />
            <div v-else class="native_routine_wrap">
              <div ref="stackHost" class="routine_stack_host"></div>
            </div>
          </template>
        </div>
      </div>

      <FooterView @refresh-main="refreshBinding" />
      <button @click="openRoutine()" class="add"><span>다짐 추가하기</span></button>
      <teleport to="body">
        <AddRoutineSelector
          v-if="isAddRoutineOpen"
          @close="isAddRoutineOpen=false; editingRoutine=null"
          @save="onSaved"
          :routineToEdit="editingRoutine"
        />
      </teleport>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, nextTick, watch, watchEffect, computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import AddRoutineSelector from '@/views/AddRoutineSelector.vue'
import HeaderView from '@/components/common/Header.vue'
import LnbView from '@/components/common/Lnb.vue'
import FooterView from '@/components/common/Footer.vue'
import MainDateScroll from '@/components/MainCard/MainDateScroll.vue'
import MainRoutineTotal from '@/components/MainCard/MainRoutineTotal.vue'
import MainCardCarousel from '@/components/MainCard/MainCardCarousel.vue'
import ViewCardSet from '@/components/MainCard/viewCardSet.vue'
import SlidePanel from '@/components/common/SlidePanel.vue'

import { useRoutinesStore } from '@/stores/routines'
import { useMainViewStore } from '@/stores/mainView'
import { useMainScroll } from '@/composables/useMainScroll'
import { useRoutineBinding } from '@/composables/useRoutineBinding'
import { useBulkDelete } from '@/composables/useBulkDelete'
import { useMainNavigation } from '@/composables/useMainNavigation'
import { useVH } from '@/composables/useVH'
import { useModalStore } from '@/stores/modal'
import { useAuthStore } from '@/stores/auth'

import {
  showNativeCardStack,
  resizeNativeCardStack,
  updateNativeCardItems,
  hideNativeCardStack
} from '@/utils/nativeCardStack'

import {
  showNativeRoutineList,
  resizeNativeRoutineList,
  updateNativeRoutineItems,
  hideNativeRoutineList,
  setNativeRoutineMode // 필요시 카드/아이콘 전환 모드에 사용
} from '@/utils/nativeList'

const route = useRoute()
const router = useRouter()

const rStore = useRoutinesStore()
const mv = useMainViewStore()
const modal = useModalStore()
const { isLoading, hasFetched, isAddRoutineOpen, showLnb, selectedDate, isFutureDate, selectedView, editingRoutine } = storeToRefs(mv)

const panelOpen = computed(() => showLnb.value || route.path === '/lnb')
function closePanel(){
  showLnb.value = false
  if (route.path === '/lnb') router.replace('/main')
}

const { isScrolled: scrolledRef, headerShort: headerShortRef, updateScrollState, scrollEl } = useMainScroll(rStore, mv)
const update = () => nextTick(updateScrollState)

const { initBinding, disposeBinding, refreshBinding } = useRoutineBinding(rStore, mv, update)
const { toggle: handleToggleDeleteMode } = useBulkDelete(rStore, mv)
const nav = useMainNavigation(rStore, mv, { scrolledRef, headerShortRef, update })

const rtResetKey = ref(0)
const resetGraph = () => { rtResetKey.value++ }

const filteredRoutines = computed(() => {
  const f = rStore.selectedFilter || 'notdone'
  return (mv.displayedRoutines || []).filter(rt => (rt?.status || 'notdone') === f)
})

const onSelectDate = (date, isFuture, isToday) => { resetGraph(); nav.selectDate(date, isFuture, isToday) }
const onRequestPrev = () => { resetGraph(); nav.navigate(-1) }
const onRequestNext = () => { resetGraph(); nav.navigate(1) }
const onChangePeriod = (mode) => { resetGraph(); nav.changePeriod(mode) }

async function onSaved(rt){
  isAddRoutineOpen.value = false
  editingRoutine.value = null
  rStore.setFilter('notdone')
  await refreshBinding()
  update()
}

async function onChangeStatus({ id, status }){ rStore.changeStatus({ id: String((typeof id==='string'?id:id?.id)).split('-')[0], status, date: mv.dateKey(selectedDate.value) }); rStore.setFilter(status); update() }
async function onTogglePause({ id, isPaused }){ rStore.togglePause({ id: String((typeof id==='string'?id:id?.id)).split('-')[0], isPaused }); update() }
async function onDelete(payload){ rStore.deleteRoutines((Array.isArray(payload)?payload:[payload]).map(v=>String((typeof v==='string'?v:v?.id)).split('-')[0])); update() }
function openRoutine(rt=null){ window.dispatchEvent(new Event('close-other-popups')); editingRoutine.value = rt; isAddRoutineOpen.value = true }

const sumDate = computed(() => new Date(selectedDate.value))
const sumYear = computed(() => String(sumDate.value.getFullYear()))
const sumMonth = computed(() => String(sumDate.value.getMonth() + 1).padStart(2, '0'))
const sumDay = computed(() => String(sumDate.value.getDate()).padStart(2, '0'))

const activeTool = computed(() => (rStore.deleteMode ? 'delete' : selectedView.value))
const localDelete = computed(() => rStore.deleteMode)
function onChangeView(view){
  if (selectedView.value !== view) nav.changeView(view)
  if (rStore.deleteMode) handleToggleDeleteMode(false)
}
function toggleDeleteMode(){ handleToggleDeleteMode(!rStore.deleteMode) }
function onClickPrev(){ onRequestPrev() }
function onClickNext(){ onRequestNext() }

const prevLabel = computed(() => rStore.selectedPeriod === 'W' ? '이전주' : rStore.selectedPeriod === 'M' ? '이전달' : '전날')
const nextLabel = computed(() => rStore.selectedPeriod === 'W' ? '다음주' : rStore.selectedPeriod === 'M' ? '다음달' : '다음날')
const periodTitle = computed(() => {
  const f = rStore.selectedFilter
  if (f === 'notdone') return '달성 체크 전'
  if (f === 'done') return '달성완료 다짐'
  if (f === 'faildone' || f === 'fail') return '달성실패 다짐'
  if (f === 'ignored' || f === 'ign') return '흐린눈 다짐'
  if (rStore.selectedPeriod === 'W') return '주간 다짐'
  if (rStore.selectedPeriod === 'M') return '월간 다짐'
  return '오늘의 다짐'
})

const auth = useAuthStore()
const images = import.meta.glob('@/assets/images/ruffy0{1,2,3,4}_face{01,02,03,04}.png', { eager: true, import: 'default' })
const ruffyBase = computed(() => {
  const opt = auth.profile?.selectedRuffy || 'option1'
  const num = String(opt).replace('option','')
  return `ruffy0${num}`
})
function getFace(n){
  return images[`/src/assets/images/${ruffyBase.value}_face${n}.png`]
}

const { initVH, disposeVH } = useVH()

const stackHost = ref(null)
let resizeHandler = null

// 공통: 뷰에 주입할 아이템 변환기
const toItems = (src) => src.map(m => ({
  id: m.id,
  title: m.title,
  subtitle: m.comment || '',
  // 필요 시 리스트 모드에서 쓰는 추가 필드들(아이콘/뱃지/시간 등)도 여기서 매핑
}))

// 현재 네이티브가 무엇이 떠있는지 추적
const mountedKind = ref(null) // 'card' | 'list' | null

function mountNative(kind) {
  if (!stackHost.value) return
  const items = toItems(filteredRoutines.value)
  if (kind === 'card') {
    showNativeCardStack(stackHost.value, items)
    mountedKind.value = 'card'
  } else if (kind === 'list') {
    showNativeRoutineList(stackHost.value, items)
    mountedKind.value = 'list'
  }
}

function resizeNative() {
  if (!stackHost.value) return
  if (mountedKind.value === 'card') resizeNativeCardStack(stackHost.value)
  else if (mountedKind.value === 'list') resizeNativeRoutineList(stackHost.value)
}

function updateNative(items) {
  if (mountedKind.value === 'card') updateNativeCardItems(items)
  else if (mountedKind.value === 'list') updateNativeRoutineItems(items)
}

function hideAllNative() {
  hideNativeCardStack()
  hideNativeRoutineList()
  mountedKind.value = null
}

onMounted(async () => {
  showLnb.value = false
  initVH()
  await initBinding()
  update()
  await nextTick()

  // 초기 선택된 뷰에 따라 네이티브 마운트
  if (stackHost.value && selectedView.value !== 'carousel') {
    mountNative(selectedView.value === 'card' ? 'card' : 'list')
    resizeNative()
  }

  resizeHandler = () => { if (stackHost.value && selectedView.value !== 'carousel') resizeNative() }
  window.addEventListener('resize', resizeHandler, { passive: true })
  window.addEventListener('scroll', resizeHandler, { passive: true })
})

onBeforeUnmount(() => {
  disposeVH()
  disposeBinding()
  hideAllNative()
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    window.removeEventListener('scroll', resizeHandler)
  }
})

watchEffect(() => {
  mv.setLoading(rStore.isLoading)
  mv.setFetched(rStore.hasFetched)
})

// 아이템 갱신 → 현재 떠 있는 네이티브에 반영
watch(filteredRoutines, v => {
  updateNative(toItems(v))
})

// 뷰 전환(card/list/carousel) 시 네이티브 전환
watch(selectedView, async v => {
  if (!stackHost.value) return
  if (v === 'carousel') {
    hideAllNative()
    return
  }
  const nextKind = v === 'card' ? 'card' : 'list'
  if (mountedKind.value !== nextKind) {
    hideAllNative()
    await nextTick()
    mountNative(nextKind)
    resizeNative()
  } else {
    // 같은 종류면 아이템/사이즈만 갱신
    updateNative(toItems(filteredRoutines.value))
    resizeNative()
  }
})
</script>

<style scoped>
.native_routine_wrap { position: relative; }
.routine_stack_host { width: 100%; min-height: 200px; }
</style>
