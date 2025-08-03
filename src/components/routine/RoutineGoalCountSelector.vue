<template>
  <div class="form_box_g">
    <h3>최소 다짐 달성 횟수를 선택해주세요.</h3>
    <div class="notibox_yellow">
      선택하신 달성 횟수를 모두 채우면<br />러피의 산책이 1회 완료 됩니다.<br /><strong>완료시엔 완주 보상이 기다리고 있어요!</strong>
    </div>
    <div class="goal_select">
      <div class="custom-radio-group row">
        <label class="custom-radio">
          <input type="radio" name="choice" value="goal1" />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal1">5회</label>

        <label class="custom-radio ">
          <input type="radio" name="choice" value="goal2" />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal2">10회</label>

        <label class="custom-radio">
          <input type="radio" name="choice" value="goal3" />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal3">15회</label>

         <label class="custom-radio">
          <input type="radio" name="choice" value="goal4" />
          <span class="circle"></span>
        </label>
        <label class="radio-desc" for="goal4">20회</label>
      </div>
    </div>
  </div>
</template>
