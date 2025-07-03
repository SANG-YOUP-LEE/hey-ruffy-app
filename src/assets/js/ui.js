function bindPopupEvents() {
  const addBtn = document.querySelector(".add_rout");
  const popup = document.getElementById("popup");
  const closeBtn = document.querySelector(".close_btn");

  if (addBtn && popup && closeBtn) {
    addBtn.addEventListener("click", () => {
      popup.style.display = "flex";
      setTimeout(bindTabEvents, 10); // 팝업 열릴 때 탭 이벤트 바인딩
    });

    closeBtn.addEventListener("click", () => {
      popup.style.display = "none";
    });
  }
}

function bindTabEvents() {
  const repeatTab = document.getElementById("repeatTab");
  const repeatSections = document.querySelectorAll(".repeat_section");

  if (!repeatTab) return;

  repeatTab.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("tab_button")) {
      // 탭 버튼 on 클래스 토글
      repeatTab
        .querySelectorAll(".tab_button")
        .forEach((btn) => btn.classList.remove("on"));
      target.classList.add("on");

      // 선택한 탭 타입
      const selectedType = target.dataset.type;

      // 하단 섹션 표시/숨김 처리
      repeatSections.forEach((section) => {
        section.style.display =
          section.dataset.type === selectedType ? "block" : "none";
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindPopupEvents();
});
