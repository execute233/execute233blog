import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

export const THEME_CHANGE_EVENT = "execute233:theme-change";

export function applyThemeToDocument(theme: LIGHT_DARK_MODE): void {
	const root = document.documentElement;
	root.classList.toggle(
		"dark",
		theme === DARK_MODE ||
			(theme === AUTO_MODE &&
				window.matchMedia("(prefers-color-scheme: dark)").matches),
	);
	root.dataset.themeMode = theme;
	// Code blocks retain their independent dark theme.
	root.setAttribute("data-theme", expressiveCodeConfig.theme);
	document.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	applyThemeToDocument(theme);
	try {
		localStorage.setItem("theme", theme);
	} catch {
		// The DOM keeps the current session's choice when storage is unavailable.
	}
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	let theme: string | null = document.documentElement.dataset.themeMode ?? null;
	if (!theme) {
		try {
			theme = localStorage.getItem("theme");
		} catch {
			return DEFAULT_THEME;
		}
	}
	return theme === LIGHT_MODE || theme === DARK_MODE || theme === AUTO_MODE
		? theme
		: DEFAULT_THEME;
}
