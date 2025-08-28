import { defineStore } from "pinia";

// 앱 전역에서 써도 부작용 없는 최소 스토어 (당장 안 써도 안전)
export const useAppStore = defineStore("app", {
  state: () => ({
    ready: true,          // 헬스체크용
    // 필요한 전역 값은 이후에 여기에 추가 (예: modalOpen, lnbOpen 등)
  }),
  actions: {
    // 예: toggleLnb() { this.lnbOpen = !this.lnbOpen }
  }
});
