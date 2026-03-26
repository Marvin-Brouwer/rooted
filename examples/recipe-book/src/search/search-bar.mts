import { component } from '@rooted/components'
import { navigate } from '@rooted/router'

import styles from './search-bar.css'

export const SearchBar = component({
	name: 'search-bar',
	styles,
	onMount({ append, element, on }) {
		const input = element('input', {
			type: 'search',
			name: 'query',
			placeholder: 'Search recipes…',
			ariaLabel: 'Search recipes',
			events: [
				on('input', validateInput),
			],
		})

		const submit = element('button', {
			type: 'submit',
			textContent: 'Search',
		})

		function validateInput() {
			submit.disabled = input.value.length === 0
		}

		append(
			element('form', {
				children: [input, submit],
				events: [
					on('submit', submitQuery),
				],
			}),
		)

		// Keep the search bar in sync with the URL: show the active query on the search page,
		// clear it everywhere else
		const syncInput = () => {
			const match = globalThis.location.pathname.match(/^\/search\/(.+)\/$/)
			input.value = match ? decodeURIComponent(match[1]) : ''
			validateInput()
		}
		on('window', 'popstate', syncInput)
		syncInput()
	},
})

// TODO typed event
function submitQuery(error: SubmitEvent & { currentTarget: HTMLFormElement }) {
	error.preventDefault()
	const formData = new FormData(error.currentTarget)
	const query = (formData.get('query') as string)?.trim()
	if (query) navigate(`/search/${encodeURIComponent(query)}/`)
}
