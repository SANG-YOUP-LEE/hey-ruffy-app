<template>
	<div class="popup_wrap">
		<h2 v-html="routineToEdit ? '다짐 수정하기' : '새로운 다짐을<br />만들어 볼까요?<p>다짐을 달성할때마다<br />러피의 산책이 총총총 계속됩니다.</p>'"></h2>
    
		<div class="popup_inner">
			<!-- 다짐명 적기 -->
			<div class="form_box_g">
				<h3>새롭게 다짐할 일을 적어주세요.</h3>
				<p>
					<label for="rt_name">새 다짐 명</label>
					<input type="text" v-model="routineData.title" placeholder="ex)외로워도 슬퍼도 탄수화물 끊기" class="uline"/>
				</p>
			</div>
			
      <!--다짐 주기 설정-->
			<div class="form_box_g limit">
				<h3>얼마나 자주 지켜야 하나요?</h3>
				<p>
          <button id="v_detail01" @click="handleTabClick('daily')" class="b_basic">일간</button>
          <button id="v_detail02" @click="handleTabClick('weekly')" class="b_basic">주간</button>
          <button id="v_detail03" @click="handleTabClick('monthly')" class="b_basic">월간</button>
        </p>
				<!-- 일간 상세 -->
        <div class="detail_box" id="v_detail01_block">
         aa
        </div>

        <!-- 주간 상세 -->
        <div class="detail_box" id="v_detail02_block">
         bb
          <p class="check_btn">
            <!-- 매일 버튼 -->
            <button
              class="all"
              @click="toggleAllDays"
              :class="{ light: isAllDaysSelected }"
            >매일</button>
            
            <!-- 요일 버튼들 -->
            <button
              v-for="d in ['일','월','화','수','목','금','토']"
              :key="d + 'w'"
              @click="toggleDay(d)"
              :class="{ light: routineData.days.includes(d) }"
            >
              {{ d }}
            </button>
          </p>
        </div>

				<!-- 월간 상세 -->
				<div class="detail_box" id="v_detail03_block">
          <div class="monthly-grid">
            <span
              class="m_s_btn"
              v-for="day in 31"
              :key="day"
              @click="toggleDateSelection(day)"
              :class="{ selected: selectedDates.includes(day) }"
            >
              {{ day }}
            </span>
          </div>
				</div>
			</div>
    </div>

     
	</div>
</template>

