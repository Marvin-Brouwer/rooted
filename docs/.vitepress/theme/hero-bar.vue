<script setup lang="ts">
import { codeExample } from '../../../tooling/branding/src/banners/code-example.mts'
import { highlight } from '../../../tooling/branding/src/banners/highlight.mts'
import { light as palette } from '../../../tooling/branding/src/banners/palette.mts'
import logo from '../../branding/logo.svg'

// Same code and colours as the README banner, set as text instead of outlines.
const lines = codeExample.trimEnd().split('\n').map((line) => highlight(line))
</script>

<template>
	<div class="hero-bar" role="img" aria-label="rooted">
		<pre class="code" aria-hidden="true"><template v-for="(tokens, index) in lines" :key="index"><span v-for="(token, column) in tokens" :key="column" :style="{ color: palette[token.kind] }">{{ token.text }}</span>{{ '\n' }}</template></pre>
		<img class="wordmark" :src="logo" alt="" width="256" height="256">
	</div>
</template>

<style scoped>
/* A green field with code top-left and the wordmark bottom-right, the way the banners are built (see docs/branding/style-guide.md). */
.hero-bar {
	position: relative;
	height: 250px;
	overflow: hidden;
	background: var(--rooted-green);
}

.code {
	margin: 0;
	padding: 24px;
	font: 11.5px/1.45 var(--vp-font-family-mono);
	tab-size: 2;
	white-space: pre;
}

/* logo.svg as is: its tile is the same green as the bar, so only the wordmark shows. */
.wordmark {
	position: absolute;
	right: 0;
	bottom: 0;
	width: 240px;
	height: 240px;
}

/* Under 610 px the banner drops the code and shrinks to the wordmark, so this does too. */
@media (max-width: 609px) {
	.hero-bar {
		height: 160px;
	}

	.code {
		display: none;
	}

	.wordmark {
		width: 150px;
		height: 150px;
	}
}
</style>
