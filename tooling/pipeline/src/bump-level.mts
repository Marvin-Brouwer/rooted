/**
 * Reads the git log since the last tag and prints the semver bump level:
 * "major" | "minor" | "patch" | "none"
 *
 * Exit code 0 in all cases; the calling workflow reads stdout.
 */

import { execSync } from 'node:child_process'

function getCommitsSinceLastTag(): string[] {
	try {
		const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim()
		return execSync(`git log ${lastTag}..HEAD --format=%s`, { encoding: 'utf8' })
			.split('\n')
			.map(line => line.trim())
			.filter(Boolean)
	}
	catch {
		// No tags yet, treat all commits as candidates.
		return execSync('git log --format=%s', { encoding: 'utf8' })
			.split('\n')
			.map(line => line.trim())
			.filter(Boolean)
	}
}

function bumpLevel(commits: string[]): 'major' | 'minor' | 'patch' | 'none' {
	let level: 'major' | 'minor' | 'patch' | 'none' = 'none'

	for (const message of commits) {
		if (/BREAKING CHANGE/i.test(message) || /^[a-z]+(\(.+\))?!:/.test(message)) {
			return 'major'
		}
		if (/^feat(\(.+\))?:/.test(message)) {
			level = 'minor'
		}
		else if (/^(fix|perf|docs)(\(.+\))?:/.test(message) && level === 'none') {
			level = 'patch'
		}
	}

	return level
}

const commits = getCommitsSinceLastTag()
const level = bumpLevel(commits)
process.stdout.write(level + '\n')
