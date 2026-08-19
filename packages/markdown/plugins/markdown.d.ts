declare module '*.md' {
	/** The parsed YAML frontmatter block. Cast it to your own shape. */
	export const frontmatter: Record<string, unknown>
	/** The body, rendered to HTML at build time. */
	export const html: string

	const markdown: import('@rooted/markdown').MarkdownModule
	export default markdown
}
