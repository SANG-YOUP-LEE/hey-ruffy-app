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
			
			<!-- 러피 산책 설정 -->
			<div class="form_box_g rt_make">
				<h3>러피의 산책 주기는 어떻게 할까요?</h3>
				<p>
					미리 설정한 다짐 횟수를 달성하면 러피의 산책이 시작돼요. 최소 다짐 횟수는 5번이예요.
				</p>
				<p>
					<button class="btn_basic">최소 달성 횟수 선택하기</button>
				</p>
			</div>
			<!--// 러피 산책 설정 -->	
			
			<!-- 다짐 중요도 설정 -->
			<div class="form_box_g rt_make">
				<h3>얼마나 중요한 다짐인가요?</h3>
				<p>
					중요한 마음 만큼 컬러를 선택해주세요.
				</p>
			</div>
			<!--// 다짐 중요도 설정 -->

      <!-- 메세지 설정 -->
			<div class="form_box_g rt_make">
				<h3>소곤소곤 더 할 말은 없나요?</h3>
				<p>
					<textarea row="2">다짐 저장하기 전 마지막 할말은 없나요? 아자아자</textarea>
				</p>
			</div>
			<!--// 메세지 설정 -->			




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
