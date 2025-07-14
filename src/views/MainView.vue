<template>
  <div class="v_container">
    <Header @toggle-lnb="isLnbOpen = !isLnbOpen" @toggle-calendar="showCalendar = !showCalendar" />
    <Lnb v-if="isLnbOpen" @close="isLnbOpen = false" />
    <div class="main_wrap">
      <div class="main_inner">
        <Calendar :visible="showCalendar" />

        <div v-for="routine in routines" :key="routine.id" class="form_box_g main">
          <div class="routine_card">
            <div class="com_btn">
              <a href="#none" @click.prevent="toggleSetting(routine.id)">
                <img src="https://img.icons8.com/?size=100&id=6N9JHPf2dwXP&format=png&color=000000">
                <span>설정변경하기</span>
              </a>
            </div>
            <div class="left">
              <em>{{ routine.title }}</em>
              <p class="coment">{{ routine.comment }}</p>

              <div class="detail_box">
                <p class="done_icon" v-if="!selectedStatusMap[routine.id]">
                  <span class="icon temp">
                    <img src="https://img.icons8.com/?size=100&id=SIvUzMn4cgQ6&format=png&color=000000">
                  </span>
                  <a href="#none" @click.prevent="openStatusPopup(routine.id)">오늘의 다짐은 어땠나요?</a>
                </p>
                <p class="done_icon green" v-if="selectedStatusMap[routine.id] === '1'">
                  <span class="icon temp">
                    <img src="https://img.icons8.com/?size=100&id=PEmFcgjhBgKF&format=png&color=000000">
                  </span> <strong>다짐 성공!</strong>
                </p>
                <p class="done_icon pink" v-if="selectedStatusMap[routine.id] === '2'">
                  <span class="icon temp">
                    <img src="https://img.icons8.com/?size=100&id=Rish2KK6aiTD&format=png&color=000000">
                  </span> <strong>다짐 실패</strong>
                </p>
                <p class="done_icon gray" v-if="selectedStatusMap[routine.id] === '3'">
                  <span class="icon temp">
                    <img src="https://img.icons8.com/?size=100&id=9VG6Oa5PC1pt&format=png&color=000000">
                  </span> <strong>흐린 눈</strong>
                </p>
                <p><span class="icon temp"><img src="https://img.icons8.com/?size=100&id=73785&format=png&color=000000"></span> {{ routine.startDate }} 부터</p>
                <p><span class="icon temp"><img src="https://img.icons8.com/?size=100&id=vwGXRtPWrZSn&format=png&color=000000"></span> {{ routine.frequencyType }}</p>
                <p><span class="icon temp"><img src="https://img.icons8.com/?size=100&id=54481&format=png&color=000000"></span> {{ routine.time }}</p>
                <p><span :class="['icon', 'temp', routine.color]"></span> 이정도 중요해요</p>
              </div>
            </div>
            <div class="right">
              <div class="walking">
                <p class="step01"></p>
                <p class="speech-bubble"><span>나도 산책 가고 싶당...</span></p>
                <a href="#none" class="step" @click.prevent="toggleRuffy(routine.id)">
                  {{ ruffyOpenMap[routine.id] ? '러피 상태 닫기' : '러피 상태 열기' }}
                </a>
              </div>
            </div>
          </div>

          <div class="done_check" v-if="ruffyOpenMap[routine.id]">
            <div class="ruffy_step">
              <div class="walking">
                <p class="step01"><span>step <em>1</em></span></p>
                <p class="step02"><span>step <em>2</em></span></p>
                <p class="step03"><span>step <em>3</em></span></p>
                <p class="step04"><span>step <em>4</em></span></p>
                <p class="step05"><span>step <em>5</em></span></p>
              </div>
            </div>
          </div>

          <button v-if="!selectedStatusMap[routine.id]" @click.prevent="openStatusPopup(routine.id)" class="wbtn">
            오늘의 다짐 현황 선택
          </button>

          <div class="setting" v-if="openedSettingId === routine.id">
            <button class="close_btn" @click="openedSettingId = null"><span>팝업 닫기</span></button>
            <a href="#none"><img src="https://img.icons8.com/?size=100&id=gDy5dpa1NZQj&format=png&color=000000"> 다짐 수정하기</a>
            <a href="#none" @click.prevent="isPaused ? openPopup('rut_restart') : openPopup('rut_stop')">
              <img src="https://img.icons8.com/?size=100&id=JsKfjywDmtY0&format=png&color=000000">
              {{ isPaused ? '다짐 다시 시작하기' : '다짐 잠시 멈추기' }}
            </a>
            <a href="#none" @click.prevent="openPopup('rut_share')"><img src="https://img.icons8.com/?size=100&id=90278&format=png&color=000000"> 다짐 공유하기</a>
            <a href="#none" @click.prevent="openPopup('rut_del')"><img src="https://img.icons8.com/?size=100&id=KPhFC2OwpbWV&format=png&color=000000"> 다짐 삭제 하기</a>
          </div>
        </div>
      </div>
    </div>

    <Footer />
    <button class="add_rout" @click="isAddRoutineOpen = true">
      <img src="https://img.icons8.com/?size=100&id=11255&format=png&color=000000">
      <span>다짐 추가하기</span>
    </button>
    <AddRoutineSelector
      v-if="isAddRoutineOpen"
      @close="isAddRoutineOpen = false"
      @refresh="() => currentUserUid && fetchRoutines(currentUserUid)"
    />

    <div class="popup_overlay" v-if="activePopupId === 'rut_status'">
      <div class="popup_box" id="rut_status">
        <button class="close_btn" @click="closePopup"><span>팝업 닫기</span></button>
        <div class="done_check_pop">
          <h2>오늘의 다짐은 어땠나요?</h2>
          <div class="check_wrap">
            <label class="pretty-radio-block">
              <input type="radio" name="rut_status" value="1" v-model="selectedStatusTemp" />
              <span class="radio-style"></span> 달성
            </label>
            <label class="pretty-radio-block">
              <input type="radio" name="rut_status" value="2" v-model="selectedStatusTemp" />
              <span class="radio-style"></span> 미달성
            </label>
            <label class="pretty-radio-block">
              <input type="radio" name="rut_status" value="3" v-model="selectedStatusTemp" />
              <span class="radio-style"></span> 흐린 눈
            </label>
          </div>
          <button class="pop_btm" @click="saveRoutineStatus">
            {{ selectedStatusTemp ? '다짐 현황 저장' : '다짐 현황을 선택해주세요.' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePopup } from '@/assets/js/usePopup.js'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { auth, db } from '@/firebase'

import Header from '@/components/common/Header.vue'
import Footer from '@/components/common/Footer.vue'
import Lnb from '@/components/common/Lnb.vue'
import AddRoutineSelector from '@/components/AddRoutineSelector.vue'
import Calendar from '@/components/common/Calendar.vue'

const isLnbOpen = ref(false)
const showCalendar = ref(false)
const isRuffyOpen = ref(false)
const isAddRoutineOpen = ref(false)

const routines = ref([])
const selectedStatusMap = ref({})
const selectedStatusTemp = ref(null)
const currentRoutineId = ref(null)
const currentUserUid = ref(null)

const {
  activePopupId,
  isSettingOpen,
  isPaused,
  openPopup,
  closePopup,
  pauseCommitment,
  resumeCommitment
} = usePopup()

function openStatusPopup(routineId) {
  currentRoutineId.value = routineId
  selectedStatusTemp.value = selectedStatusMap.value[routineId] || null
  openPopup('rut_status')
}

function saveRoutineStatus() {
  if (selectedStatusTemp.value && currentRoutineId.value) {
    selectedStatusMap.value[currentRoutineId.value] = selectedStatusTemp.value
    closePopup()
  }
}

const fetchRoutines = async (uid) => {
  if (!uid) return
  try {
    const q = query(
  collection(db, 'routines'),
  where('userId', '==', uid),
  orderBy('createdAt', 'desc') 
    )
    const querySnapshot = await getDocs(q)

    routines.value = querySnapshot.docs.map(doc => {
      const data = doc.data()
      console.log('🔥 다짐 데이터:', data) // ← 이 줄 추가!
      return {
        id: doc.id,
        ...data
      }
    })
  } catch (error) {
    console.error('다짐 불러오기 실패:', error)
  }
}

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUserUid.value = user.uid
      fetchRoutines(user.uid)
    }
  })
})

const openedSettingId = ref(null)
const toggleSetting = (id) => {
  openedSettingId.value = openedSettingId.value === id ? null : id
}

const ruffyOpenMap = ref({})
const toggleRuffy = (routineId) => {
  ruffyOpenMap.value[routineId] = !ruffyOpenMap.value[routineId]
}
</script>
