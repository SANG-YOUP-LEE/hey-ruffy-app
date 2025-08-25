<template>
  <div class="no-touch">
    <div class="container">
      <div class="intro_wrap">
        <h1>hey,<br /><em>Ruffy!</em></h1>
        <div class="subtext">
          소소뽀짝 다짐을 이룬 후<br />잠꾸 러피에게 이렇게 말해보세요!<br />산~~~책?
        </div>

        <img src="/src/assets/images/hey_ruffy01.png" alt="러피 이미지" class="ruffy-img" />

        <div class="button">
          <RouterLink class="b_basic" :to="{ name: 'main' }">러피방 구경하기</RouterLink>
          <RouterLink class="b_basic" :to="{ name: 'signup' }">러피랑 친구하기</RouterLink>
        </div>

        <div>
          러피랑 이미 친구라면
          <RouterLink :to="{ name: 'login' }">여기</RouterLink>
          를 눌러주세요!
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
