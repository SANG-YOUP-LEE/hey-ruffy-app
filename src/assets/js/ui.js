export function setupToggleBlocks(options = {}) {
	const allBlocks = document.querySelectorAll('[id$="_block"]')
	const buttons = document.querySelectorAll('button[id^="v_detail"]')

	let currentActiveId = null

	const resetBlock = (block) => {
		// 버튼 상태 초기화
		const buttonsInBlock = block.querySelectorAll('button.on')
		buttonsInBlock.forEach((b) => b.classList.remove('on'))

		// 입력 필드 초기화
		const inputs = block.querySelectorAll('input, textarea')
		inputs.forEach((input) => {
			if (input.type === 'checkbox' || input.type === 'radio') {
				input.checked = false
			} else {
				input.value = ''
			}
		})

		// 주간 탭 초기화
		if (block.id === 'v_detail02_block' && options.resetRepeat) {
			options.resetRepeat()
		}

		// 월간 탭 초기화
		if (block.id === 'v_detail03_block' && options.resetMonthly) {
			options.resetMonthly()
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
			if (prevBlock) resetBlock(prevBlock)

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

export function centerVertically(selector = '.container', wrapperSelector = '.no-touch') {
  const apply = () => {
    const container = document.querySelector(selector)
    const wrapper = document.querySelector(wrapperSelector)

    if (container && wrapper) {
      const containerHeight = container.offsetHeight
      const wrapperHeight = window.innerHeight // ← 정확한 현재 높이
      const top = (wrapperHeight - containerHeight) / 2

      container.style.top = `${top}px`
      container.style.transform = 'translateX(-50%)'
    }
  }

  // 적용 타이밍 강화
  apply()
  window.addEventListener('load', apply)
  window.addEventListener('resize', apply)
  window.addEventListener('orientationchange', apply)
  setTimeout(apply, 300)
}

centerVertically()

function setViewportHeightVar() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

// 최초 실행
setViewportHeightVar()

// 윈도우 리사이즈, 회전, 키보드 진입 등 대응
window.addEventListener('resize', setViewportHeightVar)
window.addEventListener('orientationchange', setViewportHeightVar)
