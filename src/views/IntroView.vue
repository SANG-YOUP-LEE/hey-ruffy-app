<template>
  <div class="container">
    <div class="intro_wrap">
      <h1>hey,<br />Ruffy!</h1>
      <div class="subtext">
        소소뽀짝 다짐을 이룬 후<br />잠꾸 러피에게 이렇게 말해보세요!<br />산~~~책?
      </div>
      <img
        src="/src/assets/images/hey_ruffy01.png"
        alt="러피 이미지"
        class="ruffy-img"
      />
      <div class="button">
        <a href="#" @click="goToExplore">러피방 구경하기</a>
        <a href="#" @click="goToSignup">러피랑 친구맺기</a>
      </div>
      <div class="footer-text">
        러피랑 이미 친구라면 <a href="#" @click="goToLogin">여기</a>를
        눌러주세요!
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import ruffyImage from "@/assets/ruffy.png"; // 이미지 import

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
