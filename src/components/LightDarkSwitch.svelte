<script lang="ts">
import { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants.ts";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	applyThemeToDocument,
	getStoredTheme,
	setTheme,
} from "@utils/setting-utils.ts";
import { onMount, type Snippet } from "svelte";
import type { LIGHT_DARK_MODE } from "@/types/config.ts";

const {
	light,
	dark,
	auto,
}: { light?: Snippet; dark?: Snippet; auto?: Snippet } = $props();

const sequence: LIGHT_DARK_MODE[] = [LIGHT_MODE, DARK_MODE, AUTO_MODE];
const labels = {
	[LIGHT_MODE]: i18n(I18nKey.lightMode),
	[DARK_MODE]: i18n(I18nKey.darkMode),
	[AUTO_MODE]: i18n(I18nKey.systemMode),
};
let mode: LIGHT_DARK_MODE = $state(AUTO_MODE);
let ready = $state(false);
const nextMode = $derived(
	sequence[(sequence.indexOf(mode) + 1) % sequence.length],
);
const label = $derived(`${labels[mode]} → ${labels[nextMode]}`);

onMount(() => {
	mode = getStoredTheme();
	ready = true;
	const preference = window.matchMedia("(prefers-color-scheme: dark)");
	const syncSystem = () => {
		if (mode === AUTO_MODE) applyThemeToDocument(mode);
	};
	preference.addEventListener("change", syncSystem);
	return () => preference.removeEventListener("change", syncSystem);
});

function toggleScheme(): void {
	mode = nextMode;
	setTheme(mode);
}
</script>

<button
	id="scheme-switch"
	type="button"
	class="btn-plain scale-animation rounded-lg active:scale-90"
	aria-label={label}
	title={label}
	data-mode={mode}
	disabled={!ready}
	onclick={toggleScheme}
>
	<span class="theme-icon theme-icon-light" aria-hidden="true">{@render light?.()}</span>
	<span class="theme-icon theme-icon-dark" aria-hidden="true">{@render dark?.()}</span>
	<span class="theme-icon theme-icon-auto" aria-hidden="true">{@render auto?.()}</span>
</button>
