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
	// Static vector geometry lets both pointers share the same three colors.
	cursor.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<g class="cursor-arrow" transform="translate(-2.5 -2.5)"><path class="cursor-shape" d="M2.5 4.2 Q1.6 1.6 4.2 2.5 L21 9.3 Q23 10.3 20.8 11.3 L13.2 13.2 L11.3 20.8 Q10.3 23 9.3 21 Z"/></g>
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
	const reduced = matchMedia("(prefers-reduced-motion: reduce)");
	const root = document.documentElement;
	let hovered: Element | null = null;
	let kind = "arrow";
	let draggingText = false;
	let x = 0;
	let y = 0;
	let tx = 0;
	let ty = 0;
	let vx = 0;
	let vy = 0;
	let angle = 0;
	let va = 0;
	let scale = 1;
	let vs = 0;
	let targetAngle = 0;
	let targetScale = 1;
	let last = 0;
	let frame = 0;
	const paint = () => {
		cursor.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg) scale(${scale}, 1)`;
	};
	const snap = () => {
		cancelAnimationFrame(frame);
		frame = 0;
		x = tx;
		y = ty;
		vx = vy = angle = va = vs = 0;
		scale = 1;
		paint();
	};
	const hide = () => {
		root.removeAttribute("data-cursor-active");
		hovered = null;
		cursor.hidden = true;
		draggingText = false;
		cancelAnimationFrame(frame);
		frame = 0;
	};
	const classify = (element: Element | null) => {
		if (element === hovered) return;
		hovered = null;
		if (!element || element.closest("iframe, select")) {
			hide();
			return;
		}
		// Read the original cursor synchronously, restoring suppression before
		// returning to the browser so classification cannot leave a visible gap.
		const active = root.hasAttribute("data-cursor-active");
		if (active) root.removeAttribute("data-cursor-active");
		const native = getComputedStyle(element).cursor;
		if (active) root.setAttribute("data-cursor-active", "");
		if (
			!["auto", "default", "pointer", "text", "none"].includes(native) ||
			native === "none"
		) {
			hide();
			return;
		}
		const text =
			draggingText ||
			native === "text" ||
			(native !== "pointer" &&
				!element.closest("a, button, summary, label, [role=button]") &&
				!!element.closest(
					"p, li, h1, h2, h3, h4, h5, h6, pre, code, blockquote, td, th, input:not([type]), input[type=text], input[type=search], textarea, [contenteditable=true]",
				));
		const nextKind = text ? "text" : "arrow";
		if (cursor.hidden || nextKind !== kind) snap();
		kind = nextKind;
		cursor.dataset.kind = kind;
		cursor.hidden = false;
		hovered = element;
		root.setAttribute("data-cursor-active", "");
	};
	const tick = (now: number) => {
		frame = 0;
		const dt = Math.min((now - last) / 1000 || 1 / 60, 1 / 30);
		last = now;
		const remaining = Math.hypot(tx - x, ty - y);
		if (remaining < 0.85) {
			targetAngle = 0;
			targetScale = 1;
		}
		while (targetAngle - angle > 180) targetAngle -= 360;
		while (targetAngle - angle < -180) targetAngle += 360;
		const steps = Math.ceil(dt * 240);
		const h = dt / steps;
		for (let i = 0; i < steps; i++) {
			const wp = (2 * Math.PI) / 0.16;
			const wr = (2 * Math.PI) / 0.12;
			vx += ((tx - x) * wp * wp - 2 * 1.05 * wp * vx) * h;
			vy += ((ty - y) * wp * wp - 2 * 1.05 * wp * vy) * h;
			x += vx * h;
			y += vy * h;
			va += ((targetAngle - angle) * wr * wr - 2 * 1.05 * wr * va) * h;
			angle += va * h;
			vs += ((targetScale - scale) * wp * wp - 2 * 1.05 * wp * vs) * h;
			scale += vs * h;
		}
		if (
			remaining < 0.85 &&
			Math.hypot(vx, vy) < 12 &&
			Math.abs(targetAngle - angle) < 0.02 &&
			Math.abs(va) < 0.05 &&
			Math.abs(scale - 1) < 0.001 &&
			Math.abs(vs) < 0.005
		) {
			snap();
			return;
		}
		paint();
		frame = requestAnimationFrame(tick);
	};
	document.addEventListener(
		"pointermove",
		(event) => {
			if (!fine.matches || event.pointerType !== "mouse") {
				hide();
				return;
			}
			tx = event.clientX;
			ty = event.clientY;
			classify(event.target instanceof Element ? event.target : null);
			if (cursor.hidden) return;
			if (kind === "text" || reduced.matches || event.buttons) {
				snap();
				return;
			}
			const dx = tx - x;
			const dy = ty - y;
			const distance = Math.hypot(dx, dy);
			targetAngle =
				distance > 196
					? (Math.atan2(dy, dx) * 180) / Math.PI + 135
					: Math.max(
							-1,
							Math.min(1, (dx * 0.75 - dy * 0.62) / Math.max(distance, 1)),
						) * 22;
			targetScale = distance > 196 ? 0.92 : 0.96;
			if (!frame) {
				last = performance.now();
				frame = requestAnimationFrame(tick);
			}
		},
		{ passive: true },
	);
	document.addEventListener("pointerdown", (event) => {
		if (event.pointerType !== "mouse") {
			hide();
			return;
		}
		tx = event.clientX;
		ty = event.clientY;
		draggingText = kind === "text";
		snap();
	});
	document.addEventListener("pointerup", () => {
		draggingText = false;
	});
	document.addEventListener("pointerout", (event) => {
		if (!event.relatedTarget) hide();
	});
	document.addEventListener("pointercancel", hide);
	window.addEventListener("blur", hide);
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) hide();
	});
	fine.addEventListener("change", hide);
	reduced.addEventListener("change", snap);
	// Delegation survives Swup replacements; clear the old target during navigation.
	document.addEventListener("swup:visit:start", hide);
	document.addEventListener(
		"scroll",
		() => {
			if (!cursor.hidden) classify(document.elementFromPoint(tx, ty));
		},
		{ capture: true, passive: true },
	);
}
