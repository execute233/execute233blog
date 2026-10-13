import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Isolate each Pagefind fault from real search; caller supplies a launched browser.
export default async function testSearchBoundaries(
	browser,
	origin,
	artifactDir = "tmp/vue-search/playwright",
) {
	const report = { checks: [], errors: [], consoleErrors: [] };
	await mkdir(artifactDir, { recursive: true });
	async function scenario(name, verify, setup) {
		const context = await browser.newContext({ reducedMotion: "reduce" });
		const page = await context.newPage();
		page.setDefaultTimeout(15000);
		page.on("pageerror", (error) =>
			report.errors.push(`${name}: ${error.message}`),
		);
		page.on("console", (message) => {
			if (message.type() === "error")
				report.consoleErrors.push({ scenario: name, text: message.text() });
		});
		try {
			await context.addInitScript(() => {
				window.__listeners = new Map();
				const add = EventTarget.prototype.addEventListener;
				const remove = EventTarget.prototype.removeEventListener;
				EventTarget.prototype.addEventListener = function (
					type,
					callback,
					options,
				) {
					if (
						this === document &&
						["pagefindready", "pagefindloaderror", "keydown"].includes(type)
					) {
						if (!window.__listeners.has(type))
							window.__listeners.set(type, new Set());
						window.__listeners.get(type).add(callback);
					}
					return add.call(this, type, callback, options);
				};
				EventTarget.prototype.removeEventListener = function (
					type,
					callback,
					options,
				) {
					if (this === document) window.__listeners.get(type)?.delete(callback);
					return remove.call(this, type, callback, options);
				};
			});
			await setup?.(page);
			await page.goto(origin, { waitUntil: "domcontentloaded" });
			await page.waitForFunction(() =>
				document.querySelector(
					'astro-island[component-url*="Search"]:not([ssr])',
				),
			);
			await verify(page);
			report.checks.push(name);
			console.log(`Passed: ${name}`);
		} finally {
			await context.close();
		}
	}
	async function open(page) {
		await page.locator("#search-switch").click();
		await page.waitForFunction(
			() => !document.querySelector("#search-panel").inert,
		);
	}
	async function mock(page) {
		await page.waitForFunction(() => window.pagefind);
		await page.evaluate(() => {
			window.__pending = [];
			window.pagefind = {
				search: (query) =>
					new Promise((resolve, reject) =>
						window.__pending.push({ query, resolve, reject }),
					),
			};
		});
		await open(page);
	}
	async function query(page, keyword, count) {
		await page.locator("#search-panel input").fill(keyword);
		await page.waitForFunction(
			(count) => window.__pending.length === count,
			count,
		);
	}
	async function respond(
		page,
		index,
		title,
		{ deferred = false, reject = false } = {},
	) {
		await page.evaluate(
			({ index, title, deferred, reject }) => {
				const request = window.__pending[index];
				if (reject) {
					request.reject(new Error("expected search failure"));
					return;
				}
				request.resolve({
					results: [
						{
							data: () =>
								deferred
									? new Promise((resolve, reject) => {
											window.__data = { resolve, reject };
										})
									: Promise.resolve({
											url: `/posts/${title}/`,
											meta: { title },
											excerpt:
												"&lt;img src=x onerror=alert(1)&gt; <mark>safe</mark>",
										}),
						},
					],
				});
			},
			{ index, title, deferred, reject },
		);
	}
	async function title(page, expected) {
		await page.waitForFunction(
			(expected) =>
				document.querySelector("#search-panel a > div")?.textContent.trim() ===
					expected &&
				document.querySelector("#search-panel").getAttribute("aria-busy") ===
					"false",
			expected,
		);
	}
	try {
		await scenario("desktop-input-query-and-clear", async (page) => {
			await mock(page);
			await page.addStyleTag({
				content: "#search-bar { display: flex !important; }",
			});
			await page.locator("#search-bar input").fill("desktop");
			await page.waitForFunction(() => window.__pending.length === 1);
			await respond(page, 0, "desktop");
			await title(page, "desktop");
			await page.locator("#search-bar input").fill("");
			await page.waitForFunction(
				() =>
					document.querySelector("#search-panel").inert &&
					!document.querySelector("#search-panel a") &&
					document.querySelector("#search-panel").getAttribute("aria-busy") ===
						"false",
			);
		});
		await scenario("latest-search-response-wins", async (page) => {
			await mock(page);
			await query(page, "older", 1);
			await query(page, "newer", 2);
			await respond(page, 1, "newer");
			await title(page, "newer");
			await respond(page, 0, "older");
			await page.evaluate(() => new Promise(requestAnimationFrame));
			await title(page, "newer");
		});
		await scenario("latest-result-data-wins", async (page) => {
			await mock(page);
			await query(page, "older", 1);
			await respond(page, 0, "older", { deferred: true });
			await page.waitForFunction(() => window.__data);
			await query(page, "newer", 2);
			await respond(page, 1, "newer");
			await title(page, "newer");
			await page.evaluate(() =>
				window.__data.resolve({
					url: "/posts/older/",
					meta: { title: "older" },
					excerpt: "older",
				}),
			);
			await page.evaluate(() => new Promise(requestAnimationFrame));
			await title(page, "newer");
		});
		await scenario("clear-invalidates-pending-search", async (page) => {
			await mock(page);
			await query(page, "pending", 1);
			await page.locator("#search-panel input").fill("");
			await respond(page, 0, "pending");
			await page.waitForFunction(
				() =>
					!document.querySelector("#search-panel a") &&
					document.querySelector("#search-panel").getAttribute("aria-busy") ===
						"false",
			);
		});
		await scenario("close-invalidates-and-reopen-retries", async (page) => {
			await mock(page);
			await query(page, "pending", 1);
			await page.locator("#search-switch").click();
			await page.waitForFunction(
				() => document.querySelector("#search-panel").inert,
			);
			await respond(page, 0, "pending");
			assert.equal(await page.locator("#search-panel a").count(), 0);
			await open(page);
			await page.waitForFunction(() => window.__pending.length === 2);
			await respond(page, 1, "pending");
			await title(page, "pending");
		});
		await scenario("search-and-result-data-errors", async (page) => {
			await mock(page);
			await query(page, "reject-search", 1);
			await respond(page, 0, "", { reject: true });
			await page.waitForFunction(
				() =>
					document.querySelector("#search-panel").getAttribute("aria-busy") ===
					"false",
			);
			assert.equal(await page.locator("#search-panel a").count(), 0);
			await query(page, "reject-data", 2);
			await respond(page, 1, "", { deferred: true });
			await page.waitForFunction(() => window.__data);
			await page.evaluate(() =>
				window.__data.reject(new Error("expected data failure")),
			);
			await page.waitForFunction(
				() =>
					document.querySelector("#search-panel").getAttribute("aria-busy") ===
					"false",
			);
			assert.equal(await page.locator("#search-panel a").count(), 0);
		});
		await scenario("escaped-title-and-highlight-excerpt", async (page) => {
			await mock(page);
			await query(page, "<img src=x>", 1);
			await respond(page, 0, "<img src=x onerror=alert(1)>");
			await title(page, "<img src=x onerror=alert(1)>");
			assert.equal(await page.locator("#search-panel img").count(), 0);
			assert.equal(
				await page.locator("#search-panel mark").textContent(),
				"safe",
			);
		});
		await scenario("navigation-listeners-and-unmount", async (page) => {
			await mock(page);
			const counts = () =>
				page.evaluate(() =>
					Object.fromEntries(
						[...window.__listeners].map(([name, values]) => [
							name,
							values.size,
						]),
					),
				);
			const before = await counts();
			await page.evaluate(() => {
				window.__sameDocument = true;
				window.__sameSearch = document.querySelector(
					'astro-island[component-url*="Search"]',
				);
			});
			for (let index = 0; index < 10; index++) {
				const route = index % 2 ? "/about/" : "/archive/?tag=Example";
				await page.evaluate((route) => {
					const link = document.createElement("a");
					link.href = route;
					document.body.append(link);
					link.click();
					link.remove();
				}, route);
				await page.waitForURL(`${origin}${route}`);
				assert.equal(
					await page.evaluate(
						() =>
							window.__sameDocument &&
							window.__sameSearch ===
								document.querySelector('astro-island[component-url*="Search"]'),
					),
					true,
				);
				assert.deepEqual(await counts(), before);
			}
			await page.evaluate(() =>
				document
					.querySelector('astro-island[component-url*="Search"]')
					.dispatchEvent(new CustomEvent("astro:unmount")),
			);
			const after = await counts();
			assert.equal(after.keydown, before.keydown - 1);
			assert.equal(after.pagefindready ?? 0, 0);
			assert.equal(after.pagefindloaderror ?? 0, 0);
			assert.equal(await page.locator("#search-panel").count(), 0);
		});
		await scenario("unmount-invalidates-pending-search", async (page) => {
			await mock(page);
			await query(page, "pending", 1);
			await page.evaluate(() =>
				document
					.querySelector('astro-island[component-url*="Search"]')
					.dispatchEvent(new CustomEvent("astro:unmount")),
			);
			await respond(page, 0, "pending");
			assert.equal(await page.locator("#search-panel").count(), 0);
		});
		let releasePagefind;
		const pagefindGate = new Promise((resolve) => {
			releasePagefind = resolve;
		});
		await scenario(
			"late-pagefind-load-replays-latest-input",
			async (page) => {
				await open(page);
				await page.locator("#search-panel input").fill("Markdown");
				await page.waitForFunction(
					() =>
						document.querySelector("#search-panel input").value === "Markdown",
				);
				releasePagefind();
				await page
					.locator('#search-panel a[href^="/posts/"]')
					.first()
					.waitFor();
			},
			async (page) => {
				await page.route("**/pagefind/pagefind.js", async (route) => {
					await pagefindGate;
					await route.continue();
				});
			},
		);
		await scenario(
			"pagefind-load-failure-stays-empty",
			async (page) => {
				await page.waitForFunction(() => window.pagefind);
				await open(page);
				await page.locator("#search-panel input").fill("Markdown");
				await page.waitForFunction(
					() =>
						document
							.querySelector("#search-panel")
							.getAttribute("aria-busy") === "false",
				);
				assert.equal(await page.locator("#search-panel a").count(), 0);
			},
			async (page) => {
				await page.route("**/pagefind/pagefind.js", (route) =>
					route.fulfill({ status: 404, body: "not found" }),
				);
			},
		);
		assert.deepEqual(report.errors, []);
		assert.deepEqual(
			report.consoleErrors.filter(
				(entry) =>
					![
						"search-and-result-data-errors",
						"pagefind-load-failure-stays-empty",
					].includes(entry.scenario),
			),
			[],
		);
		return report;
	} catch (error) {
		report.assertion = error.message;
		throw error;
	} finally {
		await writeFile(
			join(artifactDir, "boundaries-report.json"),
			JSON.stringify(report, null, 2),
		);
	}
}
