export function setupToggleBlocks() {
	const allBlocks = document.querySelectorAll('[id$="_block"]')
	const buttons = document.querySelectorAll('button[id*="detail"]')

	// 모든 detail block 숨기기 + 내부 초기화
	const resetAndHideAllBlocks = () => {
		allBlocks.forEach((block) => {
			block.style.display = 'none'

			// 내부 초기화
			const buttonsInBlock = block.querySelectorAll('button.on')
			buttonsInBlock.forEach((b) => b.classList.remove('on'))

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

	// 페이지 로드 시에도 초기화 (요 부분이 추가됨)
	resetAndHideAllBlocks()

	buttons.forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = btn.getAttribute('id')
			if (!id) return

			const targetId = `${id}_block`
			const target = document.getElementById(targetId)

			if (target) {
				resetAndHideAllBlocks()
				buttons.forEach((b) => b.classList.remove('on'))
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