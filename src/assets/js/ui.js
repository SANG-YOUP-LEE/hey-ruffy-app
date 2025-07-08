/* 하단 레이어 토글 */
export function setupToggleBlocks() {
	const buttons = document.querySelectorAll('button[id*="detail"]')

	buttons.forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = btn.getAttribute('id')
			if (!id) return

			const targetId = `${id}_block`
			const target = document.getElementById(targetId)

			if (target) {
				target.style.display = target.style.display === 'none' ? 'block' : 'none'
			}
		})
	})
}
