import { component } from '@rooted/components'
import { TargetedEvent } from '@rooted/components/events'
import { href, navigate } from '@rooted/router'

import { SearchRoute } from './_routes.mts'
import styles from './search-bar.css'
import { getSearchQueryFromUrl } from './search.mts'

export const SearchBar = component({
	name: 'search-bar',
	styles,
	async onMount({ append, element, on }) {
		const submit = element('button', {
			type: 'submit',
			textContent: 'Search',
		})

		const input = element('input', {
			type: 'search',
			name: 'query',
			placeholder: 'Search recipes…',
			aria: {
				label: 'Search recipes',
			},
			on: {
				input: validateInput,
			},
		})

		function validateInput() {
			submit.disabled = input.value.length === 0
		}

		append(
			element('form', {
				children: [input, submit],
				on: {
					submit: submitQuery,
				},
			}),
		)

		// Keep the search bar in sync with the URL: show the active query on the search page,
		// clear it everywhere else
		const syncInput = async () => {
			input.value = await getSearchQueryFromUrl()
			validateInput()
		}
		on('window', 'popstate', syncInput)
		await syncInput()
	},
})

function submitQuery(event: TargetedEvent<SubmitEvent, HTMLFormElement>) {
	event.preventDefault()
	const formData = new FormData(event.currentTarget)
	const query = (formData.get('query') as string)?.trim()
	if (query) navigate(href.for(SearchRoute, { query }))
}
