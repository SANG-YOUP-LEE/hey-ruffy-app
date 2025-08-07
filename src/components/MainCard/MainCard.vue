<template>
  <div class="done_group">
    <div v-if="selected === 'notdone'" class="not_done">
      <div class="routine_card">
        <div class="rc_inner">
          <div class="left">
            <p class="title">
              <span class="color_picker01"></span> 외로워도 슬퍼도 나는 안울어
            </p>
            <p class="term">
              월,화,수,목,금
            </p>
            <p class="se_date">
              2025.03.17 ~ 2025.04.18
            </p>
            <p class="alaram">
              am 07:00
            </p>
            <p class="comment">
              건강검진 극락가자!
            </p>
          </div>

          <div class="right">
            right
          </div>
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
