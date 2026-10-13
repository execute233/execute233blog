<script setup lang="ts">
import { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	applyThemeToDocument,
	getStoredTheme,
	setTheme,
	THEME_CHANGE_EVENT,
} from "@utils/setting-utils";
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { LIGHT_DARK_MODE } from "@/types/config";

const sequence: LIGHT_DARK_MODE[] = [LIGHT_MODE, DARK_MODE, AUTO_MODE];
const labels = {
	[LIGHT_MODE]: i18n(I18nKey.lightMode),
	[DARK_MODE]: i18n(I18nKey.darkMode),
	[AUTO_MODE]: i18n(I18nKey.systemMode),
};
const mode = ref<LIGHT_DARK_MODE>(AUTO_MODE);
const ready = ref(false);
const nextMode = computed(
	() => sequence[(sequence.indexOf(mode.value) + 1) % sequence.length],
);
const label = computed(
	() => `${labels[mode.value]} → ${labels[nextMode.value]}`,
);
let cleanup: (() => void) | undefined;

onMounted(() => {
	mode.value = getStoredTheme();
	const preference = window.matchMedia("(prefers-color-scheme: dark)");
	const syncTheme = () => {
		mode.value = getStoredTheme();
	};
	const syncSystem = () => {
		if (mode.value === AUTO_MODE) applyThemeToDocument(mode.value);
	};
	preference.addEventListener("change", syncSystem);
	document.addEventListener(THEME_CHANGE_EVENT, syncTheme);
	cleanup = () => {
		preference.removeEventListener("change", syncSystem);
		document.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
	};
	ready.value = true;
});

onUnmounted(() => cleanup?.());

function toggleScheme(): void {
	mode.value = nextMode.value;
	setTheme(mode.value);
}
</script>

<template>
	<button
		id="scheme-switch"
		type="button"
		class="btn-plain scale-animation rounded-lg active:scale-90"
		:aria-label="label"
		:title="label"
		:data-mode="mode"
		:disabled="!ready"
		@click="toggleScheme"
	>
		<span class="theme-icon theme-icon-light" aria-hidden="true"><slot name="light" /></span>
		<span class="theme-icon theme-icon-dark" aria-hidden="true"><slot name="dark" /></span>
		<span class="theme-icon theme-icon-auto" aria-hidden="true"><slot name="auto" /></span>
	</button>
</template>
