<template>
	<div class="popup_wrap">
		<h2>{{ routineToEdit ? '다짐 수정하기' : '새 다짐 만들기' }}</h2>

		<div class="popup_inner">
			<!-- 다짐명 적기 -->
			<div class="form_box_g rt_make">
				<h3>다짐명을 적어주세요.</h3>
				<p>
					<label for="rt_name">새 다짐 명</label>
					<input type="text" v-model="routineData.title" placeholder="ex)외로워도 슬퍼도 탄수화물 끊기" />
				</p>
			</div>
			
      <!--다짐 주기 설정-->
			<div class="form_box_g rt_make day_box">
				<h3>얼마나 자주 지켜야해요?</h3>
				<p>
  <button id="v_detail01" @click="handleTabClick('daily')">일간</button>
  <button id="v_detail02" @click="handleTabClick('weekly')">주간</button>
  <button id="v_detail03" @click="handleTabClick('monthly')">월간</button>
</p>
				<!-- 일간 상세 -->
<div class="rt_make_detail" id="v_detail01_block">
  <div class="select_week">
    <InlineWheelPicker
  :items="repeatOptionsDaily"
  v-model="selectedRepeatDaily"
  :itemHeight="40"
  :resetKey="resetDailyKey"
/>
  </div>
</div>

<!-- 주간 상세 -->
<div class="rt_make_detail" id="v_detail02_block">
  <div class="select_week">
    <InlineWheelPicker
  :items="repeatOptionsWeekly"
  v-model="selectedRepeatWeekly"
  :itemHeight="40"
  :resetKey="resetWeeklyKey"
/>
  </div>
  <p class="check_btn">
    <button class="all" @click="routineData.days = ['일','월','화','수','목','금','토']">매일</button>
    <button
  v-for="d in ['일','월','화','수','목','금','토']"
      :key="d + 'w'"
      @click="toggleDay(d)"
      :class="{ on: routineData.days.includes(d) }"
    >
      {{ d }}
    </button>
  </p>
</div>

				<!-- 월간 상세 -->
				<div class="rt_make_detail" id="v_detail03_block">
					<div class="">
						<div class="monthly-grid">
							<span
								class="m_s_btn"
								v-for="day in 31"
								:key="day"
								@click="toggleDateSelection(day)"
								:class="{ selected: selectedDates.includes(day) }"
							>
								{{ day }}
							</span>
						</div>
					</div>
				</div>
			</div>

      <!-- 다짐 시작일 설정 -->
    <div class="form_box_g rt_make start_alarm_box">
      <h3>시작일과 알람도 지정할까요?</h3>

      <!-- 시작일 toggle -->
      <div>
        <label class="toggle-switch">
          <input type="checkbox" id="my_toggle" v-model="isStartDateOn" />
          <span class="slider"></span>
        </label>
        시작일 지정
        <p class="start_date_preview">{{ formatDatePreview(selectedStartDateTime) }}</p>
      </div>

      <!-- 종료일 toggle -->
      <div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="isEndDateOn" />
          <span class="slider"></span>
        </label>
        종료일 지정
        <p class="start_date_preview">{{ formatDatePreview(selectedEndDateTime) }}</p>
      </div>

      <!-- 알람 toggle -->
      <div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="isAlarmOn" />
          <span class="slider"></span>
        </label>
        알람 설정
        <p class="start_date_preview">
          {{ formatAlarmPreview(selectedAlarmTime) }}
        </p>
      </div>
    </div>

			<!-- 러피 산책 설정 -->
			<div class="form_box_g rt_make">
				<h3>최소 달성 횟수를 선택해주세요.</h3>
				<p class="comment">최소 목표를 달성할때마다<br />러피가 즐거운 산책을 다녀올 수 있어요.</p>
				<div class="custom-radio-group">
					<label class="custom-radio" v-for="count in [5, 10, 15, 20]" :key="count">
						<input type="radio" name="rut_status" :value="count" v-model="routineData.goalCount" />
						<span class="circle"></span>
					  <span>{{ count }}번</span>
          </label>
			
				</div>
			</div>

			<!-- 다짐 중요도 설정 -->
			<div class="form_box_g rt_make">
				<h3>얼마나 중요한 다짐인가요?</h3>
				<p class="comment">중요한 정도를 컬러로 표현해주세요.</p>
				<div class="color_chart">
					<span
						v-for="(_, index) in colorCount"
						:key="index"
						:class="['cchart' + String(index + 1).padStart(2, '0'), { on: selectedColorIndex === index }]"
						@click="handleColorClick(index)"
					></span>
				</div>
			</div>

			<!-- 메세지 설정 -->
			<div class="form_box_g rt_make">
				<h3>소곤소곤 더 얘기해줄건 없나요?</h3>
				<p><textarea maxlength="100" placeholder="최대 100자까지 적을 수 있어요." v-model="routineData.comment"></textarea></p>
			</div>
		</div>

		<div class="popup_btm">
			<button class="save_btn" @click="saveRoutine">{{ routineToEdit ? '다짐 수정하기' : '다짐 저장하기' }}</button>
		</div>
		<button class="close_btn" @click="handleClose"><span>팝업 닫기</span></button>

		<!-- 시작일 팝업 -->
		<DateTimePickerPopup
			v-if="isDatePopupOpen"
			title="시작일을 선택하세요"
			:showYear="true"
			:showMonth="true"
			:showDate="true"
			:showAmPm="false"
			:showHour="false"
			:showMinute="false"
			:showSecond="false"
			:minDate="todayString"
			:max-date="maxStartDate"
      @confirm="onDateConfirm"
			@close="handleDatePopupClose"
		/>

		<!-- 종료일 팝업 -->
			<DateTimePickerPopup
			v-if="isEndDatePopupOpen"
			title="종료일을 선택하세요"
			:showYear="true"
			:showMonth="true"
			:showDate="true"
			:showAmPm="false"
			:showHour="false"
			:showMinute="false"
			:showSecond="false"
			:minDate="minEndDate"
			@confirm="onEndDateConfirm"
			@close="handleEndDatePopupClose"
			/>
					
			<!-- 알람시간 팝업 -->
		<DateTimePickerPopup
			v-if="isAlarmPopupOpen"
			title="알람시간을 선택하세요"
			:showYear="false"
			:showMonth="false"
			:showDate="false"
			:showAmPm="true"
			:showHour="true"
			:showMinute="true"
			:showSecond="false"
			@confirm="onAlarmConfirm"
			@close="handleAlarmPopupClose"
		/>
	</div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'
import InlineWheelPicker from '@/components/common/InlineWheelPicker.vue'
import { setupToggleBlocks, setupCheckButtons } from '@/assets/js/ui.js'
import { auth, db } from '@/firebase'
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const emit = defineEmits(['close', 'refresh'])
const props = defineProps({ routineToEdit: Object })

const resetDailyKey = ref(0)
const resetWeeklyKey = ref(0)

const routineData = ref({
  title: '',
  comment: '',
  frequencyType: '',
  days: [],
  months: [],
  dates: [],
  startDate: { year: '', month: '', date: '' },
  endDate: { year: '', month: '', date: '', hour: '', minute: '', ampm: '', second: '' },
  time: '',
  goalCount: 0,
  color: 'cchart01',
  createdAt: null,
  userId: null,
  status: 'active',
  pauseDate: null
})

const selectedColorIndex = ref(null)
const selectedStartDateTime = ref(null)
const selectedEndDateTime = ref({ year: '', month: '', date: '' })
const selectedAlarmTime = ref(null)
const selectedRepeatDaily = ref(null)
const selectedRepeatWeekly = ref(null)
const selectedMonthOption = ref(null)
const selectedDates = ref([])
const minEndDate = ref('')
const isStartDateOn = ref(false)
const isDatePopupOpen = ref(false)
const isEndDateOn = ref(false)
const isEndDatePopupOpen = ref(false)
const isAlarmOn = ref(false)
const isAlarmPopupOpen = ref(false)

const repeatOptionsDaily = ['매일', '2일마다', '3일마다', '4일마다', '5일마다', '6일마다']
const repeatOptionsWeekly = ['2주마다', '3주마다', '4주마다', '5주마다']
const monthlyOptions = ['매월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const colorCount = 10
const handleClose = () => {
  emit('close')
}


const today = new Date()
const yyyy = today.getFullYear()
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')
const todayString = `${yyyy}-${mm}-${dd}`
minEndDate.value = todayString

const formatDateObjToStr = (dateObj) => {
  if (!dateObj?.year || !dateObj?.month || !dateObj?.date) return '--'
  return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.date).padStart(2, '0')}`
}

const formatDatePreview = (dateObj) => {
  if (!dateObj || !dateObj.year || !dateObj.month || !dateObj.date) return '--'
  return `${dateObj.year}.${String(dateObj.month).padStart(2, '0')}.${String(dateObj.date).padStart(2, '0')}`
}

const formatAlarmPreview = (timeObj) => {
  if (!timeObj || !timeObj.ampm || !timeObj.hour || timeObj.minute == null) return '--'
  return `${timeObj.ampm} ${timeObj.hour}:${String(timeObj.minute).padStart(2, '0')}`
}

const startDateString = computed(() => {
  const s = selectedStartDateTime.value
  if (!s || !s.year || !s.month || !s.date) return null
  return `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.date).padStart(2, '0')}`
})

const handleTabClick = (type) => {
  routineData.value.frequencyType = type
  document.querySelectorAll("button[id^='v_detail']").forEach(b => b.classList.remove('on'))
  document.querySelectorAll("div[id$='_block']").forEach(d => d.style.display = 'none')
  const tabBtn = document.getElementById(`v_detail0${type === 'daily' ? '1' : type === 'weekly' ? '2' : '3'}`)
  const tabBlock = document.getElementById(`${tabBtn.id}_block`)
  if (tabBtn && tabBlock) {
    tabBtn.classList.add('on')
    tabBlock.style.display = 'block'
  }
  // ✅ 조건 걸어서 새로 만드는 경우만 초기화
  if (!props.routineToEdit) {
    if (type === 'daily') {
      resetDailyKey.value++
      selectedRepeatDaily.value = null
    } else if (type === 'weekly') {
      resetWeeklyKey.value++
      selectedRepeatWeekly.value = null
    }
    routineData.value.days = []
    selectedMonthOption.value = null
    selectedDates.value = []
    routineData.value.dates = []
  }
}

watch(() => props.routineToEdit, (newRoutine) => {
  if (newRoutine) {
    Object.assign(routineData.value, {
      title: newRoutine.title || '',
      comment: newRoutine.comment || '',
      frequencyType: newRoutine.frequencyType || '',
      days: newRoutine.days || [],
      months: newRoutine.months || [],
      dates: newRoutine.dates || [],
      startDate: newRoutine.startDate || '',
      endDate: newRoutine.endDate || '',
      time: newRoutine.time || '',
      goalCount: newRoutine.goalCount || 0,
      color: newRoutine.color || '',
      status: newRoutine.status || 'active',
      pauseDate: newRoutine.pauseDate || null
    })
    ;(async () => {
      await nextTick()
      if (newRoutine.frequencyType) {
        handleTabClick(newRoutine.frequencyType)
      }
      if (newRoutine.frequencyType === 'daily') {
        selectedRepeatDaily.value = newRoutine.repeatText || null
      } else if (newRoutine.frequencyType === 'weekly') {
        selectedRepeatWeekly.value = newRoutine.repeatText || null
        routineData.value.days = newRoutine.days || []
      } else if (newRoutine.frequencyType === 'monthly') {
        selectedDates.value = newRoutine.dates || []
      }
    })()
    
    const match = /^cchart(\d+)$/.exec(newRoutine.color || '')
    selectedColorIndex.value = match ? Number(match[1]) - 1 : null

    if (newRoutine.startDate?.year) {
      selectedStartDateTime.value = { ...newRoutine.startDate }
      isStartDateOn.value = true
    }
    if (newRoutine.endDate?.year) {
      selectedEndDateTime.value = { ...newRoutine.endDate }
      isEndDateOn.value = true
    }
    if (newRoutine.time) {
      const [ampm, time] = newRoutine.time.split(' ')
      const [hour, minute] = time.split(':')
      selectedAlarmTime.value = { ampm, hour, minute: Number(minute) }
      isAlarmOn.value = true
    }
    if (newRoutine.frequencyType === 'daily') {
      selectedRepeatDaily.value = newRoutine.repeatText || null
    } else if (newRoutine.frequencyType === 'weekly') {
      selectedRepeatWeekly.value = newRoutine.repeatText || null
    }
  } else {
    Object.assign(routineData.value, {
      title: '', comment: '', frequencyType: '', days: [], months: [], dates: [],
      startDate: '', endDate: '', time: '', goalCount: 0, color: 'cchart01',
      status: 'active', pauseDate: null
    })
    selectedColorIndex.value = null
    selectedStartDateTime.value = null
    selectedEndDateTime.value = { year: '', month: '', date: '' }
    selectedAlarmTime.value = null
    isStartDateOn.value = false
    isEndDateOn.value = false
    isAlarmOn.value = false
    selectedRepeatDaily.value = null
    selectedRepeatWeekly.value = null
  }
}, { immediate: true })

watch(isStartDateOn, (val) => {
  if (val) {
    isDatePopupOpen.value = true
  } else {
    selectedStartDateTime.value = null
    routineData.value.startDate = { year: '', month: '', date: '' }
  }
})

watch(selectedStartDateTime, (val) => {
  if (val && val.year && val.month && val.date) {
    minEndDate.value = `${val.year}-${String(val.month).padStart(2, '0')}-${String(val.date).padStart(2, '0')}`
    routineData.value.startDate = { year: val.year, month: val.month, date: val.date }
  } else {
    minEndDate.value = todayString
  }
})

watch(isEndDateOn, (val) => {
  const start = routineData.value.startDate
  const isValidStart = start && start.year && start.month && start.date
  minEndDate.value = isValidStart
    ? `${start.year}-${String(start.month).padStart(2, '0')}-${String(start.date).padStart(2, '0')}`
    : todayString
  isEndDatePopupOpen.value = val
  if (!val) {
    selectedEndDateTime.value = null
    routineData.value.endDate = { year: '', month: '', date: '' }
  }
})

watch(isAlarmOn, (val) => {
  isAlarmPopupOpen.value = val
  if (!val) {
    selectedAlarmTime.value = null
    routineData.value.time = ''
  }
})

const onDateConfirm = (val) => {
  const day = val.date || 1
  selectedStartDateTime.value = { year: val.year, month: val.month, date: day }
  routineData.value.startDate = { year: val.year, month: val.month, date: day }
  isDatePopupOpen.value = false
}

const onEndDateConfirm = (val) => {
  const day = val.date || 1
  selectedEndDateTime.value = { year: val.year, month: val.month, date: day }
  routineData.value.endDate = { year: val.year, month: val.month, date: day }
  isEndDatePopupOpen.value = false
}

const onAlarmConfirm = (val) => {
  selectedAlarmTime.value = val
  const paddedMinute = String(val.minute).padStart(2, '0')
  routineData.value.time = `${val.ampm} ${val.hour}:${paddedMinute}`
  isAlarmPopupOpen.value = false
}

const handleDatePopupClose = () => {
  isDatePopupOpen.value = false
  if (!selectedStartDateTime.value?.year) isStartDateOn.value = false
}

const handleEndDatePopupClose = () => {
  isEndDatePopupOpen.value = false
  if (!selectedEndDateTime.value?.year) isEndDateOn.value = false
}

const handleAlarmPopupClose = () => {
  isAlarmPopupOpen.value = false
  if (!selectedAlarmTime.value) isAlarmOn.value = false
}

const toggleDateSelection = (day) => {
  if (selectedDates.value.includes(day)) {
    selectedDates.value = selectedDates.value.filter(d => d !== day)
  } else {
    selectedDates.value.push(day)
  }
  routineData.value.dates = [...selectedDates.value]
}

const toggleDay = (day) => {
  if (routineData.value.days.includes(day)) {
    routineData.value.days = routineData.value.days.filter(d => d !== day)
  } else {
    routineData.value.days.push(day)
  }
}

const handleColorClick = (index) => {
  selectedColorIndex.value = index
  routineData.value.color = `cchart${String(index + 1).padStart(2, '0')}`
}

const saveRoutine = async () => {
  
  console.log('💬 저장 직전 요일:', routineData.value.days)

  const user = auth.currentUser
  if (!user) return alert("로그인 후 다짐을 저장할 수 있어요!")
  if (!routineData.value.title) return alert("다짐명을 입력해주세요.")
  if (routineData.value.frequencyType === 'daily') {
    routineData.value.repeatText = selectedRepeatDaily.value
  } else if (routineData.value.frequencyType === 'weekly') {
    routineData.value.repeatText = selectedRepeatWeekly.value
  }
  try {
    if (props.routineToEdit) {
      const routineRef = doc(db, 'routines', props.routineToEdit.id)
      await updateDoc(routineRef, { ...routineData.value, userId: user.uid })
      alert("다짐이 수정되었습니다!")
    } else {
      await addDoc(collection(db, 'routines'), { ...routineData.value, createdAt: serverTimestamp(), userId: user.uid })
      alert("다짐이 저장되었습니다!")
    }
    setTimeout(() => {
      emit('refresh')
      emit('close')
    }, 500)
  } catch (err) {
    console.error("저장 실패:", err)
    alert("저장에 실패했습니다. 다시 시도해주세요.")
  }
}

const togglePauseStatus = () => {
  if (routineData.value.status === 'active') {
    routineData.value.status = 'paused'
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    routineData.value.pauseDate = `${yyyy}-${mm}-${dd}`
  } else {
    routineData.value.status = 'active'
    routineData.value.pauseDate = null
  }
}

onMounted(async () => {
   setupToggleBlocks({
    resetRepeat: () => {
      selectedRepeatDaily.value = null
      selectedRepeatWeekly.value = null
    },
    resetMonthly: () => {
      selectedMonthOption.value = null
      selectedDates.value = []
      routineData.value.dates = []
    }
  })
  setupCheckButtons()
  await nextTick()
  if (!props.routineToEdit) {
    // 새 다짐 만들기일 때만 디폴트로 daily 탭 열기
    const dailyBtn = document.getElementById('v_detail01')
    const dailyBlock = document.getElementById('v_detail01_block')
    document.querySelectorAll("button[id^='v_detail']").forEach(b => b.classList.remove('on'))
    document.querySelectorAll("div[id$='_block']").forEach(d => d.style.display = 'none')
    if (dailyBtn && dailyBlock) {
      dailyBtn.classList.add('on')
      dailyBlock.style.display = 'block'
    }
  }
})
</script>



