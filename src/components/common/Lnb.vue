<template>
    <div class="popup_overlay">
        <!-- lnb -->
        <div class="lnb_wrap">
            <p><span>러피님</span> 환영합니다</p>
						<button>로그아웃</button>
						<button>회원탈퇴</button>
            <button class="close_btn"  @click.prevent="$emit('close')"><span>팝업 닫기</span></button>
        </div>
        <!--// lnb -->
    </div>
</template>
