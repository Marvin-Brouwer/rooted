import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * The date a file last changed, as `YYYY-MM-DD`, for use as a sitemap `lastmod`.
 *
 * Reads the newest `git log` commit date for the file. Falls back to the file's
 * mtime when it isn't tracked or there's no git repo, and to today when there's
 * no file at all.
 *
 * @param filePath - Absolute path to the file.
 * @param cwd - Directory to run `git` in, normally the Vite project root.
 */
export async function gitLastModified(filePath: string | undefined, cwd: string): Promise<string> {
	if (filePath) {
		try {
			const { stdout } = await execFileAsync(
				'git', ['log', '-1', '--format=%aI', '--', filePath],
				{ cwd },
			)
			const iso = stdout.trim()
			if (iso) return new Date(iso).toISOString().slice(0, 10)
		}
		catch {
			// not a git repo or file untracked, fall through to stat
		}
	}

	const fileStat = filePath ? await stat(filePath) : undefined
	return (fileStat?.mtime ?? new Date()).toISOString().slice(0, 10)
}
