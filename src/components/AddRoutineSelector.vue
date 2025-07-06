<template>
	<div class="popup_wrap">
		<h2>새 다짐 만들기</h2>

		<div class="popup_inner">


			<!-- 다짐명 적기 -->
			<div class="form_box_g rt_make">
				<h3>자, 다짐명 부터 적어볼까요?</h3>
				<p>
					<label for="rt_name">새 다짐 명</label>
					<input type="text" placeholder="ex)외로워도 슬퍼도 탄수화물 끊기">
				</p>
			</div>
			<!--// 다짐명 적기 -->


			<!-- 다짐 주기 설정 -->
			<div class="form_box_g rt_make">
				<h3>얼마나 자주 지켜야 하나요?</h3>
				<p>
					<button class="btn_basic">나만의 반복 주기 만들기</button>
				</p>
				<p>
					<label class="toggle-switch">
						<input type="checkbox" />
						<span class="slider"></span>
					</label>
					반복 없이 하루만
				</p>
			</div>
			<!--// 다짐 주기 설정 -->

			<!-- 다짐 주기 설정 반복 안할시-->
			<div class="form_box_g rt_make">
				<h3>얼마나 자주 지켜야 하나요?</h3>
				<p>
					<button class="btn_basic" disabled>나만의 반복 주기 만들기</button>
				</p>
				<p>
					<label class="toggle-switch">
						<input type="checkbox" checked />
						<span class="slider"></span>
					</label>
					반복 없이 하루만
				</p>
			</div>
			<!--// 다짐 주기 설정 반복 안할시 -->

			<!-- 다짐 주기 설정 완료-->
			<div class="form_box_g rt_make">
				<h3>
					얼마나 자주 지켜야 하나요?
					<a href="#none">바꾸기</a>
				</h3>
				<!-- 반복 없을때 -->
				<p>
					<em>7월 25일 하루만</em>
					<span>AM 11:00 알림</span>
				</p>
				<!--//반복 없을때 -->
			</div>
			<!--// 다짐 주기 설정 완료-->

			<!-- 다짐 주기 설정 완료-->
			<div class="form_box_g rt_make">
				<h3>
					얼마나 자주 지켜야 하나요?
					<a href="#none">바꾸기</a>
				</h3>
				<!-- 일별-->
				<p>
					<em>일별</em>
					<span>일, 월, 화, 수, 목, 금, 토, 일</span>
				</p>
				<!--//일별-->

			</div>
			<!--// 다짐 주기 설정 완료-->


			<!-- 다짐 주기 설정 완료-->
			<div class="form_box_g rt_make">
				<h3>
					얼마나 자주 지켜야 하나요?
					<a href="#none">바꾸기</a>
				</h3>
				<!-- 주별-->
				<p>
					<em><strong>2주</strong>마다</em>
					<span>일, 토, 일</span>
				</p>
				<p>
					<em>시작일 없음</em>
					<span>알람 없음</span>
				</p>
				<!--//주별-->
			</div>
			<!--// 다짐 주기 설정 완료-->


			<!-- 다짐 주기 설정 완료-->
			<div class="form_box_g rt_make">
				<h3>
					얼마나 자주 지켜야 하나요?
					<a href="#none">바꾸기</a>
				</h3>
				<!-- 월별 -->
				<p>
					<em><strong>3월, 4월</strong>마다</em>
					<span>21일, 28일, 31일</span>
				</p>
				<p>
					<em>7월 25일부터 ~ 8월 15일까지
					</em>
					<span>PM 12:12 알림</span>
				</p>
				<!--//월별-->
			</div>
			<!--// 다짐 주기 설정 완료-->





		</div>


		<div class="popup_btm">
			<button @click="handleClose">다짐 저장하기</button>
		</div>
		<button class="close_btn" @click="handleClose"><span>팝업 닫기</span></button>
	</div>
</template>

<script setup>
	const emit = defineEmits(['close'])

	const handleClose = () => {
		emit('close')
	}
</script>
