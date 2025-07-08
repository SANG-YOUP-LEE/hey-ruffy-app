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

export function setupToggleBlocks() {
	const allBlocks = document.querySelectorAll('[id$="_block"]')
	const buttons = document.querySelectorAll('button[id*="detail"]')

	// 모든 detail block 숨기기 + 내부 초기화
	const resetAndHideAllBlocks = () => {
		allBlocks.forEach((block) => {
			block.style.display = 'none'

			// 내부 초기화
			// 1) 버튼의 .on 클래스 제거
			const buttonsInBlock = block.querySelectorAll('button.on')
			buttonsInBlock.forEach((b) => b.classList.remove('on'))

			// 2) 체크박스나 입력 필드 초기화가 필요할 경우 여기에 추가
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
				// 모든 블록 닫고 초기화
				resetAndHideAllBlocks()

				// 버튼들 .on 클래스 제거
				buttons.forEach((b) => b.classList.remove('on'))

				// 현재 버튼과 블록만 활성화
				target.style.display = 'block'
				btn.classList.add('on')
			}
		})
	})
}