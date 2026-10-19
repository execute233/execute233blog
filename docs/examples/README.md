# Markdown 示例与编写规范

本目录保存从 `src/content/posts/` 迁出的 8 篇示例文章及配套封面，供后续维护者和 AI 编程助手查阅。示例保留原文与目录结构，仅作参考，不生成站点文章，也不进入归档、RSS 或 Pagefind 搜索索引。

内容维护入口见 [内容维护](../content-editing.md)。frontmatter 以 [`src/content/config.ts`](../../src/content/config.ts) 为准，Markdown 扩展以当前 [`astro.config.mjs`](../../astro.config.mjs) 和 [`src/plugins/`](../../src/plugins/) 为准。历史示例中的 Pandoc 等语法说明不代表当前博客支持，使用前需验证实际渲染。

## 示例索引

| 示例 | 参考用途 |
|---|---|
| [基础 Markdown](posts/markdown.md) | 标题、段落、列表、引用、链接、脚注和数学公式 |
| [Markdown 扩展](posts/markdown-extended.md) | 提示块、自定义标题、GitHub 仓库卡片和剧透文本 |
| [代码块](posts/expressive-code.md) | 语言标记、文件标题、行号、高亮和折叠 |
| [视频嵌入](posts/video.md) | iframe 嵌入示例 |
| [草稿](posts/draft.md) | `draft` 字段与草稿状态 |
| [文章目录与封面](posts/guide/index.md) | frontmatter、子目录文章与相对封面路径；配套图片为 [cover.jpeg](posts/guide/cover.jpeg) |
| [学习记录](posts/learning-start.md) | `section: learning`、学习目标、过程与下一步 |
| [学习复盘](posts/learning-review.md) | 从问题到结论的简短复盘结构 |

## 新文章的存放位置

正式文章仍写入 `src/content/posts/<slug>.md`，也可使用 `src/content/posts/<slug>/index.md` 并将图片放在同一目录。详情页 URL 由现有路由工具生成，使用 `/posts/<slug>/` 形式。

可以在仓库根目录执行 `pnpm new-post <slug>` 创建文章骨架，再按下列模板补全内容。不要整批复制示例回文章目录；示例标题、日期和占位正文应替换成真实内容。尚未完成的文章设置 `draft: true`，发布前再改为 `false`。

## Frontmatter 模板

以下日期仅作格式示例，写作时填写文章的实际日期：

```markdown
---
title: "文章标题"
published: 2026-10-19
section: blog
description: "用一两句话说明文章解决的问题或记录的内容。"
image: ""
tags: [技术笔记]
category: "开发实践"
draft: true
lang: "zh-CN"
---

用一段话交代背景与本文目标。

## 问题或目标

说明需要解决的问题。

## 实践过程

记录关键步骤、代码和观察结果。

## 结论与下一步

总结已验证的结论，并指出尚未解决的问题。
```

- `title`、`published` 必填；日期使用 `YYYY-MM-DD`。需要记录修改日期时再添加可选的 `updated`。
- `section` 只能是 `blog` 或 `learning`，省略时默认为 `blog`；学习记录填写 `learning`。
- `description`、`image`、`tags`、`category`、`draft`、`lang` 均可省略。`tags` 使用数组，`category` 使用单个分类名；省略 `draft` 等同于 `false`。
- 本地封面可用 `image: "./cover.jpeg"`，相对于文章文件解析，迁移文章时应同时迁移图片并保留相对位置。
- 不手写 `prevSlug`、`prevTitle`、`nextSlug`、`nextTitle`，它们由查询逻辑生成。
- `draft: true` 只在生产环境被过滤，开发模式仍会展示草稿。

## 正文约定

- 页面会显示 frontmatter 中的标题，正文通常从 `##` 开始，按层级组织内容。
- 段落、列表和代码块之间保留空行；围栏代码块填写语言，需要时添加 `title="文件名"`，具体语法参考代码块示例。
- 图片路径与资源保持一致，为正文图片填写有意义的替代文本；示例中的外部链接和媒体仅用于展示语法。
- 提示块使用 `:::note`、`:::tip`、`:::important`、`:::warning`、`:::caution`，用 `:::` 结束；自定义标题参考 `:::note[标题]`。
- GitHub 仓库卡片使用 `::github{repo="owner/repo"}`；行内公式使用 `$...$`，独立公式使用 `$$...$$`。
- 学习记录可参考“目标 → 实践过程 → 结论 → 下一步”的结构，内容应以实际尝试与验证结果为准。

## 修改后的检查

- 只修改本目录参考文档时，检查 Markdown 排版、相对链接和 Git 差异即可。
- 新增或修改正式文章后运行 `pnpm check`；涉及文章迁移、静态路由或搜索索引时运行 `pnpm build`。
- 批量移走全部文章后，如果构建仍读取旧文章或旧图片路径，先运行 `pnpm astro sync --force` 刷新生产内容缓存，再重新构建。开发模式若也显示旧内容，停止当前开发服务并用 `pnpm dev --force --host 127.0.0.1` 启动，刷新开发内容缓存。文章目录为空时，Astro 的空集合提示属于预期现象。
- 新增图片、代码块、公式或扩展语法后，在浏览器中检查实际文章表现；验证真实搜索需先构建，再运行 `pnpm preview --host 127.0.0.1`。
- 现有 `scripts/tests/archive-panel.playwright.mjs` 和 `scripts/tests/theme-switch.playwright.mjs` 中的部分场景依赖原示例文章、标签和搜索结果。迁移后空站点不满足这些场景的内容前提；运行时应在独立测试副本中准备对应示例，勿为了测试将其重新发布到正式站点。
