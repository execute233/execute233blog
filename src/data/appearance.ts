// 新增颜色选项时，在这里声明，并在对应样式中使用 cssVariable。
export const appearanceOptions = [
	{
		key: "blog",
		label: "博客背景色",
		cssVariable: "--blog-background",
		defaultValue: "#100d14ff",
		legacyDefaultValue: "#03080eff",
	},
] as const;

export const APPEARANCE_STORAGE_KEY = "execute233.appearance.v1";

export { isHexAlphaColor as isAppearanceColor } from "@/utils/color";
