function bindPopupEvents() {
  // 팝업 열기/닫기
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

  if (repeatTab) {
    repeatTab.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("tab_button")) {
        repeatTab.querySelectorAll(".tab_button").forEach(btn => btn.classList.remove("on"));
        target.classList.add("on");

        const type = target.dataset.type;

        repeatSections.forEach(section => {
          section.style.display = section.dataset.type === type ? "block" : "none";
        });
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindPopupEvents();
});