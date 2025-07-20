<template>
  <div class="no-touch">
    <div class="container">
      <div class="intro_wrap">
        <h1>hey,<br /><em>Ruffy!</em></h1>
        <div class="subtext">
          소소뽀짝 다짐을 이룬 후<br />잠꾸 러피에게 이렇게 말해보세요!<br />산~~~책?
        </div>
        <img
          src="/src/assets/images/hey_ruffy01.png"
          alt="러피 이미지"
          class="ruffy-img"
        />
        <div class="button">
          <a href="#none" class="b_green" @click="goToExplore">러피방 구경하기</a>
          <a href="#none" class="b_green" @click="goToSignup">러피랑 친구맺기</a>
        </div>
        <div>
          러피랑 이미 친구라면 <a href="#none" @click="goToLogin">여기</a>를
          눌러주세요!
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

// 친구맺기 → 회원가입
const goToSignup = () => router.push("/signup");

// 로그인
const goToLogin = () => router.push("/login");

// 메인
const goToExplore = () => {
  router.push("/main");
};
</script>
