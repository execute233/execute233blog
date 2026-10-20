// Each Markdown tab owns its heading IDs, including headings with the same text.
export function rehypeTabHeadings() {
	return (tree, file) => {
		const id = file.data.astro?.frontmatter?.tabGroup?.id;
		if (!id) return;
		const prefix = `${id}--`;
		const walk = (node) => {
			if (
				node.type === "element" &&
				/^h[1-6]$/.test(node.tagName) &&
				node.properties?.id &&
				!String(node.properties.id).startsWith(prefix)
			) {
				node.properties.id = `${prefix}${node.properties.id}`;
			}
			for (const child of node.children ?? []) walk(child);
		};
		walk(tree);
	};
}
