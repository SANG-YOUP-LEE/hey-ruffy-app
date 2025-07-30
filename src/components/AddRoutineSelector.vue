<template>
  <div class="popup_wrap">
    <div class="popup_tit">
      <h2>새로운 다짐을<br />만들어 볼까요?</h2>
      <p>다짐을 달성할때마다<br />러피의 산책이 총총총 계속됩니다.</p>
    </div>

    <div class="popup_inner">
      <!-- 다짐명 적기 -->
      <div class="form_box_g">
        <h3>새롭게 다짐할 일을 적어주세요.</h3>
        <p>
          <label for="rt_name">새 다짐 명</label>
          <input
            type="text"
            v-model="routineData.title"
            placeholder="ex)외로워도 슬퍼도 탄수화물 끊기"
            class="uline"
          />
        </p>
      </div>

      <!-- 다짐 주기 설정 -->
      <div class="form_box_g limit">
        <h3>얼마나 자주 지켜야 하나요?</h3>
        <p>
          <button
            id="v_detail01"
            @click="handleTabClick('daily')"
            class="b_basic"
            :class="{ on: selectedTab === 'daily' }"
          >일간</button>

          <button
            id="v_detail02"
            @click="handleTabClick('weekly')"
            class="b_basic"
            :class="{ on: selectedTab === 'weekly' }"
          >주간</button>

          <button
            id="v_detail03"
            @click="handleTabClick('monthly')"
            class="b_basic"
            :class="{ on: selectedTab === 'monthly' }"
          >월간</button>
        </p>

        <!-- 일간 상세 -->
        <div class="detail_box" v-show="selectedTab === 'daily'">
          aa
        </div>

        <!-- 주간 상세 -->
        <div class="detail_box" v-show="selectedTab === 'weekly'">
          bb
          <p class="check_btn">
            <button
              class="all"
              @click="toggleAllDays"
              :class="{ light: isAllDaysSelected }"
            >매일</button>

            <button
              v-for="d in ['일','월','화','수','목','금','토']"
              :key="d + 'w'"
              @click="toggleDay(d)"
              :class="{ light: routineData.days.includes(d) }"
            >
              {{ d }}
            </button>
          </p>
        </div>

        <!-- 월간 상세 -->
        <div class="detail_box" v-show="selectedTab === 'monthly'">
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

    <div class="popup_btm">
      <button class="b_basic" @click="handleSave">다짐 저장하기</button>
    </div>

    <div class="close_btn" @click="$emit('close')"><span>닫기</span></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const emit = defineEmits(['close'])

const routineData = reactive({
  title: '',
  days: []
})

const selectedTab = ref('daily')  // ✅ 기본값 일간
const selectedDates = ref([])
const isAllDaysSelected = ref(false)

const handleTabClick = (tab) => {
  selectedTab.value = tab
}

const toggleDay = (day) => {
  if (routineData.days.includes(day)) {
    routineData.days = routineData.days.filter(d => d !== day)
  } else {
    routineData.days.push(day)
  }
}

const toggleAllDays = () => {
  if (isAllDaysSelected.value) {
    routineData.days = []
  } else {
    routineData.days = ['일','월','화','수','목','금','토']
  }
  isAllDaysSelected.value = !isAllDaysSelected.value
}

const toggleDateSelection = (day) => {
  if (selectedDates.value.includes(day)) {
    selectedDates.value = selectedDates.value.filter(d => d !== day)
  } else {
    selectedDates.value.push(day)
  }
}

const handleSave = () => {
  console.log('다짐 저장:', routineData)
  emit('close')   // 저장 후 팝업 닫기
}

// ✅ 팝업 열릴 때 기본 탭을 'daily'로 설정
onMounted(() => {
  selectedTab.value = 'daily'
})
</script>
