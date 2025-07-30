<template>
  <div class="v_container">
    <Header @toggle-lnb="isLnbOpen = !isLnbOpen"  />
    <Lnb v-if="isLnbOpen" @close="isLnbOpen = false" />
    <div class="main_wrap">
      <div class="main_inner">
      </div>
    </div>

    <Footer />
    <button class="add_rout" @click="openAddRoutine">
      <img src="https://img.icons8.com/?size=100&id=11255&format=png&color=000000">
      <span>다짐 추가하기</span>
    </button>
</template>


