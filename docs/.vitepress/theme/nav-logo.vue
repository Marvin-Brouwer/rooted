<script setup lang="ts">
import logo from '../../branding/logo-rd.svg'
</script>

<template>
	<!-- Tier 2, it's shown at 32 px. -->
	<img class="nav-logo" :src="logo" alt="" width="32" height="32">
</template>

<style scoped>
.nav-logo {
	width: 32px;
	height: 32px;
	margin-right: 10px;
}
</style>
