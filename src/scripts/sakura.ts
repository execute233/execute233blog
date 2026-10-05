// 樱花形态与缓慢漂浮参考 Bad0RANG3 的 atmosphere.ts：
// https://github.com/Bad0RANG3/Bad0RANG3.github.io/blob/main/src/scripts/atmosphere.ts
// 此实现使用本项目的主题色、暂停状态和以秒为单位的动画步长。

type Side = "left" | "right";

type Blossom = {
	side: Side;
	x: number;
	y: number;
	radius: number;
	depth: number;
	speed: number;
	sway: number;
	phase: number;
	alpha: number;
	angle: number;
	spin: number;
	tone: number;
};

type Petal = {
	side: Side;
	x: number;
	y: number;
	radius: number;
	speed: number;
	phase: number;
	alpha: number;
};

const FRAME_INTERVAL = 1000 / 30;
const SPRITE_RADIUS = 64;

function readHue(): number {
	const hue = Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue("--hue"),
	);
	return Number.isFinite(hue) ? ((hue % 360) + 360) % 360 : 0;
}

function createBlossomSprite(hue: number): HTMLCanvasElement {
	const sprite = document.createElement("canvas");
	sprite.width = sprite.height = SPRITE_RADIUS * 2;
	const context = sprite.getContext("2d");
	if (!context) return sprite;
	context.translate(SPRITE_RADIUS, SPRITE_RADIUS);
	context.strokeStyle = `hsl(${hue} 58% 74%)`;
	context.lineWidth = 1.15;
	for (let petal = 0; petal < 5; petal++) {
		context.save();
		context.rotate((petal * Math.PI * 2) / 5);
		context.beginPath();
		context.ellipse(
			0,
			-SPRITE_RADIUS * 0.37,
			SPRITE_RADIUS * 0.25,
			SPRITE_RADIUS * 0.46,
			0,
			0,
			Math.PI * 2,
		);
		context.fillStyle = `hsl(${hue} 66% ${petal % 2 === 0 ? 76 : 87}%)`;
		context.fill();
		context.stroke();
		context.restore();
	}
	context.beginPath();
	context.arc(0, 0, SPRITE_RADIUS * 0.13, 0, Math.PI * 2);
	context.fillStyle = `hsl(${hue + 65} 70% 88%)`;
	context.fill();
	return sprite;
}

export function initSakura(
	initiallyPaused: boolean,
): { setPaused: (paused: boolean) => void } | undefined {
	const element = document.querySelector<HTMLCanvasElement>("#sakura-canvas");
	if (!element || element.dataset.initialized === "true") return;
	const canvas = element;
	const contentElement = document.querySelector<HTMLElement>("#main-grid");
	if (!contentElement) return;
	const content = contentElement;
	const drawingContext = canvas.getContext("2d");
	if (!drawingContext) return;
	const context: CanvasRenderingContext2D = drawingContext;
	canvas.dataset.initialized = "true";
	const mobile = matchMedia("(max-width: 767px)");
	let paused = initiallyPaused;
	let started = false;
	let width = 0;
	let height = 0;
	let hue = readHue();
	let sprites = [0, 20, -25].map((offset) => createBlossomSprite(hue + offset));
	let blossoms: Blossom[] = [];
	let petals: Petal[] = [];
	let frame = 0;
	let resizeFrame = 0;
	let lastFrame = 0;
	let time = 0;
	let contentLeft = 0;
	let contentRight = 0;

	function measureContent(): boolean {
		const bounds = content.getBoundingClientRect();
		const left = Math.max(0, Math.min(width, bounds.left));
		const right = Math.max(left, Math.min(width, bounds.right));
		if (left === contentLeft && right === contentRight) return false;
		contentLeft = left;
		contentRight = right;
		canvas.style.setProperty("--sakura-content-left", `${left}px`);
		canvas.style.setProperty("--sakura-content-right", `${right}px`);
		canvas.style.setProperty(
			"--sakura-fade-left",
			`${Math.max(0, left - Math.min(96, left * 0.75))}px`,
		);
		canvas.style.setProperty(
			"--sakura-fade-right",
			`${Math.min(width, right + Math.min(96, (width - right) * 0.75))}px`,
		);
		return true;
	}

	function randomSideX(side: Side): number {
		return side === "left"
			? Math.random() * contentLeft
			: contentRight + Math.random() * (width - contentRight);
	}

	function seed(): void {
		const sideWidth = contentLeft + width - contentRight;
		const count = Math.min(
			36,
			Math.max(10, Math.round((sideWidth * height) / 36000)),
		);
		blossoms = Array.from({ length: count }, (_, index) => {
			const side: Side = index % 2 === 0 ? "left" : "right";
			return {
				side,
				x: randomSideX(side),
				y: Math.random() * height,
				radius: 16 + Math.random() * 38,
				depth: 0.38 + Math.random() * 0.62,
				speed: 5.4 + Math.random() * 10.2,
				sway: 0.42 + Math.random() * 0.58,
				phase: Math.random() * Math.PI * 2,
				alpha: 0.08 + Math.random() * 0.15,
				angle: Math.random() * Math.PI * 2,
				spin: (Math.random() - 0.5) * 0.078,
				tone: index % sprites.length,
			};
		});
		petals = Array.from(
			{ length: Math.min(18, Math.max(6, Math.round(sideWidth / 100))) },
			(_, index) => {
				const side: Side = index % 2 === 0 ? "left" : "right";
				return {
					side,
					x: randomSideX(side),
					y: Math.random() * height,
					radius: 1 + Math.random() * 2.8,
					speed: 5.4 + Math.random() * 10.8,
					phase: Math.random() * Math.PI * 2,
					alpha: 0.08 + Math.random() * 0.14,
				};
			},
		);
	}

	function resize(): void {
		const previousWidth = width;
		width = window.innerWidth;
		height = window.innerHeight;
		cancelAnimationFrame(frame);
		frame = 0;
		lastFrame = 0;
		if (mobile.matches) {
			canvas.width = canvas.height = 0;
			return;
		}
		const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
		canvas.width = Math.round(width * ratio);
		canvas.height = Math.round(height * ratio);
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		const contentChanged = measureContent();
		if (!blossoms.length || previousWidth !== width || contentChanged) seed();
	}

	function draw(dt: number): void {
		context.clearRect(0, 0, width, height);
		for (const blossom of blossoms) {
			blossom.y += blossom.speed * dt;
			blossom.angle += blossom.spin * dt;
			if (dt > 0 && blossom.y - blossom.radius > height + 50) {
				blossom.x = randomSideX(blossom.side);
				blossom.y = -blossom.radius - Math.random() * height * 0.18;
			}
			context.save();
			context.translate(
				blossom.x +
					Math.sin(time * blossom.sway + blossom.phase) * 34 * blossom.depth,
				blossom.y +
					Math.cos(time * blossom.sway * 0.72 + blossom.phase) *
						20 *
						blossom.depth,
			);
			context.rotate(blossom.angle);
			context.globalAlpha = blossom.alpha;
			context.drawImage(
				sprites[blossom.tone],
				-blossom.radius,
				-blossom.radius,
				blossom.radius * 2,
				blossom.radius * 2,
			);
			context.restore();
		}
		context.fillStyle = `hsl(${hue} 72% 85%)`;
		for (const petal of petals) {
			petal.y += petal.speed * dt;
			if (dt > 0 && petal.y > height + 12) {
				petal.x = randomSideX(petal.side);
				petal.y = -12;
			}
			context.save();
			context.translate(
				petal.x + Math.sin(time * 0.45 + petal.phase) * 18,
				petal.y,
			);
			context.rotate(petal.phase + time * 0.16);
			context.globalAlpha = petal.alpha;
			context.beginPath();
			context.ellipse(
				0,
				0,
				petal.radius * 1.8,
				petal.radius,
				0,
				0,
				Math.PI * 2,
			);
			context.fill();
			context.restore();
		}
	}

	function requestDraw(): void {
		if (
			started &&
			!frame &&
			!mobile.matches &&
			!document.hidden &&
			canvas.isConnected
		)
			frame = requestAnimationFrame(render);
	}

	function render(now: number): void {
		frame = 0;
		if (mobile.matches || document.hidden || !canvas.isConnected) return;
		const elapsed = now - lastFrame;
		if (!paused && lastFrame && elapsed < FRAME_INTERVAL) {
			requestDraw();
			return;
		}
		const dt = paused || !lastFrame ? 0 : Math.min(elapsed / 1000, 0.1);
		lastFrame = now;
		time += dt;
		draw(dt);
		if (!paused) requestDraw();
	}

	function setPaused(next: boolean): void {
		if (paused === next) return;
		paused = next;
		lastFrame = 0;
		cancelAnimationFrame(frame);
		frame = 0;
		requestDraw();
	}

	new MutationObserver(() => {
		const nextHue = readHue();
		if (nextHue === hue) return;
		hue = nextHue;
		sprites = [0, 20, -25].map((offset) => createBlossomSprite(hue + offset));
		requestDraw();
	}).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["style"],
	});
	new ResizeObserver(() => {
		if (!started || mobile.matches || !measureContent()) return;
		seed();
		lastFrame = 0;
		requestDraw();
	}).observe(content);
	window.addEventListener(
		"resize",
		() => {
			if (!started || resizeFrame) return;
			resizeFrame = requestAnimationFrame(() => {
				resizeFrame = 0;
				resize();
				requestDraw();
			});
		},
		{ passive: true },
	);
	document.addEventListener("visibilitychange", () => {
		cancelAnimationFrame(frame);
		frame = 0;
		lastFrame = 0;
		requestDraw();
	});
	const start = () => {
		started = true;
		resize();
		requestDraw();
	};
	const scheduleStart = () => {
		if (typeof window.requestIdleCallback === "function")
			window.requestIdleCallback(start, { timeout: 1500 });
		else setTimeout(start, 200);
	};
	if (paused || mobile.matches) start();
	else if (document.readyState === "complete") scheduleStart();
	else window.addEventListener("load", scheduleStart, { once: true });
	return { setPaused };
}
