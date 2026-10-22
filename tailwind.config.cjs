/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx,mjs}"],
	darkMode: "class", // allows toggling dark mode manually
	theme: {
		extend: {
			keyframes: {
				"content-tab-enter": {
					from: { opacity: "0", transform: "translateY(8px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				"content-tab-enter":
					"content-tab-enter 240ms cubic-bezier(0.16, 1, 0.3, 1)",
			},
			fontFamily: {
				sans: ["var(--font-site)"],
				mono: ["var(--font-site)"],
				code: ["var(--font-code)"],
				reading: ["var(--font-reading)"],
			},
			colors: {
				page: "var(--page-bg)",
				primary: "var(--primary)",
				surface: "var(--surface)",
				ink: "var(--ink)",
				muted: "var(--muted)",
				subtle: "var(--subtle)",
				line: "var(--line)",
			},
			fontSize: {
				label: "var(--text-label)",
				caption: "var(--text-caption)",
				body: "var(--text-body)",
				"card-title": "var(--text-card-title)",
				"section-title": "var(--text-section-title)",
				"page-title": "var(--text-page-title)",
			},
			borderRadius: {
				card: "var(--radius)",
			},
		},
	},
	plugins: [
		require("@tailwindcss/typography"),
		function exactMaxWidthVariants({ addVariant }) {
			// Raw screens disable Tailwind's dynamic min/max variants. Preserve them.
			for (const width of [1279, 1100, 1000, 900, 800, 767, 640, 600, 360]) {
				addVariant(`max-${width}`, `@media (max-width: ${width}px)`);
			}
		},
	],
};
