<template>
  <div class="intro-container">
    <h1>hey,<br /><span class="highlight">Ruffy!</span></h1>
    <p class="subtitle">
      소소뽀짝 다짐을 이루고<br />
      잠꾸 러피에게 이렇게 말해요!<br />
      <strong>산~~~책?</strong>
    </p>
    <img class="ruffy-img" :src="ruffyImage" alt="러피 이미지" />

    <!-- 버튼 영역 -->
    <button class="btn" @click="goToExplore">러피방 구경하기</button>
    <button class="btn" @click="goToSignup">러피랑 친구맺기</button>

    <p class="footer">
      러피랑 이미 친구라면 <span class="link" @click="goToLogin">여기</span>를 눌러줘!
    </p>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import ruffyImage from '@/assets/ruffy.png' // 이미지 import

const router = useRouter()

// 친구맺기 → 회원가입
const goToSignup = () => router.push('/signup')

// 로그인
const goToLogin = () => router.push('/login')

// 🔜 향후 기능 확장을 위해 준비만 해둔 함수
const goToExplore = () => {
  // 아직은 아무 기능 없음
  // 나중에 '/explore' 같은 페이지 연결 가능
}
</script>

<style scoped>
.intro-container {
  text-align: center;
  padding: 40px 20px;
  background-color: #fff7f0;
  min-height: 100vh;
}

h1 {
  font-size: 38px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #444;
}

.highlight {
  color: #4a90e2;
}

.subtitle {
  font-size: 18px;
  color: #333;
  margin-bottom: 24px;
  line-height: 1.6;
}

.ruffy-img {
  width: 180px;
  margin-bottom: 30px;
}

.btn {
  display: block;
  width: 80%;
  max-width: 280px;
  margin: 10px auto;
  padding: 14px;
  font-size: 16px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.footer {
  margin-top: 20px;
  font-size: 14px;
  color: #444;
}

.link {
  color: #4a90e2;
  font-weight: bold;
  cursor: pointer;
}
</style>
