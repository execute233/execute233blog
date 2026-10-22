import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function results(page) {
	return page.locator("#search-panel a").evaluateAll((links) =>
		links.map((link) => ({
			url: link.getAttribute("href"),
			title: link.firstElementChild.textContent.trim(),
			excerpt: link.children[1].innerHTML.replaceAll("<!---->", "").trim(),
		})),
	);
}

// Run on an isolated Page at a built preview; baseline excludes migration fixes.
export default async function testSearch(
	page,
	{
		phase = "final",
		artifactDir = "tmp/astro-components/search",
		baselinePath,
	} = {},
) {
	page.setDefaultTimeout(15000);
	const origin = new URL(page.url()).origin;
	const baseline = baselinePath
		? JSON.parse(await readFile(baselinePath, "utf8"))
		: null;
	const report = { checks: [], snapshots: {}, errors: [], failures: [] };
	await mkdir(artifactDir, { recursive: true });
	const error = (value) => report.errors.push(value.message);
	const consoleError = (message) => {
		if (message.type() === "error") report.errors.push(message.text());
	};
	const failed = (request) => {
		if (
			request.url().startsWith(origin) &&
			request.failure()?.errorText !== "net::ERR_ABORTED"
		)
			report.failures.push(`${request.url()}: ${request.failure()?.errorText}`);
	};
	page.on("pageerror", error);
	page.on("console", consoleError);
	page.on("requestfailed", failed);
	try {
		for (const width of [1440, 390, 767, 768, 1024]) {
			await page.mouse.move(0, 0);
			await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
			await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
			await page.waitForFunction(
				() => window.pagefind && document.querySelector("site-search:defined"),
			);
			await page.locator("#scheme-switch:not([disabled])").waitFor();
			await page.locator("#search-switch").click();
			await page.waitForFunction(
				() => document.querySelector("#search-panel").inert === false,
			);
			assert.equal(
				await page.locator("#search-switch").getAttribute("aria-expanded"),
				"true",
			);
			for (const query of ["API", "学习", "zzzznoresults998877"]) {
				const expected = await page.evaluate(async (query) => {
					const response = await window.pagefind.search(query);
					const items = await Promise.all(
						response.results.map((item) => item.data()),
					);
					return items.map((item) => {
						const sections =
							item.meta.tabbed === "true"
								? item.sub_results?.filter((section) =>
										section.url.includes("--"),
									)
								: [];
						const section =
							sections?.find((section) =>
								section.excerpt
									.replace(/<\/?mark>/g, "")
									.toLowerCase()
									.includes(query.trim().toLowerCase()),
							) ?? sections?.[0];
						return {
							url: section?.url ?? item.url,
							title: item.meta.title,
							excerpt: (section?.excerpt ?? item.excerpt).trim(),
						};
					});
				}, query);
				await page.locator("#search-panel input").fill(query);
				await page.waitForFunction((expected) => {
					const links = [...document.querySelectorAll("#search-panel a")];
					return (
						document
							.querySelector("#search-panel")
							.getAttribute("aria-busy") === "false" &&
						links.length === expected.length &&
						links.every(
							(link, index) =>
								link.getAttribute("href") === expected[index].url,
						)
					);
				}, expected);
				const actual = await results(page);
				assert.deepEqual(actual, expected);
				const key = `${width}:${query}`;
				report.snapshots[key] = actual;
				if (baseline) assert.deepEqual(actual, baseline.snapshots[key], key);
				report.checks.push(key);
			}
			await page.locator("#search-panel input").fill("API");
			await page.locator("#search-panel a").first().waitFor();
			for (const mode of ["light", "dark"]) {
				for (
					let index = 0;
					index < 3 &&
					(await page.locator("#scheme-switch").getAttribute("data-mode")) !==
						mode;
					index++
				)
					await page.locator("#scheme-switch").click();
				// Theme clicks intentionally close the panel through the shared outside handler.
				if (
					(await page
						.locator("#search-switch")
						.getAttribute("aria-expanded")) !== "true"
				)
					await page.locator("#search-switch").click();
				await page.waitForFunction(
					() => !document.querySelector("#search-panel").inert,
				);
				await page.evaluate(async () => {
					await document.fonts.ready;
					await Promise.all(
						document
							.getAnimations()
							.filter((animation) =>
								Number.isFinite(animation.effect?.getTiming().iterations),
							)
							.map((animation) => animation.finished.catch(() => {})),
					);
				});
				await page.screenshot({
					path: join(artifactDir, `${phase}-${width}-${mode}.png`),
				});
				const box = await page.locator("#search-panel").boundingBox();
				assert.ok(box.x >= 0 && box.x + box.width <= width);
				report.checks.push(`layout:${width}:${mode}`);
			}
			await page.locator("#search-panel input").focus();
			await page.locator("#search-switch").click();
			await page.waitForFunction(
				() => document.querySelector("#search-panel").inert,
			);
			assert.equal(
				await page.locator("#search-switch").getAttribute("aria-expanded"),
				"false",
			);
			report.checks.push(`close:${width}`);
		}
		await page.locator("#search-switch").click();
		const target = await page
			.locator("#search-panel a")
			.first()
			.getAttribute("href");
		await page.evaluate(() => {
			window.__searchDocument = true;
			window.__searchIsland = document.querySelector("site-search");
		});
		await page.locator("#search-panel a").first().focus();
		await page.locator("#search-panel a").first().press("Enter");
		await page.waitForURL(`${origin}${target}`);
		await page.waitForFunction(
			() => document.querySelector("#search-panel").inert,
		);
		assert.equal(
			await page.evaluate(
				() =>
					window.__searchDocument &&
					window.__searchIsland === document.querySelector("site-search"),
			),
			true,
		);
		await page.goBack();
		await page.waitForURL(`${origin}/`);
		await page.goForward();
		await page.waitForURL(`${origin}${target}`);
		assert.equal(await page.locator("#search-panel").count(), 1);
		assert.equal(await page.locator("#toc").count(), 1);
		report.checks.push("keyboard-swup-history-persistent-component");
		if (phase !== "baseline") {
			await page.locator("#search-switch").click();
			await page.locator("#search-panel input").fill("");
			await page.waitForFunction(
				() =>
					document.querySelectorAll("#search-panel a").length === 0 &&
					document.querySelector("#search-panel").getAttribute("aria-busy") ===
						"false",
			);
			await page.locator("#search-panel input").press("Escape");
			await page.waitForFunction(
				() => document.querySelector("#search-panel").inert,
			);
			assert.equal(
				await page
					.locator("#search-switch")
					.evaluate((button) => document.activeElement === button),
				true,
			);
			report.checks.push("clear-and-escape");
		}
		assert.deepEqual(report.errors, []);
		assert.deepEqual(report.failures, []);
		return report;
	} catch (error) {
		report.assertion = error.message;
		throw error;
	} finally {
		await writeFile(
			join(artifactDir, `${phase}-report.json`),
			JSON.stringify(report, null, 2),
		);
		page.off("pageerror", error);
		page.off("console", consoleError);
		page.off("requestfailed", failed);
	}
}
