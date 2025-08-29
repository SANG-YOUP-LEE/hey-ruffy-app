<template>
  <div class="form_box_g">
    <h3>최소 다짐 달성 횟수를 선택해주세요.</h3>
    <div class="notibox_yellow">
      선택하신 달성 횟수를 모두 채우면<br />러피의 산책이 1회 완료 됩니다.<br /><strong>완료시엔 완주 보상이 기다리고 있어요!</strong>
    </div>
    <div class="goal_select">
      <div class="custom-radio-group row">
        <label class="custom-radio">
          <input
            type="radio"
            id="goal1"
            :name="groupName"
            value="5"
            :checked="modelValue === 5"
            @change="onChange"
          />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal1">5회</label>

        <label class="custom-radio">
          <input
            type="radio"
            id="goal2"
            :name="groupName"
            value="10"
            :checked="modelValue === 10"
            @change="onChange"
          />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal2">10회</label>

        <label class="custom-radio">
          <input
            type="radio"
            id="goal3"
            :name="groupName"
            value="15"
            :checked="modelValue === 15"
            @change="onChange"
          />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal3">15회</label>

        <label class="custom-radio">
          <input
            type="radio"
            id="goal4"
            :name="groupName"
            value="20"
            :checked="modelValue === 20"
            @change="onChange"
          />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal4">20회</label>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Number, default: null },
  uniqueName: { type: String, default: 'goal' }
})
const emit = defineEmits(['update:modelValue'])

const groupName = props.uniqueName || 'goal'

const onChange = (e) => {
  const n = parseInt(e.target.value, 10)
  emit('update:modelValue', Number.isFinite(n) ? n : null)
  window.dispatchEvent(new Event('goal-selected')) // ✅ 선택할 때마다 이벤트 발사
}

const setFromRoutine = (routine) => {
  const n = Number(routine?.goalCount)
  emit('update:modelValue', Number.isFinite(n) && n > 0 ? n : null)
}

defineExpose({
  goalCount: { get: () => props.modelValue },
  setFromRoutine
})
</script>
