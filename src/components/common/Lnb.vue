<template>
  <div id="lnb">
    <div class="lnb_header">
      <a href="#none" @click.prevent="$emit('close-lnb')">닫기</a>
    </div>

    <!-- 메뉴 영역 -->
    <nav class="lnb_menu">
      <!-- 다른 메뉴 항목들... -->
    </nav>

    <!-- 하단 액션 -->
    <div class="lnb_footer">
      <button type="button" class="btn_login" @click="goLogin">로그인</button>
      <button
        type="button"
        class="btn_logout"
        :disabled="loggingOut"
        @click="logout"
      >
        {{ loggingOut ? '로그아웃 중...' : '로그아웃' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, signOut } from 'firebase/auth'

const router = useRouter()
const emit = defineEmits(['close-lnb'])

const loggingOut = ref(false)

function goLogin() {
  emit('close-lnb')
  router.push('/login') // 로그인 페이지로 이동
}

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    const auth = getAuth()
    await signOut(auth)
    router.replace('/login') // 로그아웃 후 로그인 페이지로 이동
    emit('close-lnb')
  } catch (e) {
    console.error('logout failed:', e)
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
#lnb { display: flex; flex-direction: column; height: 100%; }
.lnb_header { padding: 1rem; border-bottom: 1px solid #eee; }
.lnb_menu { flex: 1; overflow-y: auto; }
.lnb_footer { padding: 1rem; border-top: 1px solid #eee; display: grid; gap: 0.5rem; }
.btn_login,
.btn_logout { width: 100%; padding: 0.9rem 1rem; border: 1px solid #ddd; background: #fff; }
.btn_logout:disabled { opacity: 0.6; cursor: default; }
</style>
