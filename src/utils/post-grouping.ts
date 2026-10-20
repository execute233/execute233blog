import type { CollectionEntry } from "astro:content";

type Post = CollectionEntry<"posts">;
type TabbedPost = Post & {
	data: Post["data"] & { tabGroup: NonNullable<Post["data"]["tabGroup"]> };
};

export function hasPostTabs(post: Post): post is TabbedPost {
	return post.data.tabGroup !== undefined;
}

export function groupPosts(posts: Post[]): Post[] {
	const articles: Post[] = [];
	const groups = new Map<string, TabbedPost[]>();
	for (const post of posts) {
		if (!hasPostTabs(post)) {
			articles.push(post);
			continue;
		}
		const group = post.data.tabGroup;
		const members = groups.get(group.slug) ?? [];
		members.push(post);
		groups.set(group.slug, members);
	}
	for (const [slug, members] of groups) {
		members.sort((a, b) => a.data.tabGroup.order - b.data.tabGroup.order);
		const first = members[0];
		const group = first.data.tabGroup;
		const ids = new Set<string>();
		for (const member of members) {
			const variant = member.data.tabGroup;
			if (
				ids.has(variant.id) ||
				variant.title !== group.title ||
				member.data.section !== first.data.section
			) {
				throw new Error(`Inconsistent tab group: ${slug} (${member.id})`);
			}
			ids.add(variant.id);
		}
		if (posts.some((post) => !post.data.tabGroup && post.slug === slug)) {
			throw new Error(`Tab group conflicts with an article: ${slug}`);
		}
		const updated = members
			.map((post) => post.data.updated ?? post.data.published)
			.sort((a, b) => b.valueOf() - a.valueOf())[0];
		articles.push({
			...first,
			slug,
			render: async () => {
				const rendered = await Promise.all(
					members.map((post) => post.render()),
				);
				return {
					...rendered[0],
					remarkPluginFrontmatter: {
						...rendered[0].remarkPluginFrontmatter,
						words: rendered.reduce(
							(sum, post) => sum + (post.remarkPluginFrontmatter.words ?? 0),
							0,
						),
						minutes: rendered.reduce(
							(sum, post) => sum + (post.remarkPluginFrontmatter.minutes ?? 0),
							0,
						),
					},
				};
			},
			body: members
				.map((post) => `## ${post.data.tabGroup.label}\n\n${post.body}`)
				.join("\n\n"),
			data: {
				...first.data,
				title: group.title,
				updated,
				draft: members.some((post) => post.data.draft),
				tags: [...new Set(members.flatMap((post) => post.data.tags))],
			},
		});
	}
	return articles;
}
