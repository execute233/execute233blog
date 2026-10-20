import assert from "node:assert/strict";
import test from "node:test";
import { groupPosts } from "../../src/utils/post-grouping.ts";

function post(id, overrides = {}) {
	return {
		id: `${id}.md`,
		slug: id,
		body: `Body of ${id}`,
		data: {
			title: id,
			section: "blog",
			published: new Date("2026-10-20"),
			draft: false,
			tags: ["API"],
			...overrides,
		},
		render: async () => ({
			Content: null,
			headings: [],
			remarkPluginFrontmatter: { words: 100, minutes: 1 },
		}),
	};
}

function variant(id, order, overrides = {}) {
	return post(id, {
		tabGroup: {
			slug: "ai/llm/api",
			title: "API reference",
			id,
			label: id,
			order,
		},
		...overrides,
	});
}

test("ordinary posts keep their identity and empty collections remain empty", () => {
	const entry = post("ordinary");
	assert.deepEqual(groupPosts([]), []);
	assert.equal(groupPosts([entry])[0], entry);
});

test("protocols produce one canonical article with ordered RSS content and combined reading time", async () => {
	const chat = variant("chat", 0);
	const responses = variant("responses", 1, {
		tags: ["API", "OpenAI"],
		updated: new Date("2026-10-22"),
	});
	const [article] = groupPosts([responses, chat]);
	assert.equal(article.slug, "ai/llm/api");
	assert.equal(article.data.title, "API reference");
	assert.deepEqual(article.data.tags, ["API", "OpenAI"]);
	assert.equal(article.data.updated.toISOString(), "2026-10-22T00:00:00.000Z");
	assert.ok(
		article.body.indexOf("Body of chat") <
			article.body.indexOf("Body of responses"),
	);
	assert.equal(chat.slug, "chat");
	assert.equal(chat.data.title, "chat");
	const { remarkPluginFrontmatter } = await article.render();
	assert.equal(remarkPluginFrontmatter.words, 200);
	assert.equal(remarkPluginFrontmatter.minutes, 2);
});

test("one draft protocol makes the entire article a draft", () => {
	const [article] = groupPosts([
		variant("chat", 0),
		variant("messages", 1, { draft: true }),
	]);
	assert.equal(article.data.draft, true);
});

test("duplicate protocol IDs fail instead of creating ambiguous DOM and deep links", () => {
	assert.throws(
		() => groupPosts([variant("chat", 0), variant("chat", 1)]),
		/Inconsistent tab group/,
	);
});

test("a tab group cannot silently shadow an ordinary article", () => {
	assert.throws(
		() => groupPosts([post("ai/llm/api"), variant("chat", 0)]),
		/conflicts with an article/,
	);
});

test("protocols in different sections cannot be merged into one article", () => {
	assert.throws(
		() =>
			groupPosts([
				variant("chat", 0),
				variant("messages", 1, { section: "learning" }),
			]),
		/Inconsistent tab group/,
	);
});
