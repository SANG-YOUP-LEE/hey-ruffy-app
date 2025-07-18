<template>
  <div class="popup_overlay">
    <div class="lnb_wrap">
      <!-- 닉네임 + 닫기버튼 -->
      <div class="lnb_header">
        <p class="welcome_msg">{{ nickname }}님, 환영합니다.</p>
        <button class="close_btn" @click.prevent="$emit('close')" type="button">✕</button>
      </div>

      <!-- 전체 메뉴 영역 -->
      <div class="lnb_body">
        <ul class="lnb_menu">
          <li>
            <router-link to="/main" @click="$emit('close')">내 다짐</router-link>
          </li>
          <li>
            <router-link to="/settings" @click="$emit('close')">설정</router-link>
          </li>
          <li>
            <button @click="logout" type="button">로그아웃</button>
          </li>
          <li>
            <button @click="withdraw" type="button">회원탈퇴</button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { getAuth, signOut, deleteUser } from 'firebase/auth'
import { ref, onMounted } from 'vue'

// ✅ 사이드 메뉴 닫기용 이벤트 선언
const emit = defineEmits(['close'])

const router = useRouter()
const auth = getAuth()
const nickname = ref('사용자')

onMounted(() => {
  const user = auth.currentUser
  if (user && user.displayName) {
    nickname.value = user.displayName
  }
})

const logout = async () => {
  await signOut(auth)
  emit('close') // 메뉴 닫기
  router.push('/login')
}

const withdraw = async () => {
  const confirmed = confirm('정말로 회원탈퇴 하시겠어요? 탈퇴 시 모든 정보가 삭제됩니다.')
  if (!confirmed) return

  const user = auth.currentUser
  if (user) {
    try {
      await deleteUser(user)
      alert('회원탈퇴가 완료되었습니다.')
      emit('close')
      router.push('/signup')
    } catch (error) {
      alert('회원탈퇴에 실패했습니다.\n최근 로그인한 사용자만 탈퇴할 수 있어요.\n다시 로그인 후 시도해주세요.')
      emit('close')
      router.push('/login')
    }
  }
}
</script>

<style scoped>
.popup_overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
}
.lnb_wrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 16rem;
  height: 100%;
  background: #fff;
  padding: 1.5rem;
  box-shadow: 0 0 1rem rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

/* 헤더 */
.lnb_header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.welcome_msg {
  font-size: 1.1rem;
  font-weight: 600;
  color: #222;
}
.close_btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #666;
  cursor: pointer;
}

/* 본문 */
.lnb_body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* 메뉴 */
.lnb_menu {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.lnb_menu li a,
.lnb_menu li button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.7rem;
  font-size: 1rem;
  color: #333;
  background: none;
  border: none;
  text-decoration: none;
  font-weight: 500;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.lnb_menu li a:hover,
.lnb_menu li button:hover {
  background-color: #f0f0f0;
  color: #000;
}
</style>

