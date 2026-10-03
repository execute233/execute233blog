import {
	APPEARANCE_STORAGE_KEY,
	appearanceOptions,
	isAppearanceColor,
} from "@/data/appearance";
import { initColorSetting } from "@/scripts/color-setting";
import { readStoredJson, writeStoredJson } from "@/utils/local-storage";

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
			`[data-color-setting="${option.key}"]`,
		);
		if (!row) continue;
		const savedValue = saved[option.key];
		// 旧默认色随主题更新；保留用户自行选择的其他颜色。
		values[option.key] =
			isAppearanceColor(savedValue) &&
			savedValue.toLowerCase() !== option.legacyDefaultValue
				? savedValue
				: option.defaultValue;
		const apply = () =>
			document.documentElement.style.setProperty(
				option.cssVariable,
				values[option.key],
			);
		const syncRow = initColorSetting(
			row,
			() => values[option.key],
			(value) => {
				values[option.key] = value;
				apply();
				save();
			},
		);
		syncRows.push(() => {
			apply();
			syncRow?.();
		});
		apply();
	}
	panel.querySelector("#appearance-reset")?.addEventListener("click", () => {
		for (const option of appearanceOptions)
			values[option.key] = option.defaultValue;
		for (const sync of syncRows) sync();
		save();
	});
}
