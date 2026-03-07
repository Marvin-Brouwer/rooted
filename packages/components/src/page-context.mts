const controller = new AbortController()
window.addEventListener('pagehide', (event) => {
	if (!event.persisted) {
		controller.abort('page unloaded')
	}
})

export const pageSignal = controller.signal