<template>
  <div class="done_group">
    <div v-if="selected === 'notdone'" class="not_done">
      <!-- 다짐 카드 -->
      <div class="routine_card">
        <div class="rc_inner">
          <div class="left">
            <p class="title">
              <span class="color_picker01"></span>
              외로워도 슬퍼도 나는 안울어
            </p>
            <p class="term">
              <i>Daily</i> 월,화,수,목,금
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
            <div class="ruffys_item">
              <span class="ruffy01">퓨리러피</span>
            </div>
          </div>
        </div>
      </div>
      <!-- //다짐 카드 -->

      <!-- 다짐 카드 -->
      <div class="routine_card">
        <div class="rc_inner">
          <div class="left">
            <p class="title">
              <span class="color_picker02"></span>
              외로워도 슬퍼도 나는 안울어2
            </p>
            <p class="term">
              <i>Weekly</i> 2주마다, 월,화,수
            </p>
            <p class="se_date">
              2025.03.17 ~ 2025.04.18
            </p>
          </div>

          <div class="right">
            <div class="ruffys_item">
              <span class="ruffy02">도리러피</span>
            </div>
          </div>
        </div>
      </div>
      <!-- //다짐 카드 -->

      <!-- 다짐 카드 -->
      <div class="routine_card">
        <div class="rc_inner">
          <div class="left">
            <p class="title">
              <span class="color_picker03"></span>
              외로워도 슬퍼도 나는 안울어3
            </p>
            <p class="term">
              <i>Monthly</i> 1,2,3,4
            </p>
          </div>

          <div class="right">
            <div class="ruffys_item">
              <span class="ruffy03">퓨리러피</span>
            </div>
          </div>
        </div>
      </div>
      <!-- //다짐 카드 -->
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
