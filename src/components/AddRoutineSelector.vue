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
					<button id="v_detail01" @click="routineData.frequencyType = 'daily'">일간</button>
					<button id="v_detail02" @click="routineData.frequencyType = 'weekly'">주간</button>
					<button id="v_detail03" @click="routineData.frequencyType = 'monthly'">월간</button>
				</p>

				<!--일간 상세-->
				<div class="rt_make_detail" id="v_detail01_block">
					<p class="check_btn">
						<button class="all" @click="routineData.days = ['일','월','화','수','목','금','토']">매일</button>
						<button v-for="d in ['일','월','화','수','목','금','토']" :key="d" @click="toggleDay(d)">{{ d }}</button>
					</p>
				</div>

				<!-- 주간 상세 -->
				<div class="rt_make_detail" id="v_detail02_block">
					<div class="select_week">
						<InlineWheelPicker :items="repeatOptions" v-model="selectedRepeat" :itemHeight="40" />
					</div>
					<p class="check_btn">
						<button class="all" @click="routineData.days = ['일','월','화','수','목','금','토']">매일</button>
						<button v-for="d in ['일','월','화','수','목','금','토']" :key="d + 'w'" @click="toggleDay(d)">{{ d }}</button>
					</p>
				</div>

				<!-- 월간 상세 -->
				<div class="rt_make_detail" id="v_detail03_block">
					<div class="select_monthly">
						<div class="select_m_inner">
							<InlineWheelPicker :items="monthlyOptions" v-model="selectedMonthOption" :itemHeight="40" />
						</div>
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
				<div>
					<label class="toggle-switch">
						<input type="checkbox" id="my_toggle" v-model="isStartDateOn" />
						<span class="slider"></span>
					</label>
					시작일 지정
					<p v-if="selectedStartDateTime" class="start_date_preview">
						{{ selectedStartDateTime.year }}-{{ selectedStartDateTime.month }}-{{ selectedStartDateTime.date }}
					</p>
				</div>
				<div>
					<label class="toggle-switch">
						<input type="checkbox" v-model="isAlarmOn" />
						<span class="slider"></span>
					</label>
					알람 설정
					<p v-if="selectedAlarmTime" class="start_date_preview">
						{{ selectedAlarmTime.ampm }} {{ selectedAlarmTime.hour }}:{{ selectedAlarmTime.minute }}
					</p>
				</div>
			</div>

			<!-- 러피 산책 설정 -->
			<div class="form_box_g rt_make">
				<h3>최소 달성 횟수를 선택해주세요.</h3>
				<p class="comment">최소 목표를 달성할때마다<br />러피가 즐거운 산책을 다녀올 수 있어요.</p>
				<div class="walking_goal">
					<label class="pretty-radio-block" v-for="count in [5, 10, 15, 20]" :key="count">
						<input type="radio" name="rut_status" :value="count" v-model="routineData.goalCount" />
						<span class="radio-style"></span>
						{{ count }}번
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
			@confirm="onDateConfirm"
			@close="handleDatePopupClose"
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
import { ref, onMounted, watch, nextTick } from 'vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'
import InlineWheelPicker from '@/components/common/InlineWheelPicker.vue'
import { setupToggleBlocks, setupCheckButtons } from '@/assets/js/ui.js'
import { auth, db } from '@/firebase'
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

const props = defineProps({
  routineToEdit: Object
})

const emit = defineEmits(['close', 'refresh'])
const handleClose = () => emit('close')

const routineData = ref({
  title: '',
  comment: '',
  frequencyType: '',
  days: [],
  months: [],
  dates: [],
  startDate: '',
  time: '',
  goalCount: 0,
	color: 'cchart01', 
  createdAt: null,
  userId: null
})
watch(
  () => props.routineToEdit,
  (newRoutine) => {
    if (newRoutine) {
      routineData.value = {
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
        color: newRoutine.color || ''
      }
    } else {
      // ✨ 혹시 모를 초기화
      routineData.value = {
        title: '',
        comment: '',
        frequencyType: '',
        days: [],
        months: [],
        dates: [],
        startDate: '',
        endDate: '',
        time: '',
        goalCount: 0,
        color: ''
      }
    }
  },
  { immediate: true }
)

const toggleDay = (day) => {
  if (routineData.value.days.includes(day)) {
    routineData.value.days = routineData.value.days.filter(d => d !== day)
  } else {
    routineData.value.days.push(day)
  }
}

const today = new Date()
const yyyy = today.getFullYear()
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')
const todayString = `${yyyy}-${mm}-${dd}`

const isStartDateOn = ref(false)
const isDatePopupOpen = ref(false)
const selectedStartDateTime = ref(null)
const isAlarmOn = ref(false)
const isAlarmPopupOpen = ref(false)
const selectedAlarmTime = ref(null)

const repeatOptions = ['2주마다', '3주마다', '4주마다', '5주마다']
const selectedRepeat = ref(null)
const monthlyOptions = ['매월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const selectedMonthOption = ref(null)
const selectedDates = ref([])
const colorCount = 10
const selectedColorIndex = ref(null)

const toggleDateSelection = (day) => {
  if (selectedDates.value.includes(day)) {
    selectedDates.value = selectedDates.value.filter(d => d !== day)
  } else {
    selectedDates.value.push(day)
  }
  routineData.value.dates = [...selectedDates.value]
}

const handleColorClick = (index) => {
  selectedColorIndex.value = index
  routineData.value.color = `cchart${String(index + 1).padStart(2, '0')}`
}

watch(isStartDateOn, (val) => {
  if (val) {
    isDatePopupOpen.value = true
  } else {
    selectedStartDateTime.value = null
    routineData.value.startDate = ''
  }
})

watch(isAlarmOn, (val) => {
  if (val) {
    isAlarmPopupOpen.value = true
  } else {
    selectedAlarmTime.value = null
    routineData.value.time = ''
  }
})

const onDateConfirm = (val) => {
  selectedStartDateTime.value = val
  routineData.value.startDate = `${val.year}-${val.month}-${val.date}`
  isDatePopupOpen.value = false
}

const onAlarmConfirm = (val) => {
  selectedAlarmTime.value = val
  routineData.value.time = `${val.ampm} ${val.hour}:${val.minute}`
  isAlarmPopupOpen.value = false
}

const handleDatePopupClose = () => {
  isDatePopupOpen.value = false
  if (!selectedStartDateTime.value) {
    isStartDateOn.value = false
  }
}

const handleAlarmPopupClose = () => {
  isAlarmPopupOpen.value = false
  if (!selectedAlarmTime.value) {
    isAlarmOn.value = false
  }
}

const saveRoutine = async () => {
  const user = auth.currentUser
  if (!user) {
    alert("로그인 후 다짐을 저장할 수 있어요!")
    return
  }

  if (!routineData.value.title) {
    alert("다짐명을 입력해주세요.")
    return
  }

  try {
    if (props.routineToEdit) {
      // ✅ 수정 로직
     console.log("🧩 routineToEdit.id:", props.routineToEdit?.id) 
	  const routineRef = doc(db, 'routines', props.routineToEdit.id)
      await updateDoc(routineRef, {
        ...routineData.value,
        userId: user.uid  // 혹시 몰라 안전하게 넣음
      })
      alert("다짐이 수정되었습니다!")
    } else {
      // ✅ 신규 저장 로직
      await addDoc(collection(db, 'routines'), {
        ...routineData.value,
        createdAt: serverTimestamp(),
        userId: user.uid
      })
      alert("다짐이 저장되었습니다!")
    }

    // ✅ 저장 후 화면 갱신
    setTimeout(() => {
      emit('refresh')   // 메인뷰에게 다시 fetch하라고 알림
     emit('resetEdit')  
	  emit('close')     // 팝업 닫기
    }, 500)
  } catch (err) {
    console.error("저장 실패:", err)
    alert("저장에 실패했습니다. 다시 시도해주세요.")
  }
}

onMounted(async () => {
  setupToggleBlocks({
    resetRepeat: () => selectedRepeat.value = null,
    resetMonthly: () => {
      selectedMonthOption.value = null
      selectedDates.value = []
      routineData.value.dates = []
    }
  })
  setupCheckButtons()
  await nextTick()

  const dailyBtn = document.getElementById('v_detail01')
  const dailyBlock = document.getElementById('v_detail01_block')
  document.querySelectorAll("button[id^='v_detail']").forEach(b => b.classList.remove('on'))
  document.querySelectorAll("div[id$='_block']").forEach(d => d.style.display = 'none')
  if (dailyBtn && dailyBlock) {
    dailyBtn.classList.add('on')
    dailyBlock.style.display = 'block'
  }
})
</script>


