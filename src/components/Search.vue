<script setup lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { url } from "@utils/url-utils";
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { SearchResult } from "@/global";

const keywordDesktop = ref("");
const keywordMobile = ref("");
const result = ref<SearchResult[]>([]);
const isSearching = ref(false);
const panelOpen = ref(false);
const panel = ref<HTMLElement | null>(null);
let initialized = false;
let lastDesktop = false;
let requestId = 0;
let cleanup: (() => void) | undefined;

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: { title: "This Is a Fake Search Result" },
		excerpt:
			"Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: { title: "If You Want to Test the Search" },
		excerpt: "Try running <mark>pnpm build && pnpm preview</mark> instead.",
	},
];

function setPanelVisibility(show: boolean, desktop: boolean): void {
	if (desktop) panel.value?.classList.toggle("float-panel-closed", !show);
}

function togglePanel(): void {
	panel.value?.classList.toggle("float-panel-closed");
	if (!panel.value?.classList.contains("float-panel-closed")) {
		const keyword = lastDesktop ? keywordDesktop.value : keywordMobile.value;
		if (keyword) void search(keyword, lastDesktop);
	}
}

async function search(keyword: string, desktop: boolean): Promise<void> {
	lastDesktop = desktop;
	const id = ++requestId;
	if (!keyword) {
		result.value = [];
		isSearching.value = false;
		setPanelVisibility(false, desktop);
		return;
	}
	if (!initialized) return;
	isSearching.value = true;
	try {
		let items: SearchResult[] = [];
		if (import.meta.env.DEV) {
			items = fakeResult;
		} else if (window.pagefind) {
			const response = await window.pagefind.search(keyword);
			if (id !== requestId) return;
			const pages = await Promise.all(
				response.results.map((item) => item.data()),
			);
			items = pages.map((item) => {
				const sections =
					item.meta.tabbed === "true"
						? item.sub_results?.filter((entry) => entry.url.includes("--"))
						: undefined;
				const section =
					sections?.find((entry) =>
						entry.excerpt
							.replace(/<\/?mark>/g, "")
							.toLowerCase()
							.includes(keyword.trim().toLowerCase()),
					) ?? sections?.[0];
				return section
					? { ...item, url: section.url, excerpt: section.excerpt }
					: item;
			});
		}
		if (id !== requestId) return;
		result.value = items;
		setPanelVisibility(items.length > 0, desktop);
	} catch (error) {
		if (id !== requestId) return;
		console.error("Search error:", error);
		result.value = [];
		setPanelVisibility(false, desktop);
	} finally {
		if (id === requestId) isSearching.value = false;
	}
}

watch(keywordDesktop, (keyword) => void search(keyword, true));
watch(keywordMobile, (keyword) => void search(keyword, false));

onMounted(() => {
	const element = panel.value;
	if (!element) return;
	const syncPanel = () => {
		const open = !element.classList.contains("float-panel-closed");
		if (!open && panelOpen.value) {
			requestId++;
			isSearching.value = false;
		}
		panelOpen.value = open;
		element.inert = !open;
		if (!open && element.contains(document.activeElement)) {
			document.getElementById("search-switch")?.focus();
		}
	};
	const observer = new MutationObserver(syncPanel);
	observer.observe(element, { attributes: true, attributeFilter: ["class"] });
	syncPanel();
	const initialize = () => {
		initialized = true;
		const keyword = lastDesktop ? keywordDesktop.value : keywordMobile.value;
		if (keyword) void search(keyword, lastDesktop);
	};
	const onEscape = (event: KeyboardEvent) => {
		if (event.key === "Escape") element.classList.add("float-panel-closed");
	};
	document.addEventListener("keydown", onEscape);
	let timer: ReturnType<typeof setTimeout> | undefined;
	if (import.meta.env.DEV || window.pagefind) {
		initialize();
	} else {
		document.addEventListener("pagefindready", initialize);
		document.addEventListener("pagefindloaderror", initialize);
		timer = setTimeout(() => {
			if (!initialized) initialize();
		}, 2000);
	}
	cleanup = () => {
		observer.disconnect();
		clearTimeout(timer);
		document.removeEventListener("pagefindready", initialize);
		document.removeEventListener("pagefindloaderror", initialize);
		document.removeEventListener("keydown", onEscape);
	};
});

onUnmounted(() => {
	requestId++;
	initialized = false;
	cleanup?.();
});
</script>

<template>
	<div
		id="search-bar"
		class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
			bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
			dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10"
	>
		<slot name="desktop-search" />
		<input
			v-model="keywordDesktop"
			:aria-label="i18n(I18nKey.search)"
			:placeholder="i18n(I18nKey.search)"
			class="transition-all pl-10 text-sm bg-transparent outline-0
				h-full w-40 active:w-60 focus:w-60 text-muted"
			@focus="search(keywordDesktop, true)"
		/>
	</div>

	<button
		id="search-switch"
		type="button"
		:aria-label="i18n(I18nKey.search)"
		:aria-expanded="panelOpen"
		aria-controls="search-panel"
		class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90"
		@click="togglePanel"
	>
		<slot name="search" />
	</button>

	<div
		id="search-panel"
		ref="panel"
		:aria-hidden="!panelOpen"
		:aria-busy="isSearching"
		:inert="!panelOpen"
		class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
			top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2"
	>
		<div
			id="search-bar-inside"
			class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
				bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
				dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10"
		>
			<slot name="panel-search" />
			<input
				v-model="keywordMobile"
				:aria-label="i18n(I18nKey.search)"
				:placeholder="i18n(I18nKey.search)"
				class="pl-10 absolute inset-0 text-sm bg-transparent outline-0 focus:w-60 text-muted"
			/>
		</div>

		<a
			v-for="item in result"
			:key="item.url"
			:href="item.url"
			class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
				rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]"
		>
			<div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
				{{ item.meta.title }}
				<slot name="chevron" />
			</div>
			<!-- Pagefind encodes excerpt text before adding its mark highlights. -->
			<div class="transition text-sm text-50" v-html="item.excerpt"></div>
		</a>
	</div>
</template>

<style scoped>
input:focus {
	outline: 0;
}

input:focus::placeholder {
	color: transparent;
}

.search-panel {
	max-height: calc(100vh - 100px);
	overflow-y: auto;
}
</style>
