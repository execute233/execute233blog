import { readStoredJson, writeStoredJson } from "@/utils/local-storage";

// 银河粒子、视差和鼠标交互来自用户提供的 background.html。
// 此模块只初始化一次：Canvas 与顶栏均位于 Swup 替换容器之外。
const CONFIG = Object.freeze({
	seed: 233, // 固定随机种子：改变它可更换星空分布
	readingVeil: 0.55, // 正文背后的遮光强度 0~1
	starCount: 1050, // 两侧及远景星点数量（桌面端）
	galaxyCount: 10500, // 银河粒子数，建议 3000~18000
	mobileFactor: 0.48, // 窄屏粒子数量系数
	mobileBreakpoint: 700, // 窄屏阈值，像素
	pixelRatioCap: 1.75, // Canvas 像素比上限，兼顾清晰度与性能
	galaxyRadius: 0.58, // 银河半径 / 视口短边
	galaxyTilt: 48, // 银河倾角，度；0 为正面，85 接近侧面
	galaxyOrientation: -26, // 银河在屏幕中的方向，度
	galaxyArms: 4, // 旋臂数量，正整数
	galaxyTwist: 7.6, // 旋臂缠绕程度
	galaxySpread: 0.22, // 旋臂角度散布，越大越松散
	galaxySpeed: 0.035, // 默认角速度，弧度/秒；负数为反转
	galaxyBrightness: 1.1, // 银河亮度倍数
	playbackSpeed: 1, // 银河播放倍率，0 为静止
	driftSpeed: 0.6, // 星空缓慢漂移速度，像素/秒
	driftAmplitude: 8, // 星点局部漂浮幅度，像素
	twinkleAmount: 0.18, // 闪烁强度 0~1
	scrollParallax: 0.22, // 滚动视差强度；正数与页面内容同向
	scrollSmoothing: 7, // 滚动缓动响应，越大跟随越快
	mouseRadius: 145, // 鼠标推开范围，像素
	mousePush: 85, // 最大推开距离，像素
	mouseResponse: 9, // 推开及归位响应速度
	respectReducedMotion: true, // 遵循系统减少动态效果：默认暂停且关闭视差/推开
	palette: ["#d4eaff", "#83b9eb", "#f5d4b3", "#ffffff"],
});

const STORAGE_KEY = "execute233.background.v1";
const controls = [
	["playbackSpeed", "银河播放速度", 0, 4, 0.05, "×"],
	["galaxyBrightness", "银河亮度", 0.1, 1.6, 0.05, ""],
	["starDensity", "两侧星点密度", 0.3, 2, 0.1, "×"],
	["galaxyTilt", "银河倾角", 0, 85, 1, "°"],
	["scrollParallax", "滚动视差", 0, 0.6, 0.01, ""],
	["mousePush", "鼠标推力", 0, 160, 5, " px"],
	["readingVeil", "正文遮光", 0, 0.95, 0.05, ""],
] as const;
type SettingKey = (typeof controls)[number][0];
type Settings = Record<SettingKey, number> & { paused: boolean };
const defaults: Settings = {
	playbackSpeed: CONFIG.playbackSpeed,
	galaxyBrightness: CONFIG.galaxyBrightness,
	starDensity: 1,
	galaxyTilt: CONFIG.galaxyTilt,
	scrollParallax: CONFIG.scrollParallax,
	mousePush: CONFIG.mousePush,
	readingVeil: CONFIG.readingVeil,
	paused: false,
};
function readSettings(): Settings {
	const result = { ...defaults };
	const saved = readStoredJson(STORAGE_KEY);
	if (!saved || typeof saved !== "object") return result;
	for (const [key, , min, max] of controls) {
		const value = (saved as Record<string, unknown>)[key];
		if (typeof value === "number" && Number.isFinite(value))
			result[key] = Math.max(min, Math.min(max, value));
	}
	if ("paused" in saved && typeof saved.paused === "boolean")
		result.paused = saved.paused;
	return result;
}
export function initGalaxy(): void {
	const element = document.querySelector<HTMLCanvasElement>("#universe");
	if (!element) return;
	const canvas: HTMLCanvasElement = element;
	const context = canvas.getContext("2d");
	if (!context) return;
	const ctx: CanvasRenderingContext2D = context;
	const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
	const settings = readSettings();
	let width = 0;
	let height = 0;
	let dpr = 1;
	let narrow = false;
	let stars: {
		u: number;
		v: number;
		depth: number;
		phase: number;
		size: number;
		color: number;
		opacity: number;
		dx: number;
		dy: number;
	}[] = [];
	let galaxy: {
		r: number;
		a: number;
		z: number;
		size: number;
		color: number;
		opacity: number;
	}[] = [];
	let time = 0;
	let angle = 0;
	let lastFrame = 0;
	let frameId = 0;
	let scrollPosition = window.scrollY;
	let paused = settings.paused || reducedMotion.matches;
	const pointer = { x: -10000, y: -10000, active: false };
	const motionReduced = () =>
		CONFIG.respectReducedMotion && reducedMotion.matches;
	const clamp = (v: number, min: number, max: number) =>
		Math.max(min, Math.min(max, v));
	const wrap = (v: number, size: number) => ((v % size) + size) % size;
	function randomGenerator(initialSeed: number) {
		let seed = initialSeed;
		return () => {
			seed |= 0;
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	// 小型星光纹理仅生成一次，避免每帧为每颗星创建渐变。
	const sprites = CONFIG.palette.map((color) => {
		const c = document.createElement("canvas");
		c.width = c.height = 48;
		const g = c.getContext("2d");
		if (!g) return c;
		const glow = g.createRadialGradient(24, 24, 0, 24, 24, 24);
		glow.addColorStop(0, "#ffffff");
		glow.addColorStop(0.07, color);
		glow.addColorStop(0.22, `${color}8c`);
		glow.addColorStop(0.5, `${color}20`);
		glow.addColorStop(1, `${color}00`);
		g.fillStyle = glow;
		g.fillRect(0, 0, 48, 48);
		return c;
	});
	function createStars() {
		const rnd = randomGenerator(CONFIG.seed);
		stars = Array.from(
			{
				length: Math.round(
					CONFIG.starCount *
						settings.starDensity *
						(narrow ? CONFIG.mobileFactor : 1),
				),
			},
			() => ({
				u: rnd(),
				v: rnd(),
				depth: 0.18 + rnd() * 0.82,
				phase: rnd() * Math.PI * 2,
				size: 0.45 + rnd() ** 4 * 2.5,
				color: Math.floor(rnd() * sprites.length),
				opacity: 0.22 + rnd() * 0.68,
				dx: 0,
				dy: 0,
			}),
		);
	}
	function createGalaxy() {
		const rnd = randomGenerator(CONFIG.seed + 17);
		galaxy = Array.from(
			{
				length: Math.round(
					CONFIG.galaxyCount * (narrow ? CONFIG.mobileFactor : 1),
				),
			},
			(_, i) => {
				const core = rnd() < 0.23;
				const r = core ? rnd() ** 1.9 * 0.22 : 0.07 + rnd() ** 0.85 * 0.93;
				const spread = (rnd() + rnd() + rnd() - 1.5) * CONFIG.galaxySpread;
				const a = core
					? rnd() * Math.PI * 2
					: ((i % CONFIG.galaxyArms) * Math.PI * 2) / CONFIG.galaxyArms +
						r * CONFIG.galaxyTwist +
						spread;
				return {
					r,
					a,
					z: (rnd() + rnd() - 1) * (core ? 0.065 : 0.025),
					size: rnd() < 0.025 ? 4 + rnd() * 6 : 0.7 + rnd() * 2.3,
					color: core
						? rnd() < 0.6
							? 2
							: 3
						: rnd() < 0.16
							? 2
							: rnd() < 0.55
								? 0
								: 1,
					opacity: 0.16 + rnd() * 0.65,
				};
			},
		);
	}
	function resize() {
		width = window.innerWidth;
		height = window.innerHeight;
		const wasNarrow = narrow;
		narrow = width < CONFIG.mobileBreakpoint;
		dpr = Math.min(devicePixelRatio || 1, CONFIG.pixelRatioCap);
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		if (!stars.length || wasNarrow !== narrow) {
			createStars();
			createGalaxy();
		}
		requestDraw();
	}
	function drawGalaxy() {
		const radius = Math.min(width, height) * CONFIG.galaxyRadius;
		const tilt = (settings.galaxyTilt * Math.PI) / 180;
		const orientation = (CONFIG.galaxyOrientation * Math.PI) / 180;
		const ct = Math.cos(tilt);
		const st = Math.sin(tilt);
		const co = Math.cos(orientation);
		const so = Math.sin(orientation);
		ctx.globalCompositeOperation = "lighter";
		// 银心柔光不随盘面压扁，保留核球的体积感。
		ctx.globalAlpha = settings.galaxyBrightness * 0.34;
		ctx.drawImage(
			sprites[2],
			width / 2 - radius * 0.33,
			height / 2 - radius * 0.33,
			radius * 0.66,
			radius * 0.66,
		);
		for (const p of galaxy) {
			const a = p.a + angle;
			const x = Math.cos(a) * p.r;
			const y = Math.sin(a) * p.r;
			const py = y * ct + p.z * st;
			const perspective = 1 / (1 + y * st * 0.16);
			const sx = width / 2 + (x * co - py * so) * radius * perspective;
			const sy = height / 2 + (x * so + py * co) * radius * perspective;
			const size = p.size * 1.8 * perspective * (narrow ? 0.85 : 1);
			ctx.globalAlpha = clamp(p.opacity * settings.galaxyBrightness, 0, 1);
			ctx.drawImage(sprites[p.color], sx - size / 2, sy - size / 2, size, size);
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = "source-over";
	}
	function drawStars(dt: number) {
		const ease = 1 - Math.exp(-CONFIG.mouseResponse * dt);
		const quiet = motionReduced();
		for (const p of stars) {
			// 星空横向全覆盖，但正文中心降低密度感；边缘自然渐变，无硬分界。
			const x =
				p.u * width +
				Math.sin(time * 0.13 + p.phase) * CONFIG.driftAmplitude * p.depth;
			const y =
				wrap(
					p.v * (height + 80) +
						time * CONFIG.driftSpeed * p.depth -
						(quiet ? 0 : scrollPosition * settings.scrollParallax * p.depth),
					height + 80,
				) - 40;
			let targetX = 0;
			let targetY = 0;
			if (pointer.active && !quiet && !paused) {
				const vx = x - pointer.x;
				const vy = y - pointer.y;
				const dist = Math.hypot(vx, vy);
				if (dist < CONFIG.mouseRadius) {
					const force =
						(1 - dist / CONFIG.mouseRadius) ** 2 * settings.mousePush * p.depth;
					targetX = (dist > 0.01 ? vx / dist : Math.cos(p.phase)) * force;
					targetY = (dist > 0.01 ? vy / dist : Math.sin(p.phase)) * force;
				}
			}
			if (!paused) {
				p.dx += (targetX - p.dx) * ease;
				p.dy += (targetY - p.dy) * ease;
			}
			const edge =
				0.22 +
				0.78 * clamp((Math.abs(x - width / 2) / width - 0.12) / 0.25, 0, 1);
			ctx.globalAlpha = clamp(
				p.opacity *
					edge *
					(1 + Math.sin(time * 0.7 + p.phase) * CONFIG.twinkleAmount),
				0,
				1,
			);
			const s = p.size * 5;
			ctx.drawImage(sprites[p.color], x + p.dx - s / 2, y + p.dy - s / 2, s, s);
		}
		ctx.globalAlpha = 1;
	}
	function render(now: number) {
		frameId = 0;
		const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
		lastFrame = now;
		if (!paused) {
			time += dt;
			angle += dt * CONFIG.galaxySpeed * settings.playbackSpeed;
			scrollPosition +=
				(window.scrollY - scrollPosition) *
				(1 - Math.exp(-CONFIG.scrollSmoothing * dt));
		}
		// 底色由 Canvas 的 CSS 背景控制，清空粒子避免透明背景留下拖影。
		ctx.clearRect(0, 0, width, height);
		drawGalaxy();
		drawStars(dt);
		if (!paused && !document.hidden) frameId = requestAnimationFrame(render);
	}
	function requestDraw() {
		if (!frameId && !document.hidden) frameId = requestAnimationFrame(render);
	}

	const panel = document.querySelector<HTMLDetailsElement>(
		"#background-settings",
	);
	const menu = document.querySelector<HTMLDetailsElement>("#site-settings");
	const sliders = document.querySelector("#background-sliders");
	const pauseButton =
		document.querySelector<HTMLButtonElement>("#background-pause");
	const viewButton =
		document.querySelector<HTMLButtonElement>("#background-view");
	if (!panel || !menu || !sliders || !pauseButton || !viewButton) return;
	const inputs = new Map<
		SettingKey,
		{ input: HTMLInputElement; output: HTMLOutputElement }
	>();
	function save(): void {
		writeStoredJson(STORAGE_KEY, settings);
	}

	function sync(): void {
		document.documentElement.style.setProperty(
			"--galaxy-veil",
			String(settings.readingVeil),
		);
		for (const [key, , , , step, unit] of controls) {
			const elements = inputs.get(key);
			if (!elements) continue;
			elements.input.value = String(settings[key]);
			elements.output.value = settings[key].toFixed(step < 1 ? 2 : 0) + unit;
		}
		if (pauseButton) pauseButton.textContent = paused ? "播放动画" : "暂停动画";
		pauseButton?.setAttribute("aria-pressed", String(paused));
		requestDraw();
	}
	for (const [key, label, min, max, step] of controls) {
		const row = document.createElement("div");
		row.className = "background-control";
		const caption = document.createElement("label");
		caption.htmlFor = `background-${key}`;
		caption.textContent = label;
		const output = document.createElement("output");
		output.htmlFor.value = caption.htmlFor;
		const input = document.createElement("input");
		input.type = "range";
		input.id = caption.htmlFor;
		input.min = String(min);
		input.max = String(max);
		input.step = String(step);
		input.addEventListener("input", () => {
			settings[key] = Number(input.value);
			if (key === "starDensity") createStars();
			sync();
			save();
		});
		inputs.set(key, { input, output });
		caption.append(output);
		row.append(caption, input);
		sliders.append(row);
	}
	pauseButton.addEventListener("click", () => {
		paused = !paused;
		settings.paused = paused;
		lastFrame = 0;
		sync();
		save();
	});
	document.querySelector("#background-reset")?.addEventListener("click", () => {
		Object.assign(settings, defaults);
		time = angle = 0;
		scrollPosition = window.scrollY;
		paused = motionReduced();
		lastFrame = 0;
		createStars();
		sync();
		save();
	});
	function exitPreview(): void {
		document.documentElement.classList.remove("stars-only");
		if (viewButton) viewButton.textContent = "只看星空";
		viewButton?.setAttribute("aria-pressed", "false");
	}
	viewButton.addEventListener("click", () => {
		const hidden = document.documentElement.classList.toggle("stars-only");
		viewButton.textContent = hidden ? "显示页面" : "隐藏页面";
		viewButton.setAttribute("aria-pressed", String(hidden));
	});
	document.addEventListener("pointerdown", (event) => {
		if (event.target instanceof Node && !menu.contains(event.target)) {
			menu.open = false;
			exitPreview();
		}
	});
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && menu.open) {
			menu.open = false;
			exitPreview();
			menu.querySelector("summary")?.focus();
		}
	});
	document.addEventListener("click", (event) => {
		if (event.target instanceof Element && event.target.closest("a[href]")) {
			menu.open = false;
			exitPreview();
		}
	});
	menu.addEventListener("toggle", () => {
		if (!menu.open) exitPreview();
	});
	window.addEventListener(
		"pointermove",
		(event) => {
			pointer.x = event.clientX;
			pointer.y = event.clientY;
			pointer.active =
				event.pointerType !== "touch" &&
				!(
					event.target instanceof Element &&
					event.target.closest("#site-settings")
				);
		},
		{ passive: true },
	);
	document.documentElement.addEventListener("pointerleave", () => {
		pointer.active = false;
	});
	window.addEventListener("blur", () => {
		pointer.active = false;
	});
	window.addEventListener("resize", resize, { passive: true });
	document.addEventListener("visibilitychange", () => {
		lastFrame = 0;
		if (document.hidden) {
			cancelAnimationFrame(frameId);
			frameId = 0;
		} else requestDraw();
	});
	reducedMotion.addEventListener("change", () => {
		paused = motionReduced() || settings.paused;
		lastFrame = 0;
		sync();
	});
	sync();
	resize();
}
