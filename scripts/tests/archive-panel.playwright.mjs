import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const islandSelector = 'astro-island[component-url*="ArchivePanel"]';
const fixtures = [
	["a", "2025-06-15T12:00:00Z", ["One", "共享"], "Alpha", "blog"],
	["b", "2025-06-15T12:00:00Z", ["Two"], "Beta", "learning"],
	["c", "2023-12-31T23:30:00Z", ["共享", ""], "", "blog"],
	["d", "2023-02-03T12:00:00Z", [], null, "blog"],
	["e", "2023-01-02T12:00:00Z", ["one"], undefined, "learning"],
	["f", "2024-03-04T12:00:00Z", ["One", " 中文 "], " Alpha ", "blog"],
].map(([slug, published, tags, category, section]) => ({
	slug: `archive-fixture/${slug}`,
	data: {
		title: `${slug.toUpperCase()} 归档边界测试：用于验证长标题截断与可访问名称`,
		published: new Date(published),
		tags,
		category,
		section,
	},
}));

// Expected sets are explicit, independent of the component's filtering code.
const matrix = [
	["", "abcfde"],
	["?tag=One", "af"],
	["?tag=One&tag=Two", "abf"],
	["?category=Alpha", "a"],
	["?category=Alpha&category=Beta", "ab"],
	["?tag=One&category=Alpha", "a"],
	["?uncategorized=true", "cde"],
	["?uncategorized=false", "cde"],
	["?uncategorized=0", "cde"],
	["?uncategorized=", "abcfde"],
	["?uncategorized=&uncategorized=true", "abcfde"],
	["?uncategorized=true&uncategorized=", "cde"],
	["?category=Alpha&uncategorized=true", ""],
	["?tag=%E5%85%B1%E4%BA%AB&uncategorized=1", "c"],
	["?tag=missing", ""],
	["?category=missing", ""],
	["?tag=", "c"],
	["?category=", ""],
	["?tag=One&tag=One", "af"],
	["?category=Beta&category=Beta", "b"],
	["?tag=One&tag=&category=Alpha&category=", "a"],
	["?tag=one", "e"],
	["?tag=ONE", ""],
	["?tag=One%20", ""],
	["?category=%20Alpha%20", "f"],
	["?tag=%20%E4%B8%AD%E6%96%87%20", "f"],
	["?tag=%E4%B8%AD%E6%96%87", ""],
	["?tag=One&tag=Two&category=Beta&category=%20Alpha%20", "bf"],
	["?unrelated=value#ignored", "abcfde"],
];

async function ready(page) {
	await page.waitForFunction((selector) => {
		const island = document.querySelector(selector);
		return island && !island.hasAttribute("ssr") && island.firstElementChild;
	}, islandSelector);
	await page.evaluate(
		() =>
			new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(resolve)),
			),
	);
}

async function snapshot(page) {
	return page.locator(islandSelector).evaluate((island) =>
		Array.from(island.firstElementChild.children, (group) => ({
			year: Number(group.firstElementChild.children[0].textContent.trim()),
			count: group.firstElementChild.children[2].textContent
				.trim()
				.replace(/\s+/g, " "),
			posts: Array.from(group.querySelectorAll("a"), (link) => ({
				href: link.getAttribute("href"),
				label: link.getAttribute("aria-label"),
				date: link.firstElementChild.children[0].textContent.trim(),
				title: link.firstElementChild.children[2].textContent.trim(),
				tags: link.firstElementChild.children[3].textContent.trim(),
			})),
		})),
	);
}

// Supply an isolated Page on a built preview. baselinePath compares full Svelte/Vue output.
export default async function testArchivePanel(
	page,
	{
		artifactDir = "tmp/vue-archive-panel/playwright",
		phase = "final",
		baselinePath,
		suite = "all",
	} = {},
) {
	await mkdir(artifactDir, { recursive: true });
	const origin = new URL(page.url()).origin;
	const report = { phase, checks: [], snapshots: {}, errors: [], failures: [] };
	const onError = (error) => report.errors.push(error.message);
	const onConsole = (message) => {
		if (message.type() === "error") report.errors.push(message.text());
	};
	const onFailure = (request) => {
		if (
			request.url().startsWith(origin) &&
			request.failure()?.errorText !== "net::ERR_ABORTED"
		)
			report.failures.push(`${request.url()}: ${request.failure()?.errorText}`);
	};
	page.on("pageerror", onError);
	page.on("console", onConsole);
	page.on("requestfailed", onFailure);
	const baseline = baselinePath
		? JSON.parse(await readFile(baselinePath, "utf8"))
		: null;
	const helper = await page.context().newPage();
	const require = createRequire(import.meta.url);
	const astroRoot = dirname(require.resolve("astro/package.json"));
	const { serializeProps } = await import(
		pathToFileURL(join(astroRoot, "dist/runtime/server/serialize.js"))
	);
	let injectedPosts;
	const intercept = async (route) => {
		if (!injectedPosts) return route.continue();
		const response = await route.fetch();
		const html = await helper.evaluate(
			({ html, props, selector }) => {
				const document = new DOMParser().parseFromString(html, "text/html");
				const islands = document.querySelectorAll(selector);
				if (islands.length !== 1)
					throw new Error(
						`Expected one archive island, received ${islands.length}`,
					);
				islands[0].setAttribute("props", props);
				return `<!DOCTYPE html>${document.documentElement.outerHTML}`;
			},
			{
				html: await response.text(),
				props: serializeProps({ sortedPosts: injectedPosts }),
				selector: islandSelector,
			},
		);
		await route.fulfill({ response, body: html });
	};
	await page.route("**/archive/**", intercept);
	try {
		assert.ok(["all", "navigation"].includes(suite), "known suite");
		page.setDefaultTimeout(15000);
		await page.emulateMedia({ reducedMotion: "reduce" });
		// Both actual content and isolated props are tested on direct loads.
		if (suite === "all") {
			for (const kind of ["real", "fixture"]) {
				injectedPosts = kind === "fixture" ? fixtures : undefined;
				for (const [query, slugs] of matrix) {
					await page.goto(`${origin}/archive/${query}`, {
						waitUntil: "domcontentloaded",
					});
					await ready(page);
					const actual = await snapshot(page);
					const key = `${kind}:${query}`;
					console.log(`${phase} ${key}`);
					report.snapshots[key] = actual;
					if (baseline) assert.deepEqual(actual, baseline.snapshots[key], key);
					if (kind === "fixture") {
						assert.deepEqual(
							actual.flatMap((group) => group.posts.map((post) => post.href)),
							[...slugs].map((slug) => `/posts/archive-fixture/${slug}/`),
							key,
						);
						for (const group of actual) {
							assert.match(
								group.count,
								new RegExp(`^${group.posts.length}(?: |$)`),
								key,
							);
							for (const post of group.posts) {
								const fixture = fixtures.find((item) =>
									post.href.endsWith(`/${item.slug}/`),
								);
								assert.equal(post.title, fixture.data.title);
								assert.equal(post.label, fixture.data.title);
								assert.equal(
									post.tags,
									fixture.data.tags
										.map((tag) => `#${tag}`)
										.join(" ")
										.trim(),
								);
								const dates = {
									a: [2025, "06-15"],
									b: [2025, "06-15"],
									c: [2024, "01-01"],
									d: [2023, "02-03"],
									e: [2023, "01-02"],
									f: [2024, "03-04"],
								};
								const [year, date] = dates[fixture.slug.split("/").at(-1)];
								assert.equal(group.year, year);
								assert.equal(post.date, date);
							}
						}
					}
					report.checks.push(key);
				}
			}
			injectedPosts = [];
			await page.goto(`${origin}/archive/`, { waitUntil: "domcontentloaded" });
			await ready(page);
			assert.deepEqual(await snapshot(page), []);
			report.checks.push("empty-input");
		}
		injectedPosts = undefined;
		await page.goto(`${origin}/archive/`, { waitUntil: "domcontentloaded" });
		await ready(page);
		const original = await snapshot(page);
		assert.equal(
			original.reduce((count, group) => count + group.posts.length, 0),
			7,
			"production content count",
		);
		assert.ok(
			original
				.flatMap((group) => group.posts)
				.some((post) => /学习/.test(post.title)),
			"learning posts included",
		);
		assert.ok(
			original
				.flatMap((group) => group.posts)
				.every((post) => !/draft/i.test(post.title)),
			"draft excluded",
		);
		report.checks.push("production-content");
		await page.locator("#scheme-switch:not([disabled])").waitFor();
		await page.waitForFunction(() => window.swup);
		await page.evaluate(() => {
			window.__archiveDocumentMarker = "unchanged";
			window.__archiveAudio = document.querySelector("audio");
		});
		async function visit(route) {
			if (page.url() === `${origin}${route}`) return ready(page);
			const previousIsland = await page.$(islandSelector);
			await page.evaluate((href) => {
				const link = document.createElement("a");
				link.href = href;
				link.textContent = "归档导航测试";
				document.body.append(link);
				link.click();
				link.remove();
			}, route);
			await page.waitForURL(`${origin}${route}`);
			if (route.startsWith("/archive/")) {
				if (previousIsland) {
					await page.waitForFunction(
						(previous) => !previous.isConnected,
						previousIsland,
					);
				}
				await ready(page);
			} else
				await page.waitForFunction(
					() =>
						!document.querySelector(
							'main astro-island[component-url*="ArchivePanel"]',
						),
				);
			assert.equal(
				await page.evaluate(() => window.__archiveDocumentMarker),
				"unchanged",
				"Swup retained document",
			);
			assert.equal(await page.locator("#toc").count(), 1);
			await previousIsland?.dispose();
		}
		await visit("/archive/?tag=Example");
		// Actual links exercise the delegated Swup handlers as well as synthetic query links.
		const tagged = await snapshot(page);
		await visit("/blog/");
		const actualCategoryLink = page
			.locator('a[href="/archive/?category=Examples"]:visible')
			.first();
		await actualCategoryLink.click();
		await page.waitForURL(`${origin}/archive/?category=Examples`);
		await ready(page);
		const categorized = await snapshot(page);
		await visit("/posts/markdown-extended/");
		await page
			.locator('a[href="/archive/?tag=Example"]:visible')
			.first()
			.click();
		await page.waitForURL(`${origin}/archive/?tag=Example`);
		await ready(page);
		assert.deepEqual(await snapshot(page), tagged, "actual tag link");
		await visit("/archive/?category=Examples");
		const beforeBack = await page.$(islandSelector);
		await page.goBack();
		await page.waitForURL(`${origin}/archive/?tag=Example`);
		await page.waitForFunction((previous) => !previous.isConnected, beforeBack);
		await beforeBack.dispose();
		await ready(page);
		assert.deepEqual(await snapshot(page), tagged, "back restores tag");
		const beforeForward = await page.$(islandSelector);
		await page.goForward();
		await page.waitForURL(`${origin}/archive/?category=Examples`);
		await page.waitForFunction(
			(previous) => !previous.isConnected,
			beforeForward,
		);
		await beforeForward.dispose();
		await ready(page);
		assert.deepEqual(
			await snapshot(page),
			categorized,
			"forward restores category",
		);
		await visit("/archive/?tag=missing");
		assert.deepEqual(await snapshot(page), []);
		await visit("/archive/?tag=Example");
		assert.deepEqual(await snapshot(page), tagged);
		await page.reload();
		await ready(page);
		assert.deepEqual(await snapshot(page), tagged, "refresh restores query");
		await page.evaluate(() => {
			window.__archiveDocumentMarker = "unchanged";
			window.__archiveAudio = document.querySelector("audio");
		});
		for (let index = 0; index < 10; index++) {
			await visit("/about/");
			await visit(`/archive/${index % 2 ? "?tag=Example" : ""}`);
			assert.deepEqual(await snapshot(page), index % 2 ? tagged : original);
		}
		assert.equal(
			await page.evaluate(
				() => window.__archiveAudio === document.querySelector("audio"),
			),
			true,
			"audio instance retained",
		);
		report.checks.push("swup-query-history-refresh-10-roundtrips");
		for (const width of [1440, 390, 767, 768]) {
			// Resize away from the hover-open music player before changing the viewport.
			await page.mouse.move(0, 0);
			await page.waitForFunction(
				() =>
					document.querySelector("#music-island")?.getAttribute("data-open") !==
					"true",
			);
			await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
			await visit("/archive/");
			for (const mode of ["light", "dark"]) {
				const button = page.locator("#scheme-switch");
				for (
					let step = 0;
					step < 3 && (await button.getAttribute("data-mode")) !== mode;
					step++
				)
					await button.click();
				await page.waitForFunction(
					(mode) => document.documentElement.dataset.themeMode === mode,
					mode,
				);
				assert.deepEqual(await snapshot(page), original);
				const postLink = page.locator(`${islandSelector} a`).first();
				await postLink.focus();
				assert.equal(
					await postLink.evaluate((link) => document.activeElement === link),
					true,
				);
				const layout = await postLink.evaluate((link) => {
					const [date, line, title, tags] = link.firstElementChild.children;
					return {
						tagDisplay: getComputedStyle(tags).display,
						titleOverflow: getComputedStyle(title).overflow,
						dateWidth: date.getBoundingClientRect().width,
						lineWidth: line.getBoundingClientRect().width,
						horizontalOverflow:
							document.documentElement.scrollWidth > window.innerWidth,
					};
				});
				assert.equal(layout.tagDisplay, width < 768 ? "none" : "block");
				assert.equal(layout.titleOverflow, "hidden");
				assert.ok(Math.abs(layout.dateWidth - layout.lineWidth) < 1);
				assert.equal(layout.horizontalOverflow, false);
				await page.evaluate(async () => {
					await document.fonts.ready;
					await Promise.all(
						document
							.getAnimations()
							.filter(
								(animation) =>
									animation.effect?.getComputedTiming().iterations !==
									Number.POSITIVE_INFINITY,
							)
							.map((animation) => animation.finished.catch(() => {})),
					);
				});
				await page.screenshot({
					path: join(artifactDir, `${phase}-${width}-${mode}.png`),
					fullPage: true,
				});
				report.checks.push(`layout:${width}:${mode}`);
			}
		}
		const keyboardLink = page.locator(`${islandSelector} a`).first();
		const target = await keyboardLink.getAttribute("href");
		await keyboardLink.focus();
		await keyboardLink.press("Enter");
		await page.waitForURL(`${origin}${target}`);
		await page.waitForFunction(
			() =>
				!document.querySelector(
					'main astro-island[component-url*="ArchivePanel"]',
				),
		);
		assert.equal(
			await page.evaluate(() => window.__archiveDocumentMarker),
			"unchanged",
		);
		report.checks.push("keyboard-article-navigation");
		assert.deepEqual(report.errors, []);
		assert.deepEqual(report.failures, []);
		return report;
	} catch (error) {
		report.assertion = error.message;
		console.error(error);
		throw error;
	} finally {
		await writeFile(
			join(artifactDir, `${phase}-report.json`),
			JSON.stringify(report, null, 2),
		);
		await page.unroute("**/archive/**", intercept);
		await helper.close();
		page.off("pageerror", onError);
		page.off("console", onConsole);
		page.off("requestfailed", onFailure);
	}
}
