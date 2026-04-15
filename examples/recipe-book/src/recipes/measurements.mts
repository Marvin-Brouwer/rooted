import { component } from '@rooted/components'
import { type Store } from '@rooted/store'

type UnitEntry = { factor: number, display: string }

const MASS: Record<string, UnitEntry> = {
	g: { factor: 1, display: 'g' },
	kg: { factor: 1000, display: 'kg' },
}

const VOLUME: Record<string, UnitEntry> = {
	ml: { factor: 1, display: 'ml' },
	l: { factor: 1000, display: 'L' },
	litre: { factor: 1000, display: 'L' },
	liter: { factor: 1000, display: 'L' },
}

const SMALL: Record<string, UnitEntry> = {
	tsp: { factor: 1, display: 'tsp' },
	tbsp: { factor: 3, display: 'tbsp' },
}

const TOKEN = /`\[(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\]`/g

export type MeasurementSegment = { type: 'measurement', value: number, unit?: string }
export type TextSegment = { type: 'text', text: string }
export type Segment = MeasurementSegment | TextSegment

function formatNumber(n: number): string {
	const rounded = Math.round(n * 100) / 100
	return rounded.toLocaleString('en', { maximumFractionDigits: 2 })
}

/**
 * Formats a scaled amount with smart unit simplification.
 *
 * - 1000 g or more is expressed as kg
 * - 1000 ml or more is expressed as L
 * - multiples of 3 tsp are expressed as tbsp
 * - known unit with no simplification rule (e.g. cm): number with unit preserved
 * - missing unit: bare number with no suffix
 *
 * @example
 * formatMeasurement(1000, 'g')    // '1 kg'
 * formatMeasurement(1500, 'ml')   // '1.5 L'
 * formatMeasurement(6, 'tsp')     // '2 tbsp'
 * formatMeasurement(3, undefined) // '3'
 */
export function formatMeasurement(amount: number, unit?: string): string {
	const key = unit?.toLowerCase()

	if (key && key in MASS) {
		const base = amount * MASS[key].factor
		if (base >= 1000) return `${formatNumber(base / 1000)}\u202Fkg`
		return `${formatNumber(base)}\u202Fg`
	}

	if (key && key in VOLUME) {
		const base = amount * VOLUME[key].factor
		if (base >= 1000) return `${formatNumber(base / 1000)}\u202FL`
		return `${formatNumber(base)}\u202Fml`
	}

	if (key && key in SMALL) {
		const base = amount * SMALL[key].factor
		const asTbsp = base / 3
		if (Math.abs(asTbsp - Math.round(asTbsp)) < 0.001 && asTbsp >= 1) {
			return `${formatNumber(asTbsp)}\u202Ftbsp`
		}
		return `${formatNumber(base)}\u202Ftsp`
	}

	return unit ? `${formatNumber(amount)}\u202F${unit}` : formatNumber(amount)
}

/**
 * Splits an ingredient line into text and measurement segments.
 *
 * Lines with no tokens produce a single text segment.
 * Lines with tokens interleave measurement segments with the surrounding text.
 *
 * @example
 * parseSegments('`[200 g]` spaghetti')
 * // [{ type: 'measurement', value: 200, unit: 'g' }, { type: 'text', text: ' spaghetti' }]
 *
 * parseSegments('`[80 g]` sugar, plus `[4 tsp]` for topping')
 * // [{ type: 'measurement', value: 80, unit: 'g' }, { type: 'text', text: ' sugar, plus ' },
 * //  { type: 'measurement', value: 4, unit: 'tsp' }, { type: 'text', text: ' for topping' }]
 *
 * parseSegments('Salt to taste')
 * // [{ type: 'text', text: 'Salt to taste' }]
 */
export function parseSegments(text: string): Segment[] {
	const segments: Segment[] = []
	const regex = /`\[(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\]`/g
	let lastIndex = 0
	let match: RegExpExecArray | null

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ type: 'text', text: text.slice(lastIndex, match.index) })
		}
		segments.push({
			type: 'measurement',
			value: Number.parseFloat(match[1]),
			unit: match[2],
		})
		lastIndex = match.index + match[0].length
	}

	if (lastIndex < text.length) {
		segments.push({ type: 'text', text: text.slice(lastIndex) })
	}

	return segments
}

/**
 * Replaces all `[[amount unit?]]` tokens in an ingredient string using a
 * multiplier derived from the target vs base serving count.
 *
 * Lines with no tokens are returned unchanged.
 *
 * @example
 * scaleIngredient('`[200 g]` spaghetti', 2)   // '400 g spaghetti'
 * scaleIngredient('`[3]` large eggs', 0.5)    // '1.5 large eggs'
 * scaleIngredient('Salt to taste', 3)         // 'Salt to taste'
 */
export function scaleIngredient(text: string, multiplier: number): string {
	return text.replaceAll(TOKEN, (_, rawAmount: string, rawUnit: string | undefined) =>
		formatMeasurement(Number.parseFloat(rawAmount) * multiplier, rawUnit),
	)
}

export type MeasurementOptions = {
	/** Base amount from markdown, authored for baseServings. */
	value: number
	/** Unit string (g, ml, tsp, tbsp, …). Omit for plain counts. */
	unit?: string
	/** The serving count the recipe was authored for. */
	baseServings: number
	/** Shared store — updated by the serving stepper. */
	servingsStore: Store<number>
}

/**
 * Renders a single scaled measurement value inline.
 * Subscribes to servingsStore and updates whenever the serving count changes.
 *
 * @example
 * ```ts
 * create(Measurement, { value: 200, unit: 'g', baseServings: 4, servingsStore })
 * ```
 */
export const Measurement = component<MeasurementOptions>({
	name: 'measurement-value',
	onMount({ append, element, options, signal }) {
		const { value, unit, baseServings, servingsStore } = options

		const span = element('span', {
			textContent: formatMeasurement(value * (servingsStore.value / baseServings), unit),
		})

		append(span)

		servingsStore.on('change', signal, ({ detail }) => {
			span.textContent = formatMeasurement(value * (detail.state / baseServings), unit)
		})
	},
})
