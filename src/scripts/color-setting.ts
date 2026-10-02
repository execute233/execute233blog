import "vanilla-colorful/hex-alpha-color-picker.js";
import { isHexAlphaColor } from "@/utils/color";

// Both settings panels use this binding, including the original two-stage
// height/fade animation. Persistence and applying colors belong to the caller.
export function initColorSetting(
	row: HTMLElement,
	getValue: () => string,
	onChange: (value: string) => void,
): (() => void) | undefined {
	const swatch = row.querySelector<HTMLButtonElement>("button");
	const preview = swatch?.querySelector("span");
	const palette = row.querySelector<HTMLElement>(".appearance-palette");
	const picker = row.querySelector("hex-alpha-color-picker");
	const hex = row.querySelector<HTMLInputElement>(".appearance-hex");
	const opacity = row.querySelector<HTMLInputElement>(".appearance-opacity");
	const output = row.querySelector("output");
	if (!swatch || !preview || !palette || !picker || !hex || !opacity || !output)
		return;
	const sync = () => {
		const value = getValue();
		preview.style.background = value;
		picker.color = value;
		hex.value = value;
		opacity.value = String(
			Math.round((Number.parseInt(value.slice(7), 16) / 255) * 100),
		);
		output.value = `${opacity.value}%`;
	};
	const update = (value: unknown) => {
		if (!isHexAlphaColor(value)) return;
		onChange(value);
		sync();
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
		update(getValue().slice(0, 7) + alpha);
	});
	sync();
	return sync;
}
