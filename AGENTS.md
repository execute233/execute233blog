# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **Fuwari**-based static blog template built with **Astro 5**, **Tailwind CSS**, and **Svelte 5** (for interactive components). It is a fresh template clone — `src/config.ts` still holds demo values (site title "Fuwari", profile "Lorem Ipsum"). The build target is `dist/`, deployed statically (Vercel config present).

**Package manager is pnpm only** — a `preinstall` hook (`npx only-allow pnpm`) rejects npm/yarn.

## Commands

All from the repo root:

| Command | Purpose |
|---|---|
| `pnpm install` | Install dependencies (frozen lockfile expected: `pnpm@9.14.4`) |
| `pnpm dev` | Dev server at `http://localhost:4321` |
| `pnpm check` / `pnpm astro check` | Type/content/schema check (no build) |
| `pnpm type-check` | `tsc --noEmit --isolatedDeclarations` |
| `pnpm build` | `astro build && pagefind --site dist` — **search index is generated from the build output, so this is two phases** |
| `pnpm preview` | Serve built `dist/` locally |
| `pnpm new-post <filename>` | Scaffold a new post in `src/content/posts/` |

Lint/format are run through **Biome** (tabs, double quotes, `organizeImports` on save):
- `pnpm format` → `biome format --write ./src`
- `pnpm lint` → `biome check --write ./src`
- CI checks with `biome ci ./src` (must pass with no warnings → `--fix` locally first)

Note that `pnpm check` and `pnpm build` are what CI runs (see `.github/workflows/`): `build.yml` runs `astro check` + `astro build` on Node 22/23, `biome.yml` runs the Biome CI command.

## Architecture

### Site configuration
All blog-wide settings live in **`src/config.ts`**, typed by `src/types/config.ts`. This is the "control panel": site title/lang, theme hue, banner, TOC, nav links, profile, license. Consumed via `@/config` (alias `@/*` → `src/*`). The theme's `hue` is exported as a global CSS variable `--hue` in `src/layouts/Layout.astro`; the whole color scheme derives from this one value (light/dark are toggled via a `.dark` class on `<html>`, see `darkMode: "class"` in `tailwind.config.cjs`). `ConfigCarrier.astro` mirrors `hue` into a DOM attribute so client code (`src/utils/setting-utils.ts`) can read the default hue before JS bundles load.

### Content model
`src/content/config.ts` defines an Astro content collection **`posts`** (with validated frontmatter schema) plus a permissive **`spec`** collection. Posts live in `src/content/posts/<slug>.md`. Frontmatter: `title`, `published`, optional `description`, `image`, `tags`, `category`, `draft`, `lang`, `updated`. The `prevSlug`/`prevTitle`/`nextSlug`/`nextTitle` fields are **filled in programmatically** at query time, not authored.

Key content behavior:
- **Drafts**: `getCollection("posts", ...)` in `src/utils/content-utils.ts` filters `draft: true` only when `import.meta.env.PROD` — drafts are visible in dev.
- Sort and prev/next chaining happen in `getSortedPosts()` (content-utils), which all list/archive/post pages use.
- Posts in subdirectories are supported (e.g. `guide/index.md`); `getPostUrlBySlug`/`getDir` in `src/utils/url-utils.ts` compute URLs.

### Routing / page generation (static)
- `src/pages/[...page].astro` — paginated home page (`PAGE_SIZE = 8` from `src/constants/constants.ts`), uses `getStaticPaths` + `paginate`.
- `src/pages/posts/[...slug].astro` — single post page; renders `entry.render()`, JSON-LD, rich metadata.
- `src/pages/archive.astro` — server passes all posts to `ArchivePanel.svelte` (`client:only="svelte"`), which does category/tag filtering fully client-side via query params.
- `src/pages/about.astro` — renders `src/content/spec/about.md`.
- `src/pages/rss.xml.ts`, `src/pages/robots.txt.ts` — generated endpoints.
- Layouts: `Layout.astro` (shell: head/SEO/theme-init/scrollbars/lightbox) wraps `MainGridLayout.astro` (navbar, banner, responsive grid, sidebar, footer, TOC).

### SPA-style navigation (Swup)
`@swup/astro` enables same-session page transitions. The integration is configured in `astro.config.mjs` with `containers: ["main", "#toc"]`. Consequences to respect:
- Client scripts interact with Swup via `window.swup.hooks.on(...)` (theme re-init, custom scrollbar re-binding, TOC navbar hiding — all in `Layout.astro`).
- `#toc` must always be in the DOM for Swup to work (see the note in `MainGridLayout.astro`); it's rendered based on `siteConfig.toc.enable`.

### Markdown processing pipeline
`astro.config.mjs` wires a custom remark/rehype pipeline (`src/plugins/`) that adds blog-specific features on top of GFM:
- `remark-reading-time` — frontmatter `minutes`/`words` (shown on post pages).
- `remark-excerpt` — frontmatter `excerpt` = first paragraph.
- GitHub-style admonitions (`:::note`, `:::tip`, `:::important`, `:::caution`, `:::warning`, using the GitLab-style directive syntax with an optional `{name="..."}` label) → GitHub-compatible blockquotes via `rehype-component-admonition.mjs`.
- GitHub repository cards (`:::github user/repo`) via `rehype-component-github-card.mjs`.
- KaTeX math (`remark-math` + `rehype-katex`) and `remark-sectionize` for heading sections.
- Expressive Code for code blocks (`astro-expressive-code`), styled to the blog's CSS vars with custom plugins (`language-badge`, `custom-copy-button`).

### i18n
`src/i18n/` maps language codes (from `siteConfig.lang`) to a `Translation` record (all strings keyed by the `I18nKey` enum). `i18n(key)` returns the current language's string via `getTranslation()`. Adding a string means adding an enum member, adding the key to every `src/i18n/languages/*.ts` file, and registering the lang in the `map` in `translation.ts`. Nav links (`link-presets.ts`) and the archive page use these strings.

### Search (Pagefind)
Search is **build-time index only**: `pnpm build` runs `pagefind --site dist` after `astro build`. `Search.svelte` uses `window.pagefind.search()` in production; in `dev` it shows hard-coded fake results (Pagefind is not generated). `pagefind.yml` excludes KaTeX, `.search-panel`, and `[data-pagefind-ignore]` content.

### Icons
`astro-icon` + Iconify sets (`fa6-brands/regular/solid`, `material-symbols`), bundled in `astro.config.mjs`. Icon names are strings like `material-symbols:notes-rounded`; new icon sets require `pnpm add @iconify-json/<set>` and inclusion in the `icon()` integration.

### Conventions
- **Path aliases** (tsconfig): `@/` → `src/`, plus `@components`, `@assets`, `@constants`, `@utils`, `@i18n`, `@layouts`. Prefer these over relative imports.
- **URLs**: always build internal hrefs through `url()` from `src/utils/url-utils.ts` — it prepends `import.meta.env.BASE_URL`, so hard-coding paths breaks when the site ships under a sub-path. `site`/`trailingSlash: "always"` are set in `astro.config.mjs`.
- **Styling**: Tailwind utilities + CSS variables from `src/styles/` (`main.css`, `variables.styl`, markdown styles, scrollbar, transition). Global vars (e.g. `--primary`, `--card-bg`) are defined from `--hue`; keep new colors derived from the hue so light/dark both work.
- **Biome**: tabs for indentation, double quotes, no unused imports/vars in `.astro`/`.svelte` (overridden to off). Follow these to keep `biome ci` green.
- **Build artifacts**: `dist/` is output only — do not edit.

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.