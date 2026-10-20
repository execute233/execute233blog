import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export default async function testContentTabs(
	page,
	{
		origin = "http://127.0.0.1:4321",
		artifactDir = "tmp/llm-api-reference/playwright",
	} = {},
) {
	const route = "/posts/ai/llm/api/";
	const protocols = ["chat-completions", "responses", "anthropic-messages"];
	const report = {
		checks: [],
		errors: [],
		failedRequests: [],
		screenshots: [],
	};
	await mkdir(artifactDir, { recursive: true });
	page.setDefaultTimeout(15000);
	const onError = (error) => report.errors.push(error.message);
	const onFailure = (request) => {
		if (
			request.url().startsWith(origin) &&
			request.failure()?.errorText !== "net::ERR_ABORTED"
		) {
			report.failedRequests.push(
				`${request.url()}: ${request.failure()?.errorText}`,
			);
		}
	};
	page.on("pageerror", onError);
	page.on("requestfailed", onFailure);
	async function selected(id) {
		await page.waitForFunction((expected) => {
			const panels = [...document.querySelectorAll("[data-tab-panel]")];
			const visible = panels.filter((panel) => !panel.hidden);
			const toc = [...document.querySelectorAll("#toc a")].filter(
				(a) => !a.hidden,
			);
			return (
				visible.length === 1 &&
				visible[0].dataset.tabPanel === expected &&
				document
					.querySelector(`[data-tab="${expected}"]`)
					?.getAttribute("aria-selected") === "true" &&
				toc.length > 0 &&
				toc.every((a) =>
					decodeURIComponent(a.hash).startsWith(`#${expected}--`),
				)
			);
		}, id);
		assert.equal(
			await page.locator('[role="tab"][aria-selected="true"]').count(),
			1,
		);
		assert.equal(
			(
				await page
					.locator("#toc a:not([hidden])")
					.first()
					.locator(":scope > div")
					.first()
					.textContent()
			).trim(),
			"1",
		);
	}
	try {
		await page.bringToFront();
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto(`${origin}/blog/`);
		await page.evaluate(() => {
			window.__tabsDocument = "persistent";
		});
		assert.equal(
			await page.locator(`.rose-post-card a[href="${route}"]`).first().count(),
			1,
		);
		await page.locator(`.rose-post-card h2 a[href="${route}"]`).click();
		await page.waitForURL(`${origin}${route}`);
		await selected("chat-completions");
		assert.equal(
			await page.evaluate(() => window.__tabsDocument),
			"persistent",
		);
		report.checks.push("first-entry-through-swup");

		const integrity = await page.evaluate(() => {
			const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
			return {
				duplicates: ids.filter((id, index) => ids.indexOf(id) !== index),
				missing: [...document.querySelectorAll("#toc a")]
					.filter(
						(a) =>
							!document.getElementById(decodeURIComponent(a.hash.slice(1))),
					)
					.map((a) => a.hash),
			};
		});
		assert.deepEqual(integrity, { duplicates: [], missing: [] });
		report.checks.push("unique-heading-ids-and-all-toc-targets");

		for (const id of protocols) {
			await page.locator(`[data-tab="${id}"]`).click();
			await selected(id);
			assert.equal(
				new URL(page.url()).searchParams.get("protocol"),
				id === "chat-completions" ? null : id,
			);
			const summary = page
				.locator(`[data-tab-panel="${id}"] details summary`)
				.first();
			await summary.click();
			assert.ok(
				await summary.locator("..").locator(".expressive-code").count(),
			);
			await summary.click();
		}
		report.checks.push("click-tabs-toc-and-collapsible-json");

		await page.locator('[data-tab="anthropic-messages"]').focus();
		await page.keyboard.press("ArrowRight");
		await selected("chat-completions");
		await page.keyboard.press("End");
		await selected("anthropic-messages");
		await page.keyboard.press("Home");
		await selected("chat-completions");
		await page.keyboard.press("ArrowLeft");
		await selected("anthropic-messages");
		assert.equal(
			await page
				.locator('[data-tab="anthropic-messages"]')
				.evaluate((tab) => document.activeElement === tab),
			true,
		);
		report.checks.push("keyboard-arrows-wrap-home-end-and-focus");

		await page.locator('[data-tab="responses"]').click();
		await selected("responses");
		await page.goBack();
		await selected("anthropic-messages");
		await page.goForward();
		await selected("responses");
		await page.reload();
		await selected("responses");
		report.checks.push("tab-history-and-reload");

		const heading = await page
			.locator('[data-tab-panel="anthropic-messages"] h2')
			.nth(2)
			.getAttribute("id");
		await page.goto(
			`${origin}${route}?protocol=chat-completions#${encodeURIComponent(heading)}`,
		);
		await selected("anthropic-messages");
		assert.ok(await page.locator(`[id="${heading}"]`).isVisible());
		await page.goto(`${origin}${route}?protocol=invalid#%E0%A4%A`);
		await selected("chat-completions");
		report.checks.push(
			"deep-link-overrides-query-and-malformed-fragment-fallback",
		);

		for (const query of ["previous_response_id", "tool_use_id"]) {
			await page.goto(`${origin}/blog/`);
			await page.waitForFunction(() => window.pagefind);
			await page.locator("#search-switch").click();
			await page.locator("#search-panel input").fill(query);
			const link = page.locator("#search-panel a").first();
			await link.waitFor();
			const expected =
				query === "previous_response_id" ? "responses" : "anthropic-messages";
			const href = await link.getAttribute("href");
			assert.ok(decodeURIComponent(href).includes(`#${expected}--`), href);
			await link.click();
			await selected(expected);
			await page.waitForFunction(
				() => document.querySelector("#search-panel").inert,
			);
			assert.ok(new URL(page.url()).hash);
		}
		report.checks.push(
			"production-search-selects-matching-protocol-and-heading",
		);

		for (const width of [1440, 390]) {
			await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
			for (const id of protocols) {
				await page.goto(`${origin}${route}?protocol=${id}`);
				await selected(id);
				for (const mode of ["light", "dark"]) {
					await page.locator("#scheme-switch:not([disabled])").waitFor();
					for (
						let attempt = 0;
						attempt < 3 &&
						(await page.locator("#scheme-switch").getAttribute("data-mode")) !==
							mode;
						attempt++
					) {
						await page.locator("#scheme-switch").click();
					}
					assert.equal(
						await page.locator("#scheme-switch").getAttribute("data-mode"),
						mode,
					);
					const overflow = await page.evaluate(
						() => document.documentElement.scrollWidth > innerWidth + 1,
					);
					assert.equal(overflow, false, `${width}:${id}:${mode} overflows`);
					await page.evaluate(async () => {
						await document.fonts.ready;
						window.scrollTo(0, 0);
					});
					const name = `${width}-${id}-${mode}.png`;
					await page.screenshot({
						path: join(artifactDir, name),
						animations: "disabled",
					});
					report.screenshots.push(name);
				}
			}
		}
		report.checks.push("desktop-mobile-three-protocols-light-dark-no-overflow");

		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`${origin}/blog/`);
		await page.waitForFunction(() => window.pagefind);
		await page.locator("#search-switch").click();
		await page.locator("#search-panel input").fill("tool_use_id");
		await page.locator("#search-panel a").first().click();
		await selected("anthropic-messages");
		report.checks.push("mobile-search-through-swup");

		await page.goto(`${origin}/archive/?tag=Anthropic`);
		await page.locator(`a[href="${route}"]`).waitFor();
		assert.equal(await page.locator(`a[href="${route}"]`).count(), 1);
		report.checks.push("one-archive-entry-with-grouped-tags");

		const rss = await (await page.request.get(`${origin}/rss.xml`)).text();
		assert.equal(
			(rss.match(/<link>[^<]*\/posts\/ai\/llm\/api\/<\/link>/g) ?? []).length,
			1,
		);
		assert.ok(rss.includes("/posts/ai/llm/api/"));
		for (const id of protocols) {
			assert.equal(
				(await page.request.get(`${origin}${route}${id}/`)).status(),
				404,
			);
		}
		report.checks.push("one-rss-entry-and-no-child-post-routes");

		const context = await page
			.context()
			.browser()
			.newContext({ javaScriptEnabled: false });
		try {
			const fallback = await context.newPage();
			await fallback.goto(`${origin}${route}`);
			assert.equal(await fallback.locator("[data-tab-panel]").count(), 3);
			for (const id of protocols)
				assert.ok(
					await fallback.locator(`[data-tab-panel="${id}"]`).isVisible(),
				);
		} finally {
			await context.close();
		}
		report.checks.push("all-documents-readable-without-javascript");
		assert.deepEqual(report.errors, []);
		assert.deepEqual(report.failedRequests, []);
		return report;
	} catch (error) {
		report.assertion = error.message;
		throw error;
	} finally {
		await writeFile(
			join(artifactDir, "report.json"),
			JSON.stringify(report, null, 2),
		);
		page.off("pageerror", onError);
		page.off("requestfailed", onFailure);
	}
}
