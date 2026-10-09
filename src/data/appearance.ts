import { isHexAlphaColor } from "@/utils/color";

export const backgroundDefaults: Record<"light" | "dark", string> = {
	light: "#fff8faff",
	dark: "#100d14ff",
};

export type AppearanceSettings = {
	hue: number;
	backgrounds: Record<"light" | "dark", string>;
};

export const appearanceOptions = [
	{
		key: "blog",
		label: "博客背景色",
		cssVariable: "--blog-background",
		defaultValue: "#100d14ff",
		legacyDefaultValue: "#03080eff",
	},
] as const;

export const APPEARANCE_STORAGE_KEY = "execute233.appearance.v2";
export const LEGACY_APPEARANCE_STORAGE_KEY = "execute233.appearance.v1";

export { isHexAlphaColor as isAppearanceColor } from "@/utils/color";

export function parseAppearanceSettings(
	value: unknown,
	legacyValue: unknown,
	defaultHue: number,
): AppearanceSettings {
	const saved =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};
	const legacy =
		legacyValue && typeof legacyValue === "object"
			? (legacyValue as Record<string, unknown>)
			: {};
	const backgrounds =
		saved.backgrounds && typeof saved.backgrounds === "object"
			? (saved.backgrounds as Record<string, unknown>)
			: {};
	let hue = defaultHue;
	for (const candidate of [legacy.hue, saved.hue]) {
		if (
			typeof candidate === "number" &&
			Number.isInteger(candidate) &&
			candidate >= 0 &&
			candidate <= 360
		)
			hue = candidate;
	}
	const legacyDark =
		isHexAlphaColor(legacy.blog) &&
		legacy.blog.toLowerCase() !== appearanceOptions[0].legacyDefaultValue
			? legacy.blog
			: backgroundDefaults.dark;
	return {
		hue,
		backgrounds: {
			light: isHexAlphaColor(backgrounds.light)
				? backgrounds.light
				: backgroundDefaults.light,
			dark: isHexAlphaColor(backgrounds.dark) ? backgrounds.dark : legacyDark,
		},
	};
}
