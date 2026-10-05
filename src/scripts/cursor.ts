import {
	CURSOR_STORAGE_KEY,
	cursorColors,
	cursorDefaults,
	parseCursorSettings,
} from "@/data/cursor";
import "@/styles/cursor.css";
import { initColorSetting } from "@/scripts/color-setting";
import { readStoredJson, writeStoredJson } from "@/utils/local-storage";

export function initCursor(): void {
	const panel = document.querySelector<HTMLElement>("#cursor-settings");
	if (!panel || panel.dataset.initialized) return;
	panel.dataset.initialized = "true";
	let settings = parseCursorSettings(readStoredJson(CURSOR_STORAGE_KEY));
	const cursor = document.createElement("div");
	cursor.id = "site-cursor";
	cursor.hidden = true;
	cursor.setAttribute("aria-hidden", "true");
	// Static vector geometry lets all pointer shapes share the same three colors.
	cursor.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<g class="cursor-arrow" transform="translate(-2.5 -2.5)"><path class="cursor-shape" d="M2.5 4.2 Q1.6 1.6 4.2 2.5 L21 9.3 Q23 10.3 20.8 11.3 L13.2 13.2 L11.3 20.8 Q10.3 23 9.3 21 Z"/></g>
		<g class="cursor-hand" transform="translate(-8 -1)"><path class="cursor-shape" d="M6 12 V3 C6 1.9 6.9 1 8 1 S10 1.9 10 3 V9 C10 7 14 7 14 10 C14 8 18 8 18 11 C18 9 22 9 22 12 V16 C22 20 19 23 15 23 H12 C10 23 8.5 22 7.5 20.5 L2.5 14 C1.8 13 2 11.8 3 11.3 C4 10.8 5 11.3 6 12 Z M10 9 V14 M14 10 V14 M18 11 V14"/></g>
		<g class="cursor-text" transform="translate(-12 -12)"><path class="cursor-shape" d="M8 1 H16 Q17 1 17 2 Q17 3 16 3 H13 V21 H16 Q17 21 17 22 Q17 23 16 23 H8 Q7 23 7 22 Q7 21 8 21 H11 V3 H8 Q7 3 7 2 Q7 1 8 1 Z"/></g>
	</svg>`;
	document.body.append(cursor);
	const size = panel.querySelector<HTMLInputElement>("#cursor-size");
	const output = panel.querySelector<HTMLOutputElement>("#cursor-size-value");
	const syncColors: (() => void)[] = [];
	const sync = () => {
		for (const key of cursorColors) {
			cursor.style.setProperty(`--cursor-${key}`, settings[key]);
		}
		for (const syncColor of syncColors) syncColor();
		cursor.style.setProperty("--cursor-size", `${settings.size}px`);
		if (size) size.value = String(settings.size);
		if (output) output.value = `${settings.size} px`;
	};
	const save = () => {
		sync();
		writeStoredJson(CURSOR_STORAGE_KEY, settings);
	};
	for (const key of cursorColors) {
		const row = panel.querySelector<HTMLElement>(
			`[data-color-setting="cursor-${key}"]`,
		);
		if (!row) continue;
		const syncColor = initColorSetting(
			row,
			() => settings[key],
			(value) => {
				settings[key] = value;
				save();
			},
		);
		if (syncColor) syncColors.push(syncColor);
	}
	size?.addEventListener("input", () => {
		settings = parseCursorSettings({ ...settings, size: Number(size.value) });
		save();
	});
	panel.querySelector("#cursor-reset")?.addEventListener("click", () => {
		settings = { ...cursorDefaults };
		save();
	});
	window.addEventListener("storage", (event) => {
		if (event.key !== CURSOR_STORAGE_KEY && event.key !== null) return;
		settings = parseCursorSettings(readStoredJson(CURSOR_STORAGE_KEY));
		sync();
	});
	save();

	const fine = matchMedia("(hover: hover) and (pointer: fine)");
	const root = document.documentElement;
	let pointerInside = false;
	let kind = "arrow";
	let draggingText = false;
	let x = 0;
	let y = 0;
	const paint = () => {
		cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
	};
	const hide = () => {
		cursor.hidden = true;
		cursor.removeAttribute("data-pressed");
		draggingText = false;
	};
	const classify = (element: Element | null) => {
		if (!element) return;
		const interactive = element.closest(
			"a[href], area[href], button, summary, select, input, label, [role=button], [role=link], [onclick], .cursor-pointer",
		);
		const control =
			interactive instanceof HTMLLabelElement
				? interactive.control
				: interactive;
		const disabled =
			!!element.closest(":disabled, [aria-disabled=true], [inert]") ||
			!!control?.closest(":disabled, [aria-disabled=true], [inert]");
		if (draggingText) {
			kind = "text";
		} else if (disabled) {
			kind = "arrow";
		} else if (
			element.closest(
				"input:not([type]), input[type=text i], input[type=search i], input[type=email i], input[type=url i], input[type=tel i], input[type=password i], input[type=number i], textarea, [contenteditable=''], [contenteditable=true], [contenteditable=plaintext-only]",
			)
		) {
			kind = "text";
		} else if (control) {
			kind = "pointer";
		} else if (
			element.closest(
				"p, li, h1, h2, h3, h4, h5, h6, pre, code, blockquote, td, th",
			)
		) {
			kind = "text";
		} else {
			kind = "arrow";
		}
		if (cursor.hidden) paint();
		cursor.dataset.kind = kind;
		cursor.hidden = false;
	};
	const refresh = () => {
		if (!fine.matches || !pointerInside || document.hidden) return;
		classify(document.elementFromPoint(x, y));
	};
	const syncAvailability = () => {
		root.toggleAttribute("data-cursor-enabled", fine.matches);
		if (fine.matches) refresh();
		else hide();
	};
	syncAvailability();
	document.addEventListener(
		"pointermove",
		(event) => {
			if (!fine.matches || event.pointerType !== "mouse") {
				pointerInside = false;
				hide();
				return;
			}
			pointerInside = true;
			x = event.clientX;
			y = event.clientY;
			paint();
			classify(event.target instanceof Element ? event.target : null);
		},
		{ passive: true },
	);
	document.addEventListener("pointerdown", (event) => {
		if (!fine.matches || event.pointerType !== "mouse") {
			pointerInside = false;
			hide();
			return;
		}
		pointerInside = true;
		x = event.clientX;
		y = event.clientY;
		paint();
		classify(event.target instanceof Element ? event.target : null);
		draggingText = kind === "text";
		cursor.toggleAttribute(
			"data-pressed",
			event.button === 0 && kind === "pointer",
		);
	});
	document.addEventListener("pointerup", () => {
		draggingText = false;
		cursor.removeAttribute("data-pressed");
		refresh();
	});
	root.addEventListener("pointerenter", (event) => {
		if (!fine.matches || event.pointerType !== "mouse") return;
		pointerInside = true;
		x = event.clientX;
		y = event.clientY;
		paint();
		refresh();
	});
	root.addEventListener("pointerleave", () => {
		pointerInside = false;
		hide();
	});
	document.addEventListener("pointercancel", () => {
		pointerInside = false;
		hide();
	});
	window.addEventListener("blur", hide);
	window.addEventListener("focus", refresh);
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) hide();
		else refresh();
	});
	fine.addEventListener("change", syncAvailability);
	// Keep the cursor visible during navigation and classify the replacement DOM.
	document.addEventListener("swup:content:replace", refresh);
	document.addEventListener("swup:page:view", refresh);
	document.addEventListener(
		"scroll",
		() => {
			if (!cursor.hidden) classify(document.elementFromPoint(x, y));
		},
		{ capture: true, passive: true },
	);
}
