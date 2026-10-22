import { url } from "@utils/url-utils";
import type { SearchResult } from "@/global";

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

class SiteSearch extends HTMLElement {
	private desktop!: HTMLInputElement;
	private mobile!: HTMLInputElement;
	private button!: HTMLButtonElement;
	private panel!: HTMLElement;
	private template!: HTMLTemplateElement;
	private initialized = false;
	private lastDesktop = false;
	private panelOpen = false;
	private requestId = 0;
	private observer = new MutationObserver(() => this.syncPanel());
	private timer?: ReturnType<typeof setTimeout>;

	connectedCallback() {
		this.desktop = this.querySelector("#search-bar input") as HTMLInputElement;
		this.mobile = this.querySelector("#search-panel input") as HTMLInputElement;
		this.button = this.querySelector("#search-switch") as HTMLButtonElement;
		this.panel = this.querySelector("#search-panel") as HTMLElement;
		this.template = this.querySelector("template") as HTMLTemplateElement;
		this.desktop.addEventListener("input", this.searchDesktop);
		this.desktop.addEventListener("focus", this.searchDesktop);
		this.mobile.addEventListener("input", this.searchMobile);
		this.button.addEventListener("click", this.togglePanel);
		this.observer.observe(this.panel, {
			attributes: true,
			attributeFilter: ["class"],
		});
		this.syncPanel();
		document.addEventListener("keydown", this.onEscape);
		if (import.meta.env.DEV || window.pagefind) {
			this.initialize();
		} else {
			document.addEventListener("pagefindready", this.initialize);
			document.addEventListener("pagefindloaderror", this.initialize);
			this.timer = setTimeout(() => {
				if (!this.initialized) this.initialize();
			}, 2000);
		}
	}

	private initialize = () => {
		this.initialized = true;
		const input = this.lastDesktop ? this.desktop : this.mobile;
		if (input.value) void this.search(input.value, this.lastDesktop);
	};

	private searchDesktop = () => void this.search(this.desktop.value, true);
	private searchMobile = () => void this.search(this.mobile.value, false);

	private setBusy(busy: boolean) {
		this.panel.setAttribute("aria-busy", String(busy));
	}

	private setPanelVisibility(show: boolean, desktop: boolean) {
		if (desktop) this.panel.classList.toggle("float-panel-closed", !show);
	}

	private togglePanel = () => {
		this.panel.classList.toggle("float-panel-closed");
		if (!this.panel.classList.contains("float-panel-closed")) {
			const input = this.lastDesktop ? this.desktop : this.mobile;
			if (input.value) void this.search(input.value, this.lastDesktop);
		}
	};

	private syncPanel() {
		const open = !this.panel.classList.contains("float-panel-closed");
		if (!open && this.panelOpen) {
			this.requestId++;
			this.setBusy(false);
		}
		this.panelOpen = open;
		this.panel.inert = !open;
		this.panel.setAttribute("aria-hidden", String(!open));
		this.button.setAttribute("aria-expanded", String(open));
		if (!open && this.panel.contains(document.activeElement))
			this.button.focus();
	}

	private onEscape = (event: KeyboardEvent) => {
		if (event.key === "Escape") this.panel.classList.add("float-panel-closed");
	};

	private renderResults(items: SearchResult[]) {
		for (const link of this.panel.querySelectorAll("a")) link.remove();
		const fragment = document.createDocumentFragment();
		for (const item of items) {
			const link = (
				this.template.content.firstElementChild as HTMLAnchorElement
			).cloneNode(true) as HTMLAnchorElement;
			link.setAttribute("href", item.url);
			link.children[0].prepend(document.createTextNode(item.meta.title));
			// Pagefind encodes excerpt text before adding its mark highlights.
			link.children[1].innerHTML = item.excerpt;
			fragment.append(link);
		}
		this.panel.append(fragment);
	}

	private async search(keyword: string, desktop: boolean) {
		this.lastDesktop = desktop;
		const id = ++this.requestId;
		if (!keyword) {
			this.renderResults([]);
			this.setBusy(false);
			this.setPanelVisibility(false, desktop);
			return;
		}
		if (!this.initialized) return;
		this.setBusy(true);
		try {
			let items: SearchResult[] = [];
			if (import.meta.env.DEV) {
				items = fakeResult;
			} else if (window.pagefind) {
				const response = await window.pagefind.search(keyword);
				if (id !== this.requestId) return;
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
			if (id !== this.requestId) return;
			this.renderResults(items);
			this.setPanelVisibility(items.length > 0, desktop);
		} catch (error) {
			if (id !== this.requestId) return;
			console.error("Search error:", error);
			this.renderResults([]);
			this.setPanelVisibility(false, desktop);
		} finally {
			if (id === this.requestId) this.setBusy(false);
		}
	}

	disconnectedCallback() {
		this.requestId++;
		this.initialized = false;
		this.observer.disconnect();
		clearTimeout(this.timer);
		this.desktop.removeEventListener("input", this.searchDesktop);
		this.desktop.removeEventListener("focus", this.searchDesktop);
		this.mobile.removeEventListener("input", this.searchMobile);
		this.button.removeEventListener("click", this.togglePanel);
		document.removeEventListener("pagefindready", this.initialize);
		document.removeEventListener("pagefindloaderror", this.initialize);
		document.removeEventListener("keydown", this.onEscape);
	}
}

if (!customElements.get("site-search")) {
	customElements.define("site-search", SiteSearch);
}
