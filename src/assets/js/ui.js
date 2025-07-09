// ui.js에서 수정
export function setupToggleBlocks(options = {}) {
	const allBlocks = document.querySelectorAll('[id$="_block"]')
	const buttons = document.querySelectorAll('button[id^="v_detail"]')

	let currentActiveId = null

	const resetBlock = (block, blockId) => {
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

		// 여기서 주간 탭의 repeat 값만 추가 초기화
		if (blockId === 'v_detail02_block' && options.resetRepeat) {
			options.resetRepeat() // 외부에서 전달받은 초기화 함수 실행
		}
	}

	const hideAllBlocks = () => {
		allBlocks.forEach((block) => {
			block.style.display = 'none'
		})
		buttons.forEach((b) => b.classList.remove('on'))
	}

	buttons.forEach((btn) => {
		btn.addEventListener('click', () => {
			const id = btn.getAttribute('id')
			const targetId = `${id}_block`
			const target = document.getElementById(targetId)

			if (!target) return
			if (currentActiveId === id) return

			const prevBlock = document.getElementById(`${currentActiveId}_block`)
			if (prevBlock) resetBlock(prevBlock, `${currentActiveId}_block`)

			hideAllBlocks()
			btn.classList.add('on')
			target.style.display = 'block'
			currentActiveId = id
		})
	})

	if (buttons.length > 0) {
		const firstBtn = buttons[0]
		const firstId = firstBtn.getAttribute('id')
		const firstBlock = document.getElementById(`${firstId}_block`)
		if (firstBlock) {
			firstBtn.classList.add('on')
			firstBlock.style.display = 'block'
			currentActiveId = firstId
		}
	}
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
					// 전체 on/off 토글
					buttons.forEach((b) => {
						if (isActive) {
							b.classList.remove('on')
						} else {
							b.classList.add('on')
						}
					})
				} else {
					// 일반 버튼 토글
					btn.classList.toggle('on')

					// 일반 버튼 클릭 시 .all off
					const allBtn = group.querySelector('button.all')
					if (allBtn) allBtn.classList.remove('on')
				}
			})
		})
	})
}