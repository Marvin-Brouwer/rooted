import { spawn } from 'node:child_process'

/** The command that hands a file to the default program, per platform. */
function opener(file: string): [command: string, args: string[]] {
	if (process.platform === 'win32') return ['cmd.exe', ['/c', 'start', '', file]]
	if (process.platform === 'darwin') return ['open', [file]]
	return ['xdg-open', [file]]
}

/**
 * Opens a file in its default program without waiting for that program to close.
 * Resolves with the reason when it couldn't, instead of throwing,
 * because a report that didn't open is no reason to fail the build that wrote it.
 */
export function openFile(file: string): Promise<string | undefined> {
	const [command, arguments_] = opener(file)

	return new Promise((resolve) => {
		const child = spawn(command, arguments_, { detached: true, stdio: 'ignore', windowsHide: true })
		child.once('spawn', () => {
			child.unref()
			resolve(undefined)
		})
		child.once('error', (error: NodeJS.ErrnoException) => {
			resolve(error.code === 'ENOENT' ? `\`${command}\` isn't installed` : error.message)
		})
	})
}
