declare module 'virtual:@rooted/css-module' {
	export { cssArtifacts, type CssArtifacts, type CssModule, type CssClass } from '@rooted/components'
}

declare module '*.css' {
	const styles: import('@rooted/components').CssModule
	export default styles
}
