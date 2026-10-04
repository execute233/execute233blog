/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}"],
	darkMode: "class", // allows toggling dark mode manually
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-site)"],
				mono: ["var(--font-site)"],
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
