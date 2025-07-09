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
				<!--//일ㅠ간 상세-->

				<!--주간 상세--->
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
import { ref, onMounted, watch, nextTick } from 'vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'
import { setupToggleBlocks, setupCheckButtons } from '@/assets/js/ui.js'
import InlineWheelPicker from '@/components/common/InlineWheelPicker.vue'

const emit = defineEmits(['close'])
const handleClose = () => {
  emit('close')
}

// 오늘 날짜를 YYYY-MM-DD 형식으로 포맷
const today = new Date()
const yyyy = today.getFullYear()
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')
const todayString = `${yyyy}-${mm}-${dd}`

// 시작일 설정 상태
const isStartDateOn = ref(false)
const isDatePopupOpen = ref(false)
const selectedStartDateTime = ref(null)

// 알람 설정 상태
const isAlarmOn = ref(false)
const isAlarmPopupOpen = ref(false)
const selectedAlarmTime = ref(null)

// 반복 주기 드르륵 휠 상태
const repeatOptions = ['2주마다', '3주마다', '4주마다', '5주마다']
const selectedRepeat = ref(null) // 초기 선택 없음

// 시작일 토글 감시
watch(isStartDateOn, (val) => {
  if (val) {
    isDatePopupOpen.value = true
  } else {
    selectedStartDateTime.value = null
  }
})

// 알람 토글 감시
watch(isAlarmOn, (val) => {
  if (val) {
    isAlarmPopupOpen.value = true
  } else {
    selectedAlarmTime.value = null
  }
})

// 시작일 팝업 확인 시
const onDateConfirm = (val) => {
  selectedStartDateTime.value = val
  isDatePopupOpen.value = false
}

// 알람 팝업 확인 시
const onAlarmConfirm = (val) => {
  selectedAlarmTime.value = val
  isAlarmPopupOpen.value = false
}

// onMounted 시 초기화
onMounted(async () => {
  // 주간 탭에서 휠값 초기화 설정 포함해서 호출
  setupToggleBlocks({
    resetRepeat: () => {
      selectedRepeat.value = null
    }
  })
  setupCheckButtons()

  await nextTick()

  // 일간 탭 기본 활성화
  const dailyBtn = document.getElementById('v_detail01')
  const dailyBlock = document.getElementById('v_detail01_block')
  const allTabBtns = document.querySelectorAll("button[id^='v_detail']")
  const allBlocks = document.querySelectorAll("div[id$='_block']")

  allTabBtns.forEach((btn) => btn.classList.remove('on'))
  allBlocks.forEach((block) => (block.style.display = 'none'))

  if (dailyBtn && dailyBlock) {
    dailyBtn.classList.add('on')
    dailyBlock.style.display = 'block'
  }

  // 휠도 초기화
  selectedRepeat.value = null
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

.select_week {
	border-radius:1rem;
	background-color:#f9f9f9;
	border:0.1rem solid #f2f2f2;
	margin-bottom:0.5rem
}
</style>




export function setupToggleBlocks(options = {}) {
	const allBlocks = document.querySelectorAll('[id$="_block"]')
	const buttons = document.querySelectorAll('button[id^="v_detail"]')

	let currentActiveId = null

	const resetBlock = (block) => {
		// 버튼 상태 초기화
		const buttonsInBlock = block.querySelectorAll('button.on')
		buttonsInBlock.forEach((b) => b.classList.remove('on'))

		// 입력 필드 초기화
		const inputs = block.querySelectorAll('input, textarea')
		inputs.forEach((input) => {
			if (input.type === 'checkbox' || input.type === 'radio') {
				input.checked = false
			} else {
				input.value = ''
			}
		})

		// 주간 탭일 경우 repeat 값 초기화
		if (block.id === 'v_detail02_block' && options.resetRepeat) {
			options.resetRepeat()
		}
	}

	const hideAllBlocks = () => {
		allBlocks.forEach((block) => {
			block.style.display = 'none'
		})
		buttons.forEach((b) => b.classList.remove('on'))
	}

	buttons.forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = btn.getAttribute('id')
			const targetId = `${id}_block`
			const target = document.getElementById(targetId)

			if (!target) return
			if (currentActiveId === id) return

			const prevBlock = document.getElementById(`${currentActiveId}_block`)
			if (prevBlock) resetBlock(prevBlock)

			hideAllBlocks()
			btn.classList.add('on')
			target.style.display = 'block'
			currentActiveId = id
		})
	})

	if (buttons.length > 0) {
		const firstBtn = buttons[0]
		const firstId = firstBtn.getAttribute('id')
		const firstBlock = document.getElementById(`${firstId}_block`)
		if (firstBlock) {
			firstBtn.classList.add('on')
			firstBlock.style.display = 'block'
			currentActiveId = firstId
		}
	}
}

export function setupCheckButtons() {
	const checkGroups = document.querySelectorAll('.check_btn')

	checkGroups.forEach((group) => {
		const buttons = group.querySelectorAll('button')

		buttons.forEach((btn) => {
			btn.addEventListener('click', () => {
				const isAll = btn.classList.contains('all')
				const isActive = btn.classList.contains('on')

				if (isAll) {
					// 전체 on/off 토글
					buttons.forEach((b) => {
						if (isActive) {
							b.classList.remove('on')
						} else {
							b.classList.add('on')
						}
					})
				} else {
					// 일반 버튼 토글
					btn.classList.toggle('on')

					// 일반 버튼 클릭 시 .all off
					const allBtn = group.querySelector('button.all')
					if (allBtn) allBtn.classList.remove('on')
				}
			})
		})
	})
}

<template>
  <div
    class="inline-wheel-container"
    @wheel.passive="false"
    @wheel="onWheel"
    @touchstart="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div
      class="inline-wheel-list"
      :style="{
        transform: `translateY(-${selectedIndex * itemHeight}px)`,
        paddingTop: `${paddingOffset}px`,
        paddingBottom: `${paddingOffset}px`
      }"
    >
      <div
        v-for="(item, index) in items"
        :key="index"
        class="inline-wheel-item"
        :class="{ selected: index === selectedIndex }"
        :style="{ height: itemHeight + 'px', lineHeight: itemHeight + 'px' }"
        @click="select(index)"
      >
        {{ item }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  modelValue: [String, Number],
  itemHeight: {
    type: Number,
    default: 40
  },
  containerHeight: {
    type: Number,
    default: 96 // rem 기준 6rem = 96px
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedIndex = ref(0)

onMounted(() => {
  const initialIndex = props.items.findIndex(
    (item) => item === props.modelValue
  )
  if (initialIndex >= 0) {
    selectedIndex.value = initialIndex
  } else {
    selectedIndex.value = -1 // 선택 안함
  }
})
const onWheel = (event) => {
  event.preventDefault()
  if (event.deltaY > 0 && selectedIndex.value < props.items.length - 1) {
    selectedIndex.value++
  } else if (event.deltaY < 0 && selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

let touchStartY = 0
const onTouchStart = (e) => {
  touchStartY = e.touches[0].clientY
}
const onTouchMove = (e) => {
  const deltaY = e.touches[0].clientY - touchStartY
  if (deltaY > 10 && selectedIndex.value > 0) {
    selectedIndex.value--
    touchStartY = e.touches[0].clientY
  } else if (deltaY < -10 && selectedIndex.value < props.items.length - 1) {
    selectedIndex.value++
    touchStartY = e.touches[0].clientY
  }
}
const onTouchEnd = () => {}

const select = (index) => {
  selectedIndex.value = index
  emit('update:modelValue', props.items[index])
}
watch(selectedIndex, (newVal) => {
  if (newVal >= 0) {
    emit('update:modelValue', props.items[newVal])
  }
})
// 중앙 정렬을 위한 padding 계산
const paddingOffset = computed(() => {
  return (props.containerHeight - props.itemHeight) / 2
})
</script>

<style scoped>
.inline-wheel-container {
  overflow: hidden;
  height: 6rem;
  position: relative;
  width: 100%;
}
.inline-wheel-list {
  transition: transform 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.inline-wheel-item {
  text-align: center;
  font-size: 1rem;
  color: #a333;
  user-select: none;
  width: 100%;
}
.inline-wheel-item.selected {
  font-weight: bold;
  color: #333;
  border-radius: 1rem;
  background-color: #ffed71;
}
</style>