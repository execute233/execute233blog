import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Supply a Page from an isolated browser; no project Playwright dependency is needed.
export default async function testThemeSwitch(
	page,
	artifactDir = "tmp/vue-theme-switch/playwright",
) {
	const origin = new URL(page.url()).origin;
	const browser = page.context().browser();
	const report = { checks: [], errors: [], failures: [] };
	await mkdir(artifactDir, { recursive: true });

	async function ready(subject) {
		await subject.locator("#scheme-switch:not([disabled])").waitFor();
		await subject.waitForFunction(
			() =>
				document.querySelector("#appearance-settings")?.dataset.initialized ===
				"true",
		);
	}

	async function choose(subject, mode) {
		const button = subject.locator("#scheme-switch");
		for (
			let step = 0;
			step < 3 && (await button.getAttribute("data-mode")) !== mode;
			step++
		) {
			await button.click();
		}
		await subject.waitForFunction(
			(value) =>
				document.querySelector("#scheme-switch")?.dataset.mode === value,
			mode,
		);
	}

	async function state(subject) {
		return subject.evaluate(() => ({
			mode: document.documentElement.dataset.themeMode,
			buttonMode: document.querySelector("#scheme-switch").dataset.mode,
			dark: document.documentElement.classList.contains("dark"),
			background:
				document.documentElement.style.getPropertyValue("--blog-background"),
			codeTheme: document.documentElement.getAttribute("data-theme"),
		}));
	}

	async function navigate(subject, route) {
		await subject.locator(`a[href="${route}"]:visible`).first().click();
		await subject.waitForURL(`${origin}${route}`);
	}

	async function scenario(name, options, verify) {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
			reducedMotion: "reduce",
			...options.context,
		});
		try {
			await context.addInitScript(
				({ stored, blockRead, blockWrite, appearance }) => {
					if (!sessionStorage.getItem("theme-test-seeded")) {
						if (stored != null) localStorage.setItem("theme", stored);
						if (appearance)
							localStorage.setItem(
								"execute233.appearance.v2",
								JSON.stringify(appearance),
							);
						sessionStorage.setItem("theme-test-seeded", "1");
					}
					if (blockRead)
						Storage.prototype.getItem = () => {
							throw new Error("Test: storage read blocked");
						};
					if (blockWrite)
						Storage.prototype.setItem = () => {
							throw new Error("Test: storage write blocked");
						};
					const listeners = { system: new Set(), theme: new Set() };
					window.themeTestListeners = listeners;
					const originalAdd = EventTarget.prototype.addEventListener;
					const originalRemove = EventTarget.prototype.removeEventListener;
					const bucket = (target, type) => {
						if (target === document && type === "execute233:theme-change")
							return listeners.theme;
						if (
							target instanceof MediaQueryList &&
							type === "change" &&
							target.media === "(prefers-color-scheme: dark)"
						)
							return listeners.system;
					};
					EventTarget.prototype.addEventListener = function (
						type,
						listener,
						settings,
					) {
						bucket(this, type)?.add(listener);
						return originalAdd.call(this, type, listener, settings);
					};
					EventTarget.prototype.removeEventListener = function (
						type,
						listener,
						settings,
					) {
						bucket(this, type)?.delete(listener);
						return originalRemove.call(this, type, listener, settings);
					};
				},
				options,
			);
			const subject = await context.newPage();
			subject.setDefaultTimeout(15000);
			subject.on("pageerror", (error) =>
				report.errors.push({ name, error: error.message }),
			);
			subject.on("requestfailed", (request) => {
				if (
					request.url().startsWith(origin) &&
					!request.failure()?.errorText.includes("ABORTED")
				) {
					report.failures.push({
						name,
						url: request.url(),
						error: request.failure()?.errorText,
					});
				}
			});
			await subject.goto(origin);
			await ready(subject);
			await verify(subject);
			report.checks.push(name);
			console.log(`Passed: ${name}`);
		} finally {
			await context.close();
		}
	}

	try {
		for (const system of ["light", "dark"]) {
			for (const stored of [null, "invalid", "auto", "light", "dark"]) {
				await scenario(
					`mode-${system}-${stored ?? "empty"}`,
					{ stored, context: { colorScheme: system } },
					async (subject) => {
						const expected = ["light", "dark"].includes(stored)
							? stored
							: "auto";
						const initial = await state(subject);
						assert.equal(initial.mode, expected);
						assert.equal(initial.buttonMode, expected);
						assert.equal(
							initial.dark,
							expected === "dark" || (expected === "auto" && system === "dark"),
						);
						assert.equal(
							await subject.locator("#scheme-switch svg:visible").count(),
							1,
						);
						const opposite = system === "light" ? "dark" : "light";
						await subject.emulateMedia({ colorScheme: opposite });
						await subject.waitForFunction(
							({ mode, dark }) =>
								document.documentElement.dataset.themeMode === mode &&
								document.documentElement.classList.contains("dark") === dark,
							{
								mode: expected,
								dark:
									expected === "dark" ||
									(expected === "auto" && opposite === "dark"),
							},
						);
						assert.equal(
							await subject.locator("#scheme-switch").getAttribute("data-mode"),
							expected,
						);
						await choose(subject, "light");
						await subject.reload();
						await ready(subject);
						assert.equal((await state(subject)).mode, "light");
					},
				);
			}
		}

		for (const [blockRead, blockWrite] of [
			[true, false],
			[false, true],
			[true, true],
		]) {
			await scenario(
				`storage-${blockRead}-${blockWrite}`,
				{ stored: "dark", blockRead, blockWrite },
				async (subject) => {
					assert.equal(
						(await state(subject)).mode,
						blockRead ? "auto" : "dark",
					);
					await choose(subject, "dark");
					await navigate(subject, "/about/");
					assert.equal((await state(subject)).buttonMode, "dark");
					await subject.goBack();
					assert.equal((await state(subject)).mode, "dark");
					await subject.goForward();
					assert.equal((await state(subject)).mode, "dark");
					await choose(subject, "light");
					await subject.reload();
					await ready(subject);
					const expected = blockRead ? "auto" : blockWrite ? "dark" : "light";
					assert.equal((await state(subject)).mode, expected);
				},
			);
		}

		await scenario("navigation-listeners-unmount", {}, async (subject) => {
			await choose(subject, "dark");
			const counts = () =>
				subject.evaluate(() => ({
					system: window.themeTestListeners.system.size,
					theme: window.themeTestListeners.theme.size,
				}));
			const before = await counts();
			assert.equal(before.system, 1);
			const marker = await subject.evaluate(() => {
				window.themeTestDocument = Math.random();
				return window.themeTestDocument;
			});
			for (let step = 0; step < 10; step++) {
				await navigate(subject, step % 2 ? "/blog/" : "/about/");
				assert.equal(
					await subject.evaluate(() => window.themeTestDocument),
					marker,
					"Navigation used Swup",
				);
				assert.equal((await state(subject)).buttonMode, "dark");
			}
			assert.deepEqual(await counts(), before);
			await subject.locator("#scheme-switch").click();
			await subject.waitForFunction(
				() => document.querySelector("#scheme-switch").dataset.mode === "auto",
			);
			await subject.emulateMedia({ colorScheme: "dark" });
			await subject.waitForFunction(() =>
				document.documentElement.classList.contains("dark"),
			);
			await subject.evaluate(() =>
				document
					.querySelector("#scheme-switch")
					.closest("astro-island")
					.dispatchEvent(new Event("astro:unmount")),
			);
			const after = await counts();
			assert.equal(after.system, before.system - 1);
			assert.equal(after.theme, before.theme - 1);
		});

		for (const [name, width, height] of [
			["desktop", 1440, 900],
			["mobile", 390, 844],
			["767", 767, 900],
			["768", 768, 900],
			["800", 800, 900],
			["801", 801, 900],
		]) {
			await scenario(
				`viewport-${name}`,
				{ context: { viewport: { width, height } } },
				async (subject) => {
					const button = subject.locator("#scheme-switch");
					await button.focus();
					await subject.keyboard.press("Tab");
					await subject.keyboard.press("Shift+Tab");
					assert.equal(
						await button.evaluate(
							(element) => element === document.activeElement,
						),
						true,
					);
					await subject.keyboard.press("Enter");
					await subject.waitForFunction(
						() =>
							document.querySelector("#scheme-switch").dataset.mode === "light",
					);
					await subject.keyboard.press("Space");
					await subject.waitForFunction(
						() =>
							document.querySelector("#scheme-switch").dataset.mode === "dark",
					);
					const bounds = await button.boundingBox();
					assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
					assert.ok(await button.getAttribute("aria-label"));
					const overlap = await subject.evaluate(() => {
						const actions = document
							.querySelector(".rose-header-actions")
							.getBoundingClientRect();
						const music = document
							.querySelector("#music-island")
							.getBoundingClientRect();
						return (
							actions.left < music.right &&
							music.left < actions.right &&
							actions.top < music.bottom &&
							music.top < actions.bottom
						);
					});
					assert.equal(overlap, false, "Music and header actions overlap");
					for (const mode of ["light", "dark"]) {
						await choose(subject, mode);
						await subject.evaluate(() => document.fonts.ready);
						await subject.evaluate(() =>
							Promise.all(
								document.documentElement
									.getAnimations({ subtree: true })
									.filter((animation) =>
										Number.isFinite(animation.effect?.getTiming().iterations),
									)
									.map((animation) => animation.finished.catch(() => {})),
							),
						);
						if (["desktop", "mobile"].includes(name))
							await subject.screenshot({
								path: join(artifactDir, `after-${name}-${mode}.png`),
							});
					}
					if (name === "mobile") {
						await subject.locator("#nav-menu-switch").click();
						await navigate(subject, "/blog/");
						assert.equal((await state(subject)).mode, "dark");
					}
				},
			);
		}

		await scenario(
			"background-music-and-reading-compatibility",
			{
				appearance: {
					backgrounds: { light: "#ffeeddff", dark: "#112233ff" },
					hue: 70,
				},
			},
			async (subject) => {
				await choose(subject, "light");
				assert.equal((await state(subject)).background, "#ffeeddff");
				await choose(subject, "dark");
				assert.equal((await state(subject)).background, "#112233ff");
				assert.equal(
					await subject
						.locator("html")
						.evaluate((element) => element.style.getPropertyValue("--hue")),
					"70",
				);
				const sound = await subject.evaluate(() => {
					const audio = document.querySelector("#music-island audio");
					window.themeTestAudio = audio;
					return {
						src: audio.src,
						volume: audio.volume,
						paused: audio.paused,
						time: audio.currentTime,
					};
				});
				const otherSettings = await subject.evaluate(() => ({
					background: localStorage.getItem("execute233.background.v1"),
					cursor: localStorage.getItem("execute233.cursor.v1"),
				}));
				await choose(subject, "light");
				assert.deepEqual(
					await subject.evaluate(() => {
						const audio = document.querySelector("#music-island audio");
						return {
							src: audio.src,
							volume: audio.volume,
							paused: audio.paused,
							time: audio.currentTime,
						};
					}),
					sound,
				);
				assert.equal(
					await subject.evaluate(
						() =>
							document.querySelector("#music-island audio") ===
							window.themeTestAudio,
					),
					true,
				);
				assert.deepEqual(
					await subject.evaluate(() => ({
						background: localStorage.getItem("execute233.background.v1"),
						cursor: localStorage.getItem("execute233.cursor.v1"),
					})),
					otherSettings,
				);
				await subject.reload();
				await ready(subject);
				assert.equal((await state(subject)).background, "#ffeeddff");
				for (const route of [
					"/",
					"/blog/",
					"/learning/",
					"/archive/",
					"/about/",
					"/tools/",
					"/posts/expressive-code/",
				]) {
					await subject.goto(origin + route);
					await ready(subject);
					assert.equal((await state(subject)).mode, "light");
					assert.equal((await state(subject)).codeTheme, "github-dark");
					assert.equal(await subject.locator("#toc").count(), 1);
				}
				await subject.goto(`${origin}/archive/?tag=Example`);
				await ready(subject);
				const archiveLinks = subject.locator('main a[href^="/posts/"]');
				await archiveLinks.first().waitFor();
				assert.ok((await archiveLinks.count()) > 0);
				await subject.goto(origin);
				await ready(subject);
				await subject.locator("#search-switch").click();
				await subject.locator("#search-panel input").fill("Markdown");
				await subject
					.locator('#search-panel a[href^="/posts/"]')
					.first()
					.waitFor();
				assert.ok(
					(await subject.locator('#search-panel a[href^="/posts/"]').count()) >
						0,
				);
			},
		);

		await scenario(
			"playing-music-survives-theme-and-navigation",
			{},
			async (subject) => {
				await subject.locator("#music-island").hover();
				await subject.locator("#music-play").click();
				await subject.waitForFunction(
					() =>
						!document.querySelector("#music-audio").paused &&
						document.querySelector("#music-audio").currentTime > 0,
				);
				const before = await subject.evaluate(() => {
					const audio = document.querySelector("#music-audio");
					window.playingThemeAudio = audio;
					return {
						src: audio.src,
						volume: audio.volume,
						time: audio.currentTime,
					};
				});
				await choose(subject, "dark");
				await navigate(subject, "/about/");
				assert.equal(
					await subject.evaluate(
						() =>
							document.querySelector("#music-audio") ===
							window.playingThemeAudio,
					),
					true,
				);
				const after = await subject.evaluate(() => {
					const audio = document.querySelector("#music-audio");
					return {
						src: audio.src,
						volume: audio.volume,
						time: audio.currentTime,
						paused: audio.paused,
					};
				});
				assert.equal(after.src, before.src);
				assert.equal(after.volume, before.volume);
				assert.equal(after.paused, false);
				assert.ok(after.time >= before.time);
			},
		);

		await scenario(
			"paused-background",
			{ context: { reducedMotion: "no-preference" } },
			async (subject) => {
				await subject.locator("#site-settings > summary").click();
				await subject.locator("#background-settings > summary").click();
				await subject.locator("#background-pause").click();
				const saved = await subject.evaluate(() =>
					localStorage.getItem("execute233.background.v1"),
				);
				assert.equal(JSON.parse(saved).paused, true);
				await choose(subject, "dark");
				assert.equal(
					await subject.evaluate(() =>
						localStorage.getItem("execute233.background.v1"),
					),
					saved,
				);
				assert.equal(
					await subject
						.locator("#background-pause")
						.getAttribute("aria-pressed"),
					"true",
				);
			},
		);

		await scenario("pre-hydration", { stored: "dark" }, async (subject) => {
			let release;
			const hydrationBlocked = new Promise((resolve) => {
				release = resolve;
			});
			await subject.route("**/*LightDarkSwitch*.js", async (route) => {
				await hydrationBlocked;
				await route.continue();
			});
			await subject.reload({ waitUntil: "domcontentloaded" });
			await subject.locator("#scheme-switch[disabled]").waitFor();
			assert.equal((await state(subject)).mode, "dark");
			assert.equal((await state(subject)).dark, true);
			assert.equal(
				await subject.locator("#scheme-switch svg:visible").count(),
				1,
			);
			release();
			await ready(subject);
			assert.equal((await state(subject)).buttonMode, "dark");
		});
		assert.deepEqual(report.errors, []);
		assert.deepEqual(report.failures, []);
		return report;
	} finally {
		await writeFile(
			join(artifactDir, "theme-switch-report.json"),
			JSON.stringify(report, null, 2),
		);
	}
}
