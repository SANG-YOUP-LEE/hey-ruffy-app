<template>
  <div class="v_container">
    <Header @toggle-lnb="isLnbOpen = !isLnbOpen" @toggle-calendar="showCalendar = !showCalendar" />
    <Lnb v-if="isLnbOpen" @close="isLnbOpen = false" />
    <!-- main_wrap -->
    <div class="main_wrap">
      <div class="main_inner">


        <!-- 다짐 달력 그룹-->
				<div class="calendar-container" v-if="showCalendar">
          <!-- 상단: 년/월 및 이전/다음 버튼 -->
          <div class="calendar-header">
            <button class="prev-btn">&lt;</button>

            <div class="month-year">
              <span class="year">2025</span>
              <button class="edit-btn">✏️</button>
              <span class="month">7월</span>
              <button class="edit-btn">✏️</button>
            </div>

            <button class="next-btn">&gt;</button>
          </div>
          <!-- 달력 날짜: 7 x 5 = 35칸 -->
          <div class="calendar-grid">
            <!-- 예: 7월 1일이 월요일이라고 가정하면 앞 빈칸 0개 -->
            <div class="day">1</div>
            <div class="day">2</div>
            <div class="day">3</div>
            <div class="day">4</div>
            <div class="day">5</div>
            <div class="day">6</div>
            <div class="day">7</div>
            <div class="day">8</div>
            <div class="day">9</div>
            <div class="day">10</div>
            <div class="day">11</div>
            <div class="day">12</div>
            <div class="day">13</div>
            <div class="day">14</div>
            <div class="day">15</div>
            <div class="day">16</div>
            <div class="day">17</div>
            <div class="day">18</div>
            <div class="day">19</div>
            <div class="day">20</div>
            <div class="day">21</div>
            <div class="day">22</div>
            <div class="day">23</div>
            <div class="day">24</div>
            <div class="day">25</div>
            <div class="day">26</div>
            <div class="day">27</div>
            <div class="day">28</div>
            <div class="day">29</div>
            <div class="day">30</div>
            <div class="day">31</div>
            <div class="day empty"></div>
            <div class="day empty"></div>
            <div class="day empty"></div>
            <div class="day empty"></div>
          </div>
        </div>
				<!-- //다짐 달력 그룹-->


        <!-- 다짐 내역 그룹 -->
				<div class="form_box_g main">
					<div class="rut_inner">
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
								<p class="done_icon">
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=37896&format=png&color=000000"></span> <a href="#none" @click.prevent="openPopup('rut_status')">오늘의 다짐은 어땠나요?</a>
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
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=vwGXRtPWrZSn&format=png&color=000000"></span> 2주마다 월,수,금
								</p>
								<p>
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=54481&format=png&color=000000"></span> 오전 9시 30분
								</p>
								<p>
									<span class="icon temp"><img src="https://img.icons8.com/?size=100&id=Zyo5wDjgJxRW&format=png&color=000000"></span> 이정도 중요해요
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
            <p class="rut_status01">
              <label class="pretty-radio">
                <input type="radio" name="rut_status" value="1" v-model="selectedStatus" />
                <span class="radio-style"></span>
              </label>
              달성
              <p class="comment"  v-if="selectedStatus === '1'"><img src="https://img.icons8.com/?size=100&id=DgnWHpQwsSUq&format=png&color=000000"> WOW! 오늘도 갓생 달성! 정말 어디까지 대단할래?</p>
            </p>

            <p class="rut_status02">
              <label class="pretty-radio">
                <input type="radio" name="rut_status" value="2" v-model="selectedStatus" />
                <span class="radio-style"></span>
              </label>
              미달성
              <p class="comment"  v-if="selectedStatus === '2'"><img src="https://img.icons8.com/?size=100&id=DgnWHpQwsSUq&format=png&color=000000"> 괜찮아! 다이어트와 다짐은 원래 내일부터가 국룰!</p>
            </p>

            <p class="rut_status03">
              <label class="pretty-radio">
                <input type="radio" name="rut_status" value="3" v-model="selectedStatus" />
                <span class="radio-style"></span>
              </label>
              흐린 눈
              <p class="comment"  v-if="selectedStatus === '3'"><img src="https://img.icons8.com/?size=100&id=DgnWHpQwsSUq&format=png&color=000000"> 걱정마! 오늘은 정말 어쩔 수 없던거 알아. 달성 현황에는 반영하지 않을게.</p>
            </p>
          </div>
          <button class="pop_btm" @click="closePopup">
            {{ selectedStatus ? '다짐 현황 저장' : '다짐 현황을 선택해주세요.' }}
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
</template>

<script setup>
import { ref } from 'vue'
import { usePopup } from '@/assets/js/usePopup.js'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import Lnb from '@/components/Lnb.vue'

const isLnbOpen = ref(false)
const showCalendar = ref(false)
const isRuffyOpen = ref(false)
const selectedStatus = ref(null)

const {
  activePopupId,
  isSettingOpen,
  isPaused,
  openPopup,
  closePopup,
  pauseCommitment,
  resumeCommitment
} = usePopup()
</script>
