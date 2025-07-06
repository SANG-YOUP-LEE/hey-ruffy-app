<template>
  <div class="paper">
    <form @submit.prevent="handleSubmit">
      <!-- 다짐명 입력 -->
      <div class="p_title">
        <h3><label>당신의 다짐을 말해주세요.</label></h3>
        <div class="input_set">
          <input
            v-model="title"
            type="text"
            placeholder="ex)외로워도 슬퍼도 탄수화물 끊기"
            required
          />
        </div>
        <FrequencySelector ref="freqRef" />
      </div>

      <!-- 저장 버튼 -->
      <div class="save_btn">
        <button type="submit">다짐 저장하기</button>
      </div>

      <!-- 닫기 버튼 -->
      <button class="close_btn" type="button" @click="handleClose">
        <span>닫기</span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import FrequencySelector from "./FrequencySelector.vue";
const emit = defineEmits(["submit", "close"]);

const title = ref("");
const reminder = ref("");
const importance = ref("⭐️");
const note = ref("");
const description = ref("");
const freqRef = ref(null);

const handleSubmit = () => {
  const freqData = freqRef.value?.getSelectedData?.() || {};

  emit("submit", {
    title: title.value,
    description: description.value,
    frequencyMode: freqData.mode || "",
    selectedDays: freqData.days || [],
    startPeriod: freqData.timeRange?.startPeriod || "",
    startHour: freqData.timeRange?.startHour || "",
    startMinute: freqData.timeRange?.startMinute || "",
    endPeriod: freqData.timeRange?.endPeriod || "",
    endHour: freqData.timeRange?.endHour || "",
    endMinute: freqData.timeRange?.endMinute || "",
    reminder: reminder.value,
    importance: importance.value,
    note: note.value,
  });

  // 초기화
  title.value = "";
  reminder.value = "";
  importance.value = "⭐️";
  note.value = "";
  description.value = "";
  emit("close");
};

const handleClose = () => {
  emit("close");
};
</script>
