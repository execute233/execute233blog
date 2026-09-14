import { readStoredJson, writeStoredJson } from "@/utils/local-storage";
import "vanilla-colorful/hex-alpha-color-picker.js";
import {
	APPEARANCE_STORAGE_KEY,
	appearanceOptions,
	isAppearanceColor,
} from "@/data/appearance";

export function initAppearanceSettings(): void {
	const panel = document.querySelector<HTMLElement>("#appearance-settings");
	if (!panel || panel.dataset.initialized) return;
	panel.dataset.initialized = "true";
	const values: Record<string, string> = {};
	const parsed = readStoredJson(APPEARANCE_STORAGE_KEY);
	const saved =
		parsed && typeof parsed === "object"
			? (parsed as Record<string, unknown>)
			: {};
	const syncRows: (() => void)[] = [];
	const save = () => writeStoredJson(APPEARANCE_STORAGE_KEY, values);
	for (const option of appearanceOptions) {
		const row = panel.querySelector<HTMLElement>(
			`[data-appearance="${option.key}"]`,
		);
		if (!row) continue;
		const swatch = row.querySelector<HTMLButtonElement>("button");
		const preview = swatch?.querySelector("span");
		const palette = row.querySelector<HTMLElement>(".appearance-palette");
		const picker = row.querySelector("hex-alpha-color-picker");
		const hex = row.querySelector<HTMLInputElement>(".appearance-hex");
		const opacity = row.querySelector<HTMLInputElement>(".appearance-opacity");
		const output = row.querySelector("output");
		if (
			!swatch ||
			!preview ||
			!palette ||
			!picker ||
			!hex ||
			!opacity ||
			!output
		)
			continue;
		const savedValue = saved[option.key];
		values[option.key] = isAppearanceColor(savedValue)
			? savedValue
			: option.defaultValue;
		const sync = () => {
			const value = values[option.key];
			document.documentElement.style.setProperty(option.cssVariable, value);
			preview.style.background = value;
			picker.color = value;
			hex.value = value;
			opacity.value = String(
				Math.round((Number.parseInt(value.slice(7), 16) / 255) * 100),
			);
			output.value = `${opacity.value}%`;
		};
		const update = (value: unknown) => {
			if (!isAppearanceColor(value)) return;
			values[option.key] = value;
			sync();
			save();
		};
		let heightAnimation: Animation | undefined;
		let fadeAnimation: Animation | undefined;
		const setPaletteOpen = (open: boolean) => {
			const startHeight = row.getBoundingClientRect().height;
			const startOpacity = palette.hidden
				? "0"
				: getComputedStyle(palette).opacity;
			heightAnimation?.cancel();
			fadeAnimation?.cancel();
			swatch.setAttribute("aria-expanded", String(open));
			palette.hidden = !open;
			const endHeight = row.getBoundingClientRect().height;
			palette.hidden = false;
			palette.inert = !open;
			const timing = {
				duration: matchMedia("(prefers-reduced-motion: reduce)").matches
					? 0
					: 320,
				easing: "ease-in-out",
			};
			// 先为调色板腾出空间，再显示内容；收起时顺序相反。
			heightAnimation = row.animate(
				[
					{ height: `${startHeight}px`, overflow: "hidden" },
					{
						height: `${open ? endHeight : startHeight}px`,
						overflow: "hidden",
						offset: open ? 0.65 : 0.35,
					},
					{ height: `${endHeight}px`, overflow: "hidden" },
				],
				timing,
			);
			fadeAnimation = palette.animate(
				[
					{ opacity: startOpacity },
					{ opacity: open ? startOpacity : 0, offset: open ? 0.65 : 0.35 },
					{ opacity: open ? 1 : 0 },
				],
				timing,
			);
			heightAnimation.onfinish = () => {
				palette.hidden = !open;
				heightAnimation = undefined;
				fadeAnimation = undefined;
			};
		};
		swatch.addEventListener("click", () =>
			setPaletteOpen(swatch.getAttribute("aria-expanded") !== "true"),
		);
		palette.addEventListener("keydown", (event) => {
			if (event.key !== "Escape") return;
			event.stopPropagation();
			setPaletteOpen(false);
			swatch.focus();
		});
		picker.addEventListener("color-changed", (event) =>
			update(event.detail.value),
		);
		hex.addEventListener("input", () => update(hex.value));
		hex.addEventListener("change", () => {
			update(hex.value);
			sync();
		});
		opacity.addEventListener("input", () => {
			const alpha = Math.round((Number(opacity.value) / 100) * 255)
				.toString(16)
				.padStart(2, "0");
			update(values[option.key].slice(0, 7) + alpha);
		});
		syncRows.push(sync);
		sync();
	}
	panel.querySelector("#appearance-reset")?.addEventListener("click", () => {
		for (const option of appearanceOptions)
			values[option.key] = option.defaultValue;
		for (const sync of syncRows) sync();
		save();
	});
}
