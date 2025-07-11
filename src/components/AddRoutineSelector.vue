<template>
	<div class="popup_wrap">
		<h2>새 다짐 만들기</h2>

		<div class="popup_inner">
			<!-- 다짐명 적기 -->
			<div class="form_box_g rt_make">
				<h3>다짐명을 적어주세요.</h3>
				<p>
					<label for="rt_name">새 다짐 명</label>
					<input type="text" placeholder="ex)외로워도 슬퍼도 탄수화물 끊기" />
				</p>
			</div>

			<!--다짐 주기 설정-->
			<div class="form_box_g rt_make day_box">
				<h3>얼마나 자주 지켜야해요?</h3>
				<p>
					<button id="v_detail01">일간</button>
					<button id="v_detail02">주간</button>
					<button id="v_detail03">월간</button>
				</p>

				<!--일간 상세-->
				<div class="rt_make_detail" id="v_detail01_block">
					<p class="check_btn">
						<button class="all">매일</button>
						<button>일</button>
						<button>월</button>
						<button>화</button>
						<button>수</button>
						<button>목</button>
						<button>금</button>
						<button>토</button>
					</p>
				</div>

				<!-- 주간 상세 -->
				<div class="rt_make_detail" id="v_detail02_block">
					<div class="select_week">
						<InlineWheelPicker
							:items="repeatOptions"
							v-model="selectedRepeat"
							:itemHeight="40"
						/>
					</div>
					<p class="check_btn">
						<button class="all">매일</button>
						<button>일</button>
						<button>월</button>
						<button>화</button>
						<button>수</button>
						<button>목</button>
						<button>금</button>
						<button>토</button>
					</p>
				</div>

				<!-- 월간 상세 -->
				<div class="rt_make_detail" id="v_detail03_block">
					<div class="select_monthly">
						<div class="select_m_inner">
							<InlineWheelPicker
								:items="monthlyOptions"
								v-model="selectedMonthOption"
								:itemHeight="40"
							/>
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
				<h3>러피의 산책 주기를 정해주세요.</h3>
				<p class="comment">목표한 다짐 횟수를 달성할때마다<br />러피가 산책을 다녀와 씻을 수 있어요.<br /></p>
				<div class="walking_goal">
					<label class="pretty-radio-block">
          		<input type="radio" name="rut_status" value="1" v-model="selectedStatusTemp" />
            <span class="radio-style"></span>
            5번
          </label>
					<label class="pretty-radio-block">
          		<input type="radio" name="rut_status" value="1" v-model="selectedStatusTemp" />
            <span class="radio-style"></span>
            10번
          </label>
					<label class="pretty-radio-block">
          		<input type="radio" name="rut_status" value="1" v-model="selectedStatusTemp" />
            <span class="radio-style"></span>
            15번
          </label>
					<label class="pretty-radio-block">
          		<input type="radio" name="rut_status" value="1" v-model="selectedStatusTemp" />
            <span class="radio-style"></span>
            20번
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
				<p><textarea maxlength="100" placeholder="최대 100자까지 적을 수 있어요."></textarea></p>
			</div>
		</div>

		<div class="popup_btm">
			<button @click="handleClose">다짐 저장하기</button>
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

const emit = defineEmits(['close'])
const handleClose = () => emit('close')

// 날짜 포맷
const today = new Date()
const yyyy = today.getFullYear()
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')
const todayString = `${yyyy}-${mm}-${dd}`

// 시작일/알람 상태
const isStartDateOn = ref(false)
const isDatePopupOpen = ref(false)
const selectedStartDateTime = ref(null)

const isAlarmOn = ref(false)
const isAlarmPopupOpen = ref(false)
const selectedAlarmTime = ref(null)

// 주간/월간 반복 선택
const repeatOptions = ['2주마다', '3주마다', '4주마다', '5주마다']
const selectedRepeat = ref(null)

const monthlyOptions = ['매월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const selectedMonthOption = ref(null)
const selectedDates = ref([])

const toggleDateSelection = (day) => {
	if (selectedDates.value.includes(day)) {
		selectedDates.value = selectedDates.value.filter(d => d !== day)
	} else {
		selectedDates.value.push(day)
	}
}

// 중요도 색상 단일 선택용
const colorCount = 10 // 이후 11, 12로 늘려도 됨
const selectedColorIndex = ref(null)
const handleColorClick = (index) => {
	selectedColorIndex.value = index
}

// 토글 감시
watch(isStartDateOn, (val) => {
	if (val) {
		isDatePopupOpen.value = true
	} else {
		selectedStartDateTime.value = null
	}
})

watch(isAlarmOn, (val) => {
	if (val) {
		isAlarmPopupOpen.value = true
	} else {
		selectedAlarmTime.value = null
	}
})

// 팝업 확인
const onDateConfirm = (val) => {
	selectedStartDateTime.value = val
	isDatePopupOpen.value = false
}

const onAlarmConfirm = (val) => {
	selectedAlarmTime.value = val
	isAlarmPopupOpen.value = false
}

// 팝업 닫기 시 토글도 해제
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

// 초기 세팅
onMounted(async () => {
	setupToggleBlocks({
		resetRepeat: () => selectedRepeat.value = null,
		resetMonthly: () => {
			selectedMonthOption.value = null
			selectedDates.value = []
		}
	})
	setupCheckButtons()
	await nextTick()

	// 일간 탭 기본 표시
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

