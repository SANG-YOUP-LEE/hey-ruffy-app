<template>
  <div class="welcome-container">
    <h2>🎉 로그인 완료!</h2>
    <p>헤이 러피와 함께 시작해볼까요?</p>
    <button @click="goToAddCommitment">다짐하러 가기</button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToAddCommitment = () => {
  router.push('/add')
}
</script>

<style scoped>
.welcome-container {
  max-width: 500px;
  margin: 5rem auto;
  padding: 2rem;
  text-align: center;
  background: #fffbe6;
  border-radius: 12px;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

h2 {
  font-size: 1.8rem;
  margin-bottom: 1rem;
}

p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

button {
  padding: 0.75rem 1.5rem;
  background-color: peachpuff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #f7c99b;
}
</style>
