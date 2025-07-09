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

			<!-- 다짐 주기 설정 -->
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
				<!--//일간 상세-->

				<!--주간 상세--->
				<div class="rt_make_detail" id="v_detail02_block">
					<div class="select_week">
					</div>
				</div>
				<!--//주간 상세-->

				<!-- 월간 상세-->
				<div class="rt_make_detail" id="v_detail03_block">
				</div>
				<!--//월간 상세-->


				
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
					<!-- 선택된 시작일 표시 -->
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
    				<!-- 선택된 알람시간 표시 -->
    				<p v-if="selectedAlarmTime" class="start_date_preview">
      				{{ selectedAlarmTime.ampm }} {{ selectedAlarmTime.hour }}:{{ selectedAlarmTime.minute }}
    				</p>
  				</div>
			</div>

			<!-- 러피 산책 설정 -->
			<div class="form_box_g rt_make">
				<h3>러피의 산책 주기는 어떻게 할까요?</h3>
				<p>
					미리 설정한 다짐 횟수를 달성하면 러피의 산책이 시작돼요. 최소 다짐 횟수는 5번이예요.
				</p>
				<p>
					<button class="btn_basic">최소 달성 횟수 선택하기</button>
				</p>
			</div>

			<!-- 다짐 중요도 설정 -->
			<div class="form_box_g rt_make">
				<h3>얼마나 중요한 다짐인가요?</h3>
				<p>중요한 마음 만큼 컬러를 선택해주세요.</p>
			</div>

			<!-- 메세지 설정 -->
			<div class="form_box_g rt_make">
				<h3>소곤소곤 더 할 말은 없나요?</h3>
				<p>
					<textarea rows="2">좀더 하고 싶은 말은 없나요?</textarea>
				</p>
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
  @close="isDatePopupOpen = false"
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
  @close="isAlarmPopupOpen = false"
/>
	</div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'
import { setupToggleBlocks, setupCheckButtons } from '@/assets/js/ui.js'

const emit = defineEmits(['close'])
const handleClose = () => {
  emit('close')
}

// 오늘 날짜를 YYYY-MM-DD 문자열로 생성
const today = new Date()
const yyyy = today.getFullYear()
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')
const todayString = `${yyyy}-${mm}-${dd}`

// 시작일 관련 상태
const isStartDateOn = ref(false)
const isDatePopupOpen = ref(false)
const selectedStartDateTime = ref(null)

// 알람 관련 상태
const isAlarmOn = ref(false)
const isAlarmPopupOpen = ref(false)
const selectedAlarmTime = ref(null)

// 시작일 토글
watch(isStartDateOn, (val) => {
  if (val) {
    isDatePopupOpen.value = true
  } else {
    selectedStartDateTime.value = null
  }
})

// 알람 토글
watch(isAlarmOn, (val) => {
  if (val) {
    isAlarmPopupOpen.value = true
  } else {
    selectedAlarmTime.value = null
  }
})

// 시작일 팝업에서 값 선택 시
const onDateConfirm = (val) => {
  selectedStartDateTime.value = val
  isDatePopupOpen.value = false
}

// 알람 팝업에서 값 선택 시
const onAlarmConfirm = (val) => {
  selectedAlarmTime.value = val
  isAlarmPopupOpen.value = false
}

// 탭 초기화
onMounted(() => {
  setupToggleBlocks()
  setupCheckButtons()

  setTimeout(() => {
    const defaultButton = document.getElementById('v_detail01')
    const defaultBlock = document.getElementById('v_detail01_block')

    if (defaultButton && defaultBlock) {
      defaultButton.classList.add('on')
      defaultBlock.style.display = 'block'
    }
  }, 0)
})
</script>

<style>
.form_box_g.rt_make h3 {
	text-align:center
}
.form_box_g.rt_make p.button button {
	width: 100%;
	line-height: 2rem;
	color: #333;
	background-color: #fff282;
	border: 0.1rem solid #fff282;
	border-radius: 1rem;
}

.form_box_g.rt_make.day_box button[id^='v_detail'] {
	width: 32%;
	background-color: #fff;
	border: 0.1rem solid #17a47a;
	margin-right: 1%;
	color: #17a47a;
}
.form_box_g.rt_make.day_box button.on {
	color: #fff;
	background-color: #17a47a;
	border: 0.1rem solid #17a47a;
}
.form_box_g.rt_make.day_box [id$='_block'] {}

.form_box_g.rt_make.day_box p {
	margin-bottom: 0.5rem;
}
.form_box_g.rt_make.day_box p:last-child {
	margin-bottom: 0;
}
.form_box_g.rt_make.day_box p.check_btn button {
	width: 24%;
	margin: 0 1% 0.5rem 0;
	display: inline-block;
	color: #333;
	border-radius: 1rem;
	border: 0.1rem solid #e7e7e7;
	text-align: center;
	line-height: 1rem;
}
.form_box_g.rt_make.day_box p.check_btn button:last-child {
	margin-right: 0;
}
.form_box_g.rt_make.day_box p.check_btn button.on {
	font-weight: bold;
	padding-left: 1rem;
	background: url('https://img.icons8.com/?size=100&id=11849&format=png&color=000000') left 0.5rem center / 0.8rem 0.8rem no-repeat;
}

.start_date_preview {
	margin: 0.5rem 0 0;
	font-size: 0.9rem;
	color: #444;
}

.form_box_g.rt_make.start_alarm_box  {
	text-align:left;
}
.form_box_g.rt_make.start_alarm_box div {
	margin-bottom:0.5rem;
}
.form_box_g.rt_make.start_alarm_box div:last-child {
	margin-bottom:0
}

.start_date_preview {
	float:right
}
</style>




