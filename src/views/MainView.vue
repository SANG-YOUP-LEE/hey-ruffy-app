<template>
  <div class="v_container">
    <div class="main_wrap">
      <h2>
        다짐내용
        <div>
           이걸 지우고 여기다 뿌려주세요
        </div>
      </h2>
      <a href="#none" class="add_rout" @click="showPopup = true">+<span>다짐추가</span></a>
    </div>
  </div>

  <!-- 팝업 -->
  <div class="popup_layer" v-if="showPopup">
    <div class="popup_inner_wide">
      <div class="paper">
            <!-- 다짐명 입력 -->
            <div class="p_title">
                <h3>당신의 다짐을 말해주세요.</h3>
                <div class="input_set">
                    <input type="text" placeholder="ex)외로워도 슬퍼도 탄수화물 끊기">
                </div>
            </div>
            <!-- //다짐명 입력 -->

            <!-- 다짐 주기 설정 -->
            <div class="p_group">                   
                <h3>얼마나 자주 반복해야 하나요?</h3>
                <div class="input_set">
                    <!-- 주기 설정 탭-->
                    <div class="button" id="repeatTab">
                        <a href="#none" class="tab_button" :class="{ on: selectedTab === 'daily' }" @click="selectedTab = 'daily'" data-type="daily">요일별</a>
                        <a href="#none" class="tab_button" :class="{ on: selectedTab === 'weekly' }" @click="selectedTab = 'weekly'" data-type="weekly">주별</a>
                        <a href="#none" class="tab_button" :class="{ on: selectedTab === 'monthly' }" @click="selectedTab = 'monthly'" data-type="monthly">월별</a>
                    </div>
                    <!-- //주기 설정 탭-->
                
                    
                    <div class="repeat_content" id="repeatContent">
                        <!-- 요일 별-->
                        <div class="repeat_section daily" v-show="selectedTab === 'daily'" data-type="daily">
                            <div class="inner_set">
                                <span class="all"><strong>매일</strong></span>
                                <span>월</span>
                                <span>화</span>
                                <span>수</span>
                                <span>목</span>
                                <span>금</span>
                                <span>토</span>
                                <span>일</span>
                            </div>
                        </div>
                        <!-- //요일 별-->

                        <!-- 주간 별-->
                        <div class="repeat_section weekly" v-show="selectedTab === 'weekly'" data-type="weekly">
                            <div class="inner_set">
                                <!-- 선택 상단-->
                                <div class="rs_top">
                                    <a href="#none" class="weekly_a">주선택</a>
                                    <span class="weekly_r" style="display:none"></span>
                                    <a href="#none" class="daily_a">요일선택</a>
                                    <span class="daily_r" style="display:none"></span>
                                </div>                          
                                <!-- //선택 상단-->
                                <!-- 선택 하단-->
                                <div class="rs_btm">
                                    <!-- 주 고르기-->
                                    <div class="weekly_s" style="display:none">
                                    <span>2주마다</span>
                                    <span>3주마다</span>
                                    <span>4주마다</span>
                                    <span>5주마다</span>
                                    </div>
                                    <!--//주 고르기-->
                                    <!-- 요일 고르기-->
                                    <div class="daily_s" style="display:none">
                                        <span class="all"><strong>매일</strong></span>
                                    <span>월</span>
                                    <span>화</span>
                                    <span>수</span>
                                    <span>목</span>
                                    <span>금</span>
                                    <span>토</span>
                                    <span>일</span>
                                        <button>선택완료</button>
                                    </div>
                                    <!--//요일 고르기-->
                                </div>                          
                                <!-- //선택 하단-->
                            </div>
                        </div>
                        <!-- //주간 별-->

                        <!-- 월 별-->
                        <div class="repeat_section monthly" v-show="selectedTab === 'monthly'" data-type="monthly">
                            <div class="inner_set">
                                <!-- 선택 상단-->
                                <div class="rs_top">
                                    <a href="#none" class="monthly_a">달선택</a>
                                    <span class="monthly_r" style="display:none"></span>
                                    <a href="#none" class="monthly_d_a">일선택</a>
                                    <span class="monthly_d_r" style="display:none"></span>
                                </div>                          
                                <!-- //선택 상단-->
                                <!-- 선택 하단-->
                                <div class="rs_btm">
                                    <!-- 달 고르기-->
                                    <div class="monthly_s" style="display:none">
                                        <span class="all"><strong>매달</strong></span>
                                        <span>1월</span>
                                        <span>2월</span>
                                        <span>3월</span>
                                        <span>4월</span>
                                        <span>5월</span>
                                        <span>6월</span>
                                        <span>7월</span>
                                        <span>8월</span>
                                        <span>8월</span>
                                        <span>10월</span>
                                        <span>11월</span>
                                        <span>12월</span>
                                        <button>선택완료</button>
                                    </div>
                                    <!--//달 고르기-->
                                    <!-- 일 고르기-->
                                    <div class="monthly_d_s" style="display:none">
                                        <span>1</span>          
                                        <span>2</span>          
                                        <span>3</span>          
                                        <span>4</span>          
                                        <span>5</span>          
                                        <span>6</span>          
                                        <span>7</span>          
                                        <span>8</span>          
                                        <span>9</span>          
                                        <span>10</span>         
                                        <span>11</span>         
                                        <span>12</span>         
                                        <span>13</span>         
                                        <span>14</span>         
                                        <span>15</span>         
                                        <span>16</span>         
                                        <span>17</span>         
                                        <span>18</span>         
                                        <span>19</span>         
                                        <span>20</span>         
                                        <span>21</span>         
                                        <span>22</span>         
                                        <span>23</span>         
                                        <span>24</span>         
                                        <span>25</span>         
                                        <span>26</span>         
                                        <span>27</span>         
                                        <span>28</span>         
                                        <span>29</span>         
                                        <span>30</span>         
                                        <span>31</span>
                                        <button>선택완료</button>
                                    </div>
                                    <!--//일 고르기-->
                                </div>                          
                                <!-- //선택 하단-->
                            </div>
                        </div>
                        <!-- //월 별--> 
                    </div>
                </div>
            </div>
            <!-- //다짐 주기 설정 -->
            
            
      </div>
    </div>


    <div class="save_btn">
        <button @click="">다짐 저장하기</button>
    </div>

    <button class="close_btn" @click="showPopup = false"><span>닫기</span></button>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const showPopup = ref(false)
const selectedTab = ref('daily')

// showPopup이 true가 되면 탭 상태 초기화
watch(showPopup, async (newVal) => {
  if (newVal) {
    await nextTick() // DOM이 렌더링된 이후 실행되도록 보장
    selectedTab.value = 'daily' // 기본 탭 설정
  }
})
</script>