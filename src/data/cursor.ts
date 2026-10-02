import { normalizeHexColor } from "@/utils/color";

export const CURSOR_STORAGE_KEY = "execute233.cursor.v1";

export const cursorDefaults = {
	glow: "#4996ffff",
	border: "#ffffffff",
	fill: "#000000ff",
	// Browsers do not expose the OS pointer size. Use the original 24px asset
	// size (not the 2x preview), with a user-adjustable CSS-pixel size.
	size: 24,
};

export type CursorSettings = typeof cursorDefaults;
export const cursorColors = ["glow", "border", "fill"] as const;

export function parseCursorSettings(value: unknown): CursorSettings {
	const result = { ...cursorDefaults };
	if (!value || typeof value !== "object") return result;
	const saved = value as Record<string, unknown>;
	for (const key of cursorColors) {
		const color = normalizeHexColor(saved[key]);
		if (color) result[key] = color;
	}
	if (
		typeof saved.size === "number" &&
		Number.isFinite(saved.size) &&
		saved.size >= 16 &&
		saved.size <= 64
	)
		result.size = Math.round(saved.size);
	return result;
}
