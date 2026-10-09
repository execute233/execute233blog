import {
	APPEARANCE_STORAGE_KEY,
	appearanceOptions,
	backgroundDefaults,
	LEGACY_APPEARANCE_STORAGE_KEY,
	parseAppearanceSettings,
} from "@/data/appearance";
import { initColorSetting } from "@/scripts/color-setting";
import { readStoredJson, writeStoredJson } from "@/utils/local-storage";
import { THEME_CHANGE_EVENT } from "@/utils/setting-utils";

export function initAppearanceSettings(): void {
	const panel = document.querySelector<HTMLElement>("#appearance-settings");
	if (!panel || panel.dataset.initialized) return;
	panel.dataset.initialized = "true";
	const defaultHue = Number(panel.dataset.defaultHue);
	const settings = parseAppearanceSettings(
		readStoredJson(APPEARANCE_STORAGE_KEY),
		readStoredJson(LEGACY_APPEARANCE_STORAGE_KEY),
		defaultHue,
	);
	const root = document.documentElement;
	const activeMode = (): "light" | "dark" =>
		root.classList.contains("dark") ? "dark" : "light";
	let mode = activeMode();
	const hueInput = panel.querySelector<HTMLInputElement>("#theme-hue");
	const hueOutput = panel.querySelector<HTMLOutputElement>("#theme-hue-value");
	const currentHue = Number(
		document.documentElement.style.getPropertyValue("--hue") || defaultHue,
	);
	settings.hue = hueInput ? currentHue : defaultHue;
	const save = () => writeStoredJson(APPEARANCE_STORAGE_KEY, settings);
	const syncHue = () => {
		root.style.setProperty("--hue", String(settings.hue));
		if (hueInput) hueInput.value = String(settings.hue);
		if (hueOutput) hueOutput.value = `${settings.hue}°`;
	};
	hueInput?.addEventListener("input", () => {
		settings.hue = Number(hueInput.value);
		syncHue();
		save();
	});
	syncHue();
	const option = appearanceOptions[0];
	const applyBackground = () =>
		root.style.setProperty(option.cssVariable, settings.backgrounds[mode]);
	const row = panel.querySelector<HTMLElement>(
		`[data-color-setting="${option.key}"]`,
	);
	const syncRow = row
		? initColorSetting(
				row,
				() => settings.backgrounds[mode],
				(value) => {
					settings.backgrounds[mode] = value;
					applyBackground();
					save();
				},
			)
		: undefined;
	const syncBackground = () => {
		mode = activeMode();
		applyBackground();
		syncRow?.();
	};
	document.addEventListener(THEME_CHANGE_EVENT, syncBackground);
	syncBackground();
	panel.querySelector("#appearance-reset")?.addEventListener("click", () => {
		settings.hue = defaultHue;
		syncHue();
		settings.backgrounds[mode] = backgroundDefaults[mode];
		syncBackground();
		save();
	});
}
