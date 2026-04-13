export type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B
export type NonWritableKeys<T> = {
	[P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, never, P>
}[keyof T]
export type FunctionKeys<T> = {
	[P in keyof T]: NonNullable<T[P]> extends (...arguments_: never[]) => unknown ? P : never
}[keyof T]
export type OnHandlerKeys<T> = { [P in keyof T]: P extends `on${string}` ? P : never }[keyof T]

/** A subset of CSSStyleDeclaration containing only the individual CSS style properties. */
export type InlineStyle = { [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends string ? K extends 'cssText' ? never : K : never]?: string }
