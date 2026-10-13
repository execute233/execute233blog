// Run this function through an existing Playwright Page (MCP or a local runner).
export default async function testColorSettings(
	page,
	artifactDir = "tmp/palette-debug/playwright",
) {
	const assert = {
		equal(actual, expected, label = "") {
			if (actual !== expected)
				throw new Error(`${label}: expected ${expected}, received ${actual}`);
		},
		notEqual(actual, expected) {
			if (actual === expected)
				throw new Error(`Unexpected unchanged value: ${actual}`);
		},
		ok(value) {
			if (!value) throw new Error("Expected a visible control");
		},
		match(value, pattern) {
			if (!pattern.test(value)) throw new Error(`Invalid color: ${value}`);
		},
	};
	const results = [];
	const errors = [];
	const origin = new URL(page.url()).origin;
	const testPage = page;
	const originalStorage = await page.evaluate(() => ({ ...localStorage }));
	const originalViewport = page.viewportSize();
	await page.emulateMedia({ reducedMotion: "reduce" });
	const collectError = (error) => errors.push(error.message);
	testPage.on("pageerror", collectError);
	const clickControl = async (locator) => {
		// Flush layout in the attached browser before sending pointer input.
		await testPage.screenshot();
		const before = await locator.evaluate((el) =>
			el.hasAttribute("aria-expanded")
				? el.getAttribute("aria-expanded") === "true"
				: el.closest("details").open,
		);
		await locator.evaluate((el) => el.scrollIntoView({ block: "nearest" }));
		const box = await locator.boundingBox();
		assert.ok(box);
		await locator.click({ force: true });
		await testPage.waitForFunction(
			({ element, before }) =>
				(element.hasAttribute("aria-expanded")
					? element.getAttribute("aria-expanded") === "true"
					: element.closest("details").open) !== before,
			{ element: await locator.elementHandle(), before },
			{ polling: 50, timeout: 5000 },
		);
	};
	try {
		for (const width of [1440, 390]) {
			await testPage.setViewportSize({ width, height: 1000 });
			for (const theme of ["dark", "light"]) {
				await testPage.goto(origin);
				await testPage.evaluate((mode) => {
					localStorage.clear();
					localStorage.setItem("theme", mode);
				}, theme);
				await testPage.reload();
				await testPage.waitForFunction(
					() =>
						document.querySelector("#cursor-settings")?.dataset.initialized &&
						document.querySelector("#appearance-settings")?.dataset.initialized,
					undefined,
					{ polling: 50 },
				);
				if (
					!(await testPage.locator("#site-settings").evaluate((el) => el.open))
				) {
					await clickControl(testPage.locator("#site-settings > summary"));
				}
				for (const id of [
					"blog",
					"cursor-glow",
					"cursor-border",
					"cursor-fill",
				]) {
					const panel = id === "blog" ? "appearance" : "cursor";
					const details = testPage.locator(`#${panel}-settings`);
					if (!(await details.evaluate((el) => el.open))) {
						await clickControl(details.locator(":scope > summary"));
					}
					if (id === "blog" || id === "cursor-glow") {
						await testPage.screenshot();
						await details.locator(`#${panel}-reset`).click({ force: true });
					}
					const row = testPage.locator(`[data-color-setting="${id}"]`);
					await clickControl(row.locator("button"));
					const state = () =>
						row.evaluate((el) => {
							const key = el.dataset.colorSetting;
							const background = key === "blog";
							const name = key.replace("cursor-", "");
							const target = background
								? document.documentElement
								: document.querySelector("#site-cursor");
							const saved = JSON.parse(
								localStorage.getItem(
									background
										? "execute233.appearance.v2"
										: "execute233.cursor.v1",
								),
							);
							return {
								picker: el.querySelector("hex-alpha-color-picker").color,
								hex: el.querySelector(".appearance-hex").value,
								css: target.style.getPropertyValue(
									background ? "--blog-background" : `--cursor-${name}`,
								),
								saved: background
									? saved?.backgrounds[
											document.documentElement.classList.contains("dark")
												? "dark"
												: "light"
										]
									: saved?.[name],
							};
						});
					const clickPart = async (part, x, y) => {
						const locator = row.locator(`[part="${part}"]`);
						await locator.evaluate((el) =>
							el.scrollIntoView({ block: "center" }),
						);
						await testPage.screenshot();
						const box = await locator.boundingBox();
						if (!box)
							throw new Error(
								`${width}/${theme}/${id}/${part}: ${await row.evaluate((el) => el.outerHTML)}`,
							);
						await testPage.mouse.click(
							box.x + box.width * x,
							box.y + box.height * y,
						);
					};
					const check = async (step, alpha) => {
						const value = await state();
						const expected =
							value.picker.length === 7 ? `${value.picker}ff` : value.picker;
						assert.match(expected, /^#[\da-f]{8}$/i);
						assert.equal(
							value.hex,
							expected,
							`${width}/${theme}/${id}/${step}: input`,
						);
						assert.equal(
							value.css,
							expected,
							`${width}/${theme}/${id}/${step}: CSS`,
						);
						assert.equal(
							value.saved,
							expected,
							`${width}/${theme}/${id}/${step}: persistence`,
						);
						if (alpha)
							assert.equal(
								expected.slice(7),
								alpha,
								`${width}/${theme}/${id}/${step}: alpha`,
							);
						return expected;
					};
					const before = await state();
					await clickPart("saturation", 0.85, 0.2);
					const opaque = await check("opaque color", "ff");
					assert.notEqual(opaque.slice(0, 7), before.hex.slice(0, 7));
					await clickPart("hue", 0.35, 0.5);
					const hue = await check("opaque hue", "ff");
					assert.notEqual(hue, opaque);
					await clickPart("alpha", 0.5, 0.5);
					const alpha = (await check("alpha")).slice(7);
					assert.notEqual(alpha, "ff");
					await clickPart("saturation", 0.6, 0.1);
					await check("color with alpha", alpha);
					await clickPart("alpha", 0.999, 0.5);
					await check("return to opaque", "ff");
					await clickPart("saturation", 0.7, 0.25);
					await check("color after returning to opaque", "ff");
					results.push({ width, theme, id, passed: true });
					await clickControl(row.locator("button"));
				}
				if (artifactDir)
					await testPage.screenshot({
						path: `${artifactDir}/${width}-${theme}.png`,
					});
				const saved = await testPage.evaluate(() =>
					document.documentElement.style.getPropertyValue("--blog-background"),
				);
				await testPage.reload();
				await testPage.waitForFunction(
					(color) =>
						document.documentElement.style.getPropertyValue(
							"--blog-background",
						) === color,
					saved,
					{ polling: 50 },
				);
			}
		}
		assert.equal(errors.length, 0, errors.join("; "));
		return { results, errors };
	} catch (error) {
		throw new Error(`${error.message}\nCompleted: ${JSON.stringify(results)}`, {
			cause: error,
		});
	} finally {
		testPage.off("pageerror", collectError);
		await page.evaluate((saved) => {
			localStorage.clear();
			for (const [key, value] of Object.entries(saved))
				localStorage.setItem(key, value);
		}, originalStorage);
		if (originalViewport) await page.setViewportSize(originalViewport);
		await page.goto(origin);
	}
}
