// 新增颜色选项时，在这里声明，并在对应样式中使用 cssVariable。
export const appearanceOptions = [
	{
		key: "card",
		label: "卡片背景",
		cssVariable: "--card-surface",
		defaultValue: "#1d1d1deb",
	},
	{
		key: "blog",
		label: "博客背景色",
		cssVariable: "--blog-background",
		defaultValue: "#03080eff",
	},
] as const;

export const APPEARANCE_STORAGE_KEY = "execute233.appearance.v1";

export function isAppearanceColor(value: unknown): value is string {
	return typeof value === "string" && /^#[\da-f]{8}$/i.test(value);
}
