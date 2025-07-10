<template>
  <div class="v_container">
    <Header @toggle-lnb="isLnbOpen = !isLnbOpen" @toggle-calendar="showCalendar = !showCalendar" />
    <Lnb v-if="isLnbOpen" @close="isLnbOpen = false" />

    <!-- main_wrap -->
    <div class="main_wrap">
      <div class="main_inner">
        <Calendar :visible="showCalendar" />
        <!-- 다짐 내역 그룹 -->
				<div class="form_box_g main">
					<div class="rout_inner">
						<!-- 공통 버튼 -->
						<div class="com_btn">
							<a href="#none" @click.prevent="isSettingOpen = !isSettingOpen">
                <img src="https://img.icons8.com/?size=100&id=6N9JHPf2dwXP&format=png&color=000000">
                <span>설정변경하기</span>
              </a>
						</div>
						<!-- //공통 버튼 -->

						<div class="left">
							<em>외로워도 슬퍼도 탄수화물 끊기</em>
							<!-- 간단 코멘트 -->
							<p class="coment">다음번 건강검진 극락 가즈아!</p>
							<!--// 간단 코멘트 -->
							<div class="detail_box">
								<!-- 달성 체크 전 -->
								<p class="done_icon" v-if="!selectedStatus">
  									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=SIvUzMn4cgQ6&format=png&color=000000"></span>
  									<a href="#none" @click.prevent="openStatusPopup">오늘의 다짐은 어땠나요?</a>
								</p>

								<!-- // 달성 체크전 -->
								<!-- 다짐 성공 -->
								<p class="done_icon green" v-if="selectedStatus === '1'">
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=PEmFcgjhBgKF&format=png&color=000000"></span> <strong>다짐 성공!</strong>
								</p>
								<!-- // 다짐 성공 -->
								<!-- 다짐 실패 -->
								<p class="done_icon pink" v-if="selectedStatus === '2'">
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=Rish2KK6aiTD&format=png&color=000000"></span> <strong>다짐 실패</strong>
								</p>
								<!-- // 다짐 실패 -->
								<!-- 흐린 눈 -->
								<p class="done_icon gray" v-if="selectedStatus === '3'">
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=9VG6Oa5PC1pt&format=png&color=000000"></span> <strong>흐린 눈</strong>
								</p>
								<!-- // 흐린 눈 -->
								<p>
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=73785&format=png&color=000000"></span> 2025.7.10 부터
								</p>
								<p>
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=vwGXRtPWrZSn&format=png&color=000000"></span> 2주마다 월,수,금
								</p>
								<p>
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=54481&format=png&color=000000"></span> 오전 9시 30분
								</p>
								<p>
									<span class="icon temp"><span class="cchart01"></span></span> 이정도 중요해요
								</p>
							</div>
						</div>
						<div class="right">
							<div class="walking">
								<p class="step01"></p>
								<p class="speech-bubble">
									<span>나도 산책 가고 싶당...</span>
								</p>
								<a href="#none" class="step" @click.prevent="isRuffyOpen = !isRuffyOpen">{{ isRuffyOpen ? '러피 상태 닫기' : '러피 상태 열기' }}</a>
							</div>
						</div>
					</div>

					<!-- 러피 상태 보기 -->
					<div class="done_check" v-if="isRuffyOpen">
						<!-- 러피 단계별 -->
						<div class="ruffy_step">
							<div class="walking">
								<!-- step01 -->
								<p class="step01">
									<span>step <em>1</em></span>
								</p>
								<!-- // step01 -->
								<!-- step02 -->
								<p class="step02 off">
									<span>step <em>2</em></span>
								</p>
								<!-- // step02 -->
								<!-- step03 -->
								<p class="step03 off">
									<span>step <em>3</em></span>
								</p>
								<!-- // step01 -->
								<!-- step04 -->
								<p class="step04 off">
									<span>step <em>4</em></span>
								</p>
								<!-- // step04 -->
								<!-- step05 -->
								<p class="step05 off">
									<span>step <em>5</em></span>
								</p>
								<!-- // step05 -->
							</div>
						</div>
						<!-- // 러피 상태 보기 -->
						
					
						

					</div>

					<button v-if="!selectedStatus" @click.prevent="openStatusPopup">오늘의 다짐 현황 선택</button>

					<!-- 설정 팝업 -->
          <div class="setting" v-if="isSettingOpen">
            <button class="close_btn" @click="isSettingOpen = false"><span>팝업 닫기</span></button>
            <a href="#none">
              <img src="https://img.icons8.com/?size=100&id=gDy5dpa1NZQj&format=png&color=000000"> 다짐 수정하기
            </a>
            <a href="#none"
              @click.prevent="isPaused ? openPopup('rut_restart') : openPopup('rut_stop')">
              <img src="https://img.icons8.com/?size=100&id=JsKfjywDmtY0&format=png&color=000000">
              {{ isPaused ? '다짐 다시 시작하기' : '다짐 잠시 멈추기' }}
            </a>
            <a href="#none" @click.prevent="openPopup('rut_share')">
              <img src="https://img.icons8.com/?size=100&id=90278&format=png&color=000000"> 다짐 공유하기
            </a>
            <a href="#none" @click.prevent="openPopup('rut_del')">
              <img src="https://img.icons8.com/?size=100&id=KPhFC2OwpbWV&format=png&color=000000">다짐 삭제 하기
            </a>
          </div>
					<!-- //설정 팝업 -->
				</div>
				<!-- // 다짐 내역 그룹 -->

      </div>
    </div>
    <Footer />
  </div>

	<!-- 레이어 팝업 -->
	<div class="popup_overlay" v-if="activePopupId">

      <!-- 오늘의 다짐 달성 현황 -->
      <div class="popup_box" id="rut_status" v-if="activePopupId === 'rut_status'">
        <button class="close_btn" @click="closePopup"><span>팝업 닫기</span></button>
        <div class="done_check_pop">
          <h2>오늘의 다짐은 어땠나요?</h2>
          <div class="check_wrap">
            <label class="pretty-radio-block">
              <input type="radio" name="rut_status" value="1" v-model="selectedStatusTemp" />
              <span class="radio-style"></span>
              달성
              <p class="comment" v-if="selectedStatusTemp === '1'">
                <img src="https://img.icons8.com/?size=100&id=DgnWHpQwsSUq&format=png&color=000000">
                WOW! 오늘도 갓생 달성! 정말 어디까지 대단할래?
              </p>
            </label>

            <label class="pretty-radio-block">
              <input type="radio" name="rut_status" value="2" v-model="selectedStatusTemp" />
              <span class="radio-style"></span>
              미달성
              <p class="comment" v-if="selectedStatusTemp === '2'">
                <img src="https://img.icons8.com/?size=100&id=DgnWHpQwsSUq&format=png&color=000000">
                괜찮아! 다이어트와 다짐은 원래 내일부터가 국룰!
              </p>
            </label>

            <label class="pretty-radio-block">
              <input type="radio" name="rut_status" value="3" v-model="selectedStatusTemp" />
              <span class="radio-style"></span>
              흐린 눈
              <p class="comment" v-if="selectedStatusTemp === '3'">
                <img src="https://img.icons8.com/?size=100&id=DgnWHpQwsSUq&format=png&color=000000">
                걱정마! 오늘은 정말 어쩔 수 없던거 알아. 달성 현황에는 반영하지 않을게.
              </p>
            </label>
          </div>
          <button class="pop_btm" @click="saveRoutineStatus">
  						{{ selectedStatusTemp ? '다짐 현황 저장' : '다짐 현황을 선택해주세요.' }}
					</button>
        </div>
      </div>
      <!-- // 오늘의 다짐 달성 현황 -->

      <!-- 다짐 잠시 멈추기 -->
      <div class="popup_box" id="rut_stop" v-if="activePopupId === 'rut_stop'">
        <button class="close_btn" @click="closePopup"><span>팝업 닫기</span></button>
        <div class="alert stop">
          <h2>다짐을 잠시 멈출까요?</h2>
          <p class="comment">
            <strong>다짐에 관한 모든 진행이 잠시 멈출거예요.</strong>
            러피도 잠깐 츄르꿈을 꾸고 있을게요.<br />다짐은 언제든 다시 시작할 수 있답니다.
          </p>
          <button class="pop_btm" @click="() => { pauseCommitment(); closePopup(); }">다짐 잠시 멈추기</button>
        </div>
      </div>
      <!-- 다짐 잠시 멈추기 -->

      <!-- 다짐 다시 시작하기 -->
      <div class="popup_box" id="rut_restart"  v-if="activePopupId === 'rut_restart'">
        <button class="close_btn"  @click="closePopup"><span>팝업 닫기</span></button>
        <div class="alert stop">
          <h2>다짐을 다시 시작할까요?</h2>
          <p class="comment">
            <strong>다짐에 관한 모든 진행을<br />다시 시작할 수 있어요.</strong>
            화이팅할 준비가 된 당신을<br />
            프로펠러 꼬리를 흔들며 러피가 응원합니다!
          </p>
          <button class="pop_btm" @click="() => { resumeCommitment(); closePopup(); }">다짐 다시 시작하기</button>
        </div>
      </div>
      <!-- 다짐 다시 시작하기 -->

      <!-- 다짐 공유하기 -->
      <div class="popup_box" id="rut_share"  v-if="activePopupId === 'rut_share'">
        <button class="close_btn" @click="closePopup"><span>팝업 닫기</span></button>
        <div class="alert stop">
          <h2>다짐을 공유해 볼까요?</h2>
          <p class="comment">
            <strong>소소뽀짝한 당신의 다짐을<br />자랑해보세요.</strong>
            당신을 향한 좋아요도 함께 늘어날거예요.
          </p>
          <p class="sns">
            <img src="https://img.icons8.com/?size=100&id=BH0XTdh770dG&format=png&color=000000">
            <img src="https://img.icons8.com/?size=100&id=Xy10Jcu1L2Su&format=png&color=000000">
            <img src="https://img.icons8.com/?size=100&id=phOKFKYpe00C&format=png&color=000000">
            <img src="https://img.icons8.com/?size=100&id=5Pfj1WKgkfpk&format=png&color=000000">
          </p>

          <button class="pop_btm" @click="closePopup">다짐 공유하기</button>
        </div>
      </div>
      <!-- 다짐 공유하기 -->

      <!-- 다짐 삭제하기 -->
      <div class="popup_box"  id="rut_del" v-if="activePopupId === 'rut_del'">
        <button class="close_btn" @click="closePopup"><span>팝업 닫기</span></button>
        <div class="alert stop">
          <h2>다짐을 삭제할까요?</h2>
          <p class="comment">
            <strong>삭제된 다짐은 되돌릴 수 없어요.</strong>
            더 행복해지기 위한 당신의 작은 다짐들<br />
            러피가 영원히 기억할게요.
          </p>
          <button class="pop_btm" @click="closePopup">다짐 삭제하기</button>
          <button class="pop_btm white" @click="closePopup">다짐 삭제 취소하기</button>

        </div>
      </div>
      <!-- 다짐 삭제하기 -->
	</div>
	<!--// 레이어 팝업 -->

  <!--다짐 추가하기-->
  <button class="add_rout" @click="isAddRoutineOpen = true">
    <img src="https://img.icons8.com/?size=100&id=11255&format=png&color=000000">
    <span>다짐 추가하기</span>
  </button>
  <!--//다짐 추가하기-->
  <AddRoutineSelector v-if="isAddRoutineOpen" @close="isAddRoutineOpen = false" />
</template>

<script setup>
import { ref } from 'vue'
import { usePopup } from '@/assets/js/usePopup.js'
import Header from '@/components/common/Header.vue'
import Footer from '@/components/common/Footer.vue'
import Lnb from '@/components/common/Lnb.vue'
import AddRoutineSelector from '@/components/AddRoutineSelector.vue'
import Calendar from '@/components/common/Calendar.vue'

// 사이드바, 캘린더, 러피 상태, 추가 팝업 열림 여부
const isLnbOpen = ref(false)
const showCalendar = ref(false)
const isRuffyOpen = ref(false)
const isAddRoutineOpen = ref(false)

// 다짐 상태 관련
const selectedStatus = ref(null)       // 실제 메인에 보여지는 상태
const selectedStatusTemp = ref(null)   // 팝업 내 임시 상태

// 팝업 관련
const {
  activePopupId,
  isSettingOpen,
  isPaused,
  openPopup,
  closePopup,
  pauseCommitment,
  resumeCommitment
} = usePopup()

// 다짐 상태 팝업 열기: 임시 선택값 초기화
function openStatusPopup() {
  selectedStatusTemp.value = selectedStatus.value
  openPopup('rut_status')
}

// 저장 버튼 클릭 시에만 상태 반영
function saveRoutineStatus() {
  if (selectedStatusTemp.value) {
    selectedStatus.value = selectedStatusTemp.value
    closePopup()
  }
}
</script>

<style>
.form_box_g.main button {
	width:100%;
	margin-top:0.5rem;
	line-height:2.5rem;
	border-radius:1rem;
	border:0.1rem solid #333;
	font-weight:bold;
	background-color:#fff
}
.setting .close_btn {
	border:none!important
}

.done_check {
	margin-top:-0.5rem;
}

.detail_box span[class^='cchart'] {
	width:60%;
	height:60%;
	display: flex;
  justify-content: center;  /* 가로 중앙 */
  align-items: center;   
}
</style>



