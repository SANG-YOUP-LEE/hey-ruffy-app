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
				// 모든 블록을 닫고
				allBlocks.forEach((el) => {
					el.style.display = 'none'
				})
				// 현재 블록만 열기
				target.style.display = 'block'
			}
		})
	})
}