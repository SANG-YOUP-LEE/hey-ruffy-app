<template>
  <div class="done_group">
    <div v-if="selected === 'notdone'" class="not_done">
      <div class="routine_card">
        <div class="rc_inner">
          <p class="title"><span class="color_picker01">외로워도 슬퍼도 나는 안울어</span></p>
        </div>
      </div>
    </div>
    <div v-if="selected === 'done'" class="done">달성후</div>
    <div v-if="selected === 'ignored'" class="ignored">흐린눈</div>
    <div v-if="selected === 'weekly'" class="weekly_done">주간 다짐</div>
  </div>
</template>

<script setup>
defineProps({
  selected: String
})
</script>
