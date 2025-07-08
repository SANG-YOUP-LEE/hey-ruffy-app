export function setupToggleBlocks() {
	// 1. 모든 *_block 요소를 처음에 숨김
	const allBlocks = document.querySelectorAll('[id$="_block"]')
	allBlocks.forEach((el) => {
		el.style.display = 'none'
	})

	// 2. 버튼 클릭 시 하나만 열리게
	const buttons = document.querySelectorAll('button[id*="detail"]')

	buttons.forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = btn.getAttribute('id')
			if (!id) return

			const targetId = `${id}_block`
			const target = document.getElementById(targetId)

			if (target) {
				// 1. 모든 블록 닫고, 버튼에서 on 클래스 제거
				allBlocks.forEach((el) => {
					el.style.display = 'none'
				})
				buttons.forEach((b) => {
					b.classList.remove('on')
				})

				// 2. 현재 블록만 열고, 짝이 되는 버튼에 on 클래스 추가
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