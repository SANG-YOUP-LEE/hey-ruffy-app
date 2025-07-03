<template>
  <div class="v_container">
    <div class="main_wrap">
      <h3>
        다짐내용
        <div>{{ lastCommitment }}</div>
      </h3>
      <div>안녕 러피</div>
      <h3>
        다짐주기
        <div>다짐 주기 여기다 넣으시오</div>
      </h3>

      <a href="#none" class="add_rout" @click="showPopup = true"
        >+<span>다짐추가</span></a
      >

      <div class="edit_btn">
        <button type="submit">다짐 수정하기</button>
      </div>
    </div>
  </div>

  <!-- 팝업 -->
  <div class="popup_layer" v-if="showPopup">
    <div class="popup_inner_wide">
      <CommitmentForm
        @submit="handleCommitmentSubmit"
        @close="showPopup = false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import CommitmentForm from "@/components/CommitmentForm.vue";

const showPopup = ref(false);
const lastCommitment = ref("");

const handleCommitmentSubmit = async (data) => {
  try {
    await addDoc(collection(db, "commitments"), {
      ...data,
      createdAt: serverTimestamp(),
    });

    lastCommitment.value = data.title;
    showPopup.value = false;
    alert("다짐이 저장되었어요!");
  } catch (error) {
    console.error("❌ 다짐 저장 실패:", error);
    alert("다짐 저장 중 오류가 발생했어요.");
  }
};

watch(showPopup, async (newVal) => {
  if (newVal) {
    await nextTick();
  }
});
</script>
