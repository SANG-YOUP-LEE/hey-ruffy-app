<!-- src/components/common/Lnb.vue -->
<template>
  <div class="lnb">
    <div class="lnb_header">
      <a href="#none" @click.prevent="handleClose" class="close"><span>닫기</span></a>
    </div>

    <div class="lnb_switch lnb_wrap" :class="{ open: !!section }">
      <div class="lnb_panel lnb_main">
        <div class="lnb_user">
          <div class="avatar">
            <img :src="user ? ruffySrc : DEFAULT_RUFFY" alt="Ruffy">
            <button v-if="ready && user" class="edit_p"><span>사진편집</span></button>
          </div>
          <div class="nick">
            <span v-if="ready && user">{{ profile?.nickname || '' }}</span>
            <a v-else href="#none" @click.prevent="goLogin">로그인 해주세요.</a>
          </div>
        </div>

        <div class="lnb_menu">
          <a @click.prevent="goSection('account')" class="login" v-show="ready && user">계정 관리</a>
          <a @click.prevent="goSection('routine')" class="login" v-show="ready && user">다짐 현황보기</a>
          <a @click.prevent="goSection('walk')" class="login" v-show="ready && user">산책 현황보기</a>
          <a @click.prevent="goSection('diary')" class="login" v-show="ready && user">일기장 엿보기</a>
          <a @click.prevent="goSection('about')">러피에 대해 더 알고 싶어요.</a>
          <a @click.prevent="goSection('premier')">러피와 두 발 더 가까워지기</a>
        </div>

        <div class="lnb_footer">
          <a v-if="ready && user" href="#none" @click.prevent="logout">로그아웃</a>
          <span class="ver">ver 0.0</span>
        </div>
      </div>

      <div class="lnb_panel lnb_detail">
        <div v-show="section === 'account'">
          <h2>계정 관리</h2>
          <a href="#none" @click.prevent="goCharacter">캐릭터변경</a>
          <a href="#none">메뉴2</a>
          <a href="#none">메뉴3</a>
          <a href="#none">메뉴4</a>
          <a href="#none">메뉴5</a>
        </div>
        <div v-show="section === 'routine'">
          <h2>다짐 현황</h2>
          <a href="#none" @click.prevent="deleteAllRoutines">다짐 모두 삭제하기</a>
          <a href="#none">메뉴2</a>
          <a href="#none">메뉴3</a>
          <a href="#none">메뉴4</a>
          <a href="#none">메뉴5</a>
        </div>
        <div v-show="section === 'walk'">
          <h2>산책 현황</h2>
          <a href="#none">메뉴1</a>
          <a href="#none">메뉴2</a>
          <a href="#none">메뉴3</a>
          <a href="#none">메뉴4</a>
          <a href="#none">메뉴5</a>
        </div>
        <div v-show="section === 'diary'">
          <h2>일기장</h2>
          <a href="#none">메뉴1</a>
          <a href="#none">메뉴2</a>
          <a href="#none">메뉴3</a>
          <a href="#none">메뉴4</a>
          <a href="#none">메뉴5</a>
        </div>
        <div v-show="section === 'about'">
          <h2>러피에 대해 더 알고 싶어요</h2>
          <a href="#none">메뉴1</a>
          <a href="#none">메뉴2</a>
          <a href="#none">메뉴3</a>
          <a href="#none">메뉴4</a>
          <a href="#none">메뉴5</a>
        </div>
        <div v-show="section === 'premier'">
          <h2>유료구매하거라</h2>
          <a href="#none">메뉴1</a>
          <a href="#none">메뉴2</a>
          <a href="#none">메뉴3</a>
          <a href="#none">메뉴4</a>
          <a href="#none">메뉴5</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getAuth, signOut } from 'firebase/auth'
import { useAuthStore } from '@/stores/auth'
import { useRoutinesStore } from '@/stores/routines'
import { useModalStore } from '@/stores/modal'

const emit = defineEmits(['close'])
const router = useRouter()
const route = useRoute()
const a = useAuthStore()
const rStore = useRoutinesStore()
const modal = useModalStore()

const section = computed(() => route.query.section || '')
const user = computed(() => a.user)
const ready = computed(() => a.ready)
const profile = computed(() => a.profile)

const RUFFY_MAP = {
  option1: new URL('@/assets/images/hey_ruffy_temp01.png', import.meta.url).href,
  option2: new URL('@/assets/images/hey_ruffy_temp02.png', import.meta.url).href,
  option3: new URL('@/assets/images/hey_ruffy_temp03.png', import.meta.url).href,
  option4: new URL('@/assets/images/hey_ruffy_temp04.png', import.meta.url).href,
}
const DEFAULT_RUFFY = new URL('@/assets/images/ico_user_gray.png', import.meta.url).href
const ruffySrc = computed(() =>
  (profile.value?.selectedRuffy ? RUFFY_MAP[profile.value.selectedRuffy] : DEFAULT_RUFFY)
)

function goLogin() { router.push('/login') }

async function logout() {
  try { await signOut(getAuth()) } finally {
    a.$patch({ user: null, profile: null, ready: true })
    emit('close')
    router.replace({ path: '/main', query: {} })
  }
}

// ✅ 모두 삭제: 스토어의 deleteAllRoutines()만 호출
async function deleteAllRoutines() {
  const ok = await modal.confirm({
    title: '다짐 모두 삭제',
    message: '정말 삭제할까요? 다짐과 알림이 모두 삭제됩니다. 되돌릴 수 없어요.',
    okText: '확인',
    cancelText: '취소',
  })
  if (!ok) return

  await rStore.deleteAllRoutines()

  await modal.confirm({
    title: '완료',
    message: '다짐과 알림이 모두 삭제되었습니다.',
    okText: '확인',
    cancelText: '',
  })

  emit('close')
  router.replace('/main')
}

function handleClose() {
  if (section.value) {
    router.replace({ path: '/lnb', query: {} })
  } else {
    emit('close')
    router.replace('/main')
  }
}

function goSection(name) {
  router.replace({ path: '/lnb', query: { section: name } })
}

function goCharacter(){
  router.push({ name: 'LnbRuffyPick' })
}
</script>
