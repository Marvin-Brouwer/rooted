import { navigate } from '@rooted/router'
import styles from './search-bar.css?inline'
import { component } from '@rooted/components'

export const SearchBar = component({
	name: 'search-bar',
	styles,
	onMount({ append, create, signal }) {

		const input = create('input', {
			type: 'search',
			name: 'query',
			placeholder: 'Search recipes…',
			ariaLabel: 'Search recipes'
		})

		const submit = create('button', {
			type: 'submit',
			textContent: 'Search'
		})

		function validateInput() {
			submit.disabled = input.value.length === 0
		}
		input.addEventListener('input', validateInput, { signal })


		append(
			create('form', { children: [input, submit] })
		)
			.addEventListener('submit', submitQuery, { signal })

		// Keep the search bar in sync with the URL: show the active query on the search page,
		// clear it everywhere else
		const syncInput = () => {
			const match = window.location.pathname.match(/^\/search\/(.+)\/$/)
			input.value = match ? decodeURIComponent(match[1]) : ''
			validateInput()
		}
		window.addEventListener('popstate', syncInput, { signal })
		syncInput()
	},
})

function submitQuery(e: SubmitEvent) {
	e.preventDefault()
	const form = e.target as HTMLFormElement
	const formData = new FormData(form)
	const query = formData.get('query')?.toString()?.trim()
	if (query) navigate(`/search/${encodeURIComponent(query)}/`)
}