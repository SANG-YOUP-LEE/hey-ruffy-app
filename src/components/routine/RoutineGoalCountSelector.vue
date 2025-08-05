<template>
  <div class="form_box_g">
    <h3>최소 다짐 달성 횟수를 선택해주세요.</h3>
    <div class="notibox_yellow">
      선택하신 달성 횟수를 모두 채우면<br />러피의 산책이 1회 완료 됩니다.<br /><strong>완료시엔 완주 보상이 기다리고 있어요!</strong>
    </div>
    <div class="goal_select">
      <div class="custom-radio-group row">
        <!-- 5회 -->
        <label class="custom-radio">
          <input
            type="radio"
            id="goal1"
            name="goal"
            value="goal1"
            :checked="goalCount === 5"
            @change="handleChange"
          />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal1">5회</label>

        <!-- 10회 -->
        <label class="custom-radio">
          <input
            type="radio"
            id="goal2"
            name="goal"
            value="goal2"
            :checked="goalCount === 10"
            @change="handleChange"
          />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal2">10회</label>

        <!-- 15회 -->
        <label class="custom-radio">
          <input
            type="radio"
            id="goal3"
            name="goal"
            value="goal3"
            :checked="goalCount === 15"
            @change="handleChange"
          />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal3">15회</label>

        <!-- 20회 -->
        <label class="custom-radio">
          <input
            type="radio"
            id="goal4"
            name="goal"
            value="goal4"
            :checked="goalCount === 20"
            @change="handleChange"
          />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal4">20회</label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const goalCount = ref(0)

const handleChange = (event) => {
  const map = {
    goal1: 5,
    goal2: 10,
    goal3: 15,
    goal4: 20
  }
  goalCount.value = map[event.target.value] || 0
}

const setFromRoutine = (routine) => {
  goalCount.value = routine?.goalCount || 0
}

defineExpose({
  goalCount,
  setFromRoutine
})
</script>
