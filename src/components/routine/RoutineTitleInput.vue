<template>
  <div class="form_box_g">
    <h3>다짐 제목을 적어주세요.</h3>
    <p>
      <label for="rt_name">새 다짐 명</label>
      <input
        id="rt_name"
        type="text"
        placeholder="ex)외로워도 슬퍼도 탄수화물 끊기"
        class="uline"
        v-model="title"
      />
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('')

// 수정모드일 때 기존 제목 세팅용
const setFromRoutine = (routine) => {
  title.value = routine?.title || ''
}

// 부모에서 접근할 수 있도록 노출
// 부모에서 접근할 수 있도록 노출
defineExpose({
  title,
  setFromRoutine
})

</script>
