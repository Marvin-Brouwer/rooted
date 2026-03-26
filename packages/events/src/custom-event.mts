export function event(eventKey: string, init?: EventInit): CustomEvent<never>
export function event<TDetail extends object>(eventKey: string, init?: CustomEventInit<TDetail>): CustomEvent<TDetail> {
	return new CustomEvent<TDetail>(eventKey, init)
}

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-explicit-any
export class CustomEvent<TDetail extends object | never = any> extends globalThis.CustomEvent<TDetail> {
	constructor(eventKey: string, init?: CustomEventInit<TDetail>) {
		super(eventKey, init)
	}
}
