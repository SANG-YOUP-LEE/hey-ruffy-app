export function setupToggleBlocks() {
	const allBlocks = document.querySelectorAll('[id$="_block"]')
	const buttons = document.querySelectorAll('button[id*="detail"]')

	// 모든 detail block 숨기기 + 내부 초기화
	const resetAndHideAllBlocks = () => {
		allBlocks.forEach((block) => {
			block.style.display = 'none'

			// ✅ 내부 초기화
			// 1) 버튼의 .on 클래스 제거
			const buttonsInBlock = block.querySelectorAll('button.on')
			buttonsInBlock.forEach((b) => b.classList.remove('on'))

			// 2) 입력 필드 초기화
			const inputs = block.querySelectorAll('input, textarea')
			inputs.forEach((input) => {
				if (input.type === 'checkbox' || input.type === 'radio') {
					input.checked = false
				} else {
					input.value = ''
				}
			})
		})
	}

	buttons.forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = btn.getAttribute('id')
			if (!id) return

			const targetId = `${id}_block`
			const target = document.getElementById(targetId)

			if (target) {
				// 1. 모든 블록 닫고 초기화
				resetAndHideAllBlocks()

				// 2. 모든 버튼에서 on 제거
				buttons.forEach((b) => b.classList.remove('on'))

				// 3. 현재 블록 열기, 버튼 on 추가
				target.style.display = 'block'
				btn.classList.add('on')
			}
		})
	})
}

export function setupCheckButtons() {
	const checkGroups = document.querySelectorAll('.check_btn')

	checkGroups.forEach((group) => {
		const buttons = group.querySelectorAll('button')

		buttons.forEach((btn) => {
			btn.addEventListener('click', () => {
				const isAll = btn.classList.contains('all')
				const isActive = btn.classList.contains('on')

				if (isAll) {
					// .all 버튼이 눌렸을 때: toggle 전체 on/off
					if (isActive) {
						// 전체 해제
						buttons.forEach((b) => b.classList.remove('on'))
					} else {
						// 전체 on
						buttons.forEach((b) => b.classList.add('on'))
					}
				} else {
					// 일반 버튼 토글
					btn.classList.toggle('on')

					// 일반 버튼 클릭 시 .all 버튼의 on 클래스는 제거
					const allBtn = group.querySelector('button.all')
					if (allBtn) {
						allBtn.classList.remove('on')
					}
				}
			})
		})
	})
}