# 内容维护

## 首页

个人简介与栏目入口位于 `src/pages/index.astro`，头像、昵称和社交链接复用 `src/config.ts` 中的 `profileConfig`。

首页与关于页共用 `src/config.ts` 中的 `profileConfig.interests`，通过 `ProfileInterests.astro` 展示三组兴趣。修改标题、简介与标签即可同步两处内容。

## 博客与学习记录

文章仍写在 `src/content/posts/`，详情链接保持 `/posts/<slug>/`。

- 不填写 `section` 或填写 `section: blog`：出现在 `/blog/`。
- 填写 `section: learning`：出现在 `/learning/`。
- 两个列表均按 `published` 倒序排列并分页；上一篇、下一篇只关联同栏目文章。
- 归档、分类、标签和 RSS 包含两个栏目的文章；Pagefind 在构建时为文章生成搜索索引。
- 原有示例已迁至 [`docs/examples/posts/`](examples/posts/)，仅供编写参考，不参与站点发布。新增文章前请阅读 [Markdown 示例与编写规范](examples/README.md)，其中包含完整 frontmatter 模板和示例索引。

示例 frontmatter：

```yaml
title: 一次学习记录
published: 2026-09-13
section: learning
description: 简短说明本次学习内容
tags: [学习笔记]
category: 学习记录
```

## 多页签参考文档

大模型生成 API 参考位于 `src/content/posts/ai/llm/api/`，三个 Markdown 文件分别维护 Chat Completions、Responses、Anthropic Messages；没有额外的入口 Markdown 或共同导言。对外使用 `/posts/ai/llm/api/`，归入博客，并在列表、归档、标签统计和 RSS 中合并为一篇文章。

每份正文保留普通文章的 frontmatter，并增加：

```yaml
verified: 2026-10-20
tabGroup:
  slug: ai/llm/api
  title: "大模型生成 API 参考"
  id: chat-completions
  label: Chat Completions
  order: 0
```

- `slug` 是组文章的路径，不含 `/posts/` 前缀及首尾斜杠。同组的 `title`、`section` 保持一致；`id` 在组内唯一，使用小写字母、数字和连字符。
- `label` 是页签名，`order` 决定顺序；最前面的文档提供文章的发布日期、摘要、封面和分类。标签取所有页签的并集，`updated` 取最近日期，任一文档是草稿时整组在生产环境隐藏。
- `verified` 是实际核对资料的日期，`updated` 是正文修改日期。正文末尾列出对应官方资料，使用 SDK 类型核对时保留固定版本链接；示例返回与真实调用结果明确区分。
- Markdown 正文从 `##` 开始，三个页签可使用相同标题。构建插件为标题自动增加 `<id>--` 前缀，不能手动再加一遍。
- `?protocol=responses` 可以直接选择页签；章节锚点自带协议前缀，直接打开和浏览器历史操作会恢复相应正文。搜索在构建时索引三个页签，命中章节链接后会展开其所属页签。
- 关闭 JavaScript 时，三个协议的正文顺序展示。新增同类文章可使用新的 `tabGroup.slug`，不用添加新的页面路由。

新增或修改分组规则后，运行 `node --experimental-strip-types --test scripts/tests/post-grouping.test.mjs`。页面验证需覆盖页签键盘操作、目录、章节深链接、Swup、前进后退和构建后的真实搜索。

## 关于与工具

- 关于页：个人介绍位于 `src/pages/about.astro`，完整技术列表维护在 `src/config.ts` 的 `profileConfig.technologies` 中，按语言、框架、数据库和开发工具分组。列表表示接触与使用经历，不代表熟练程度。
- 工具页：修改 `src/data/tools.ts`；每项包含名称、分类、简介及可选的 `href`，通过 `ToolCard.astro` 渲染。
- 没有 `href` 时显示“整理中”；填写工具官方网站的 HTTPS 地址后显示外部访问入口。

## 全站背景

音乐播放器的曲目、文件目录和播放行为见 [灵动岛音乐播放器](music-island.md)。

`GalaxyBackground.astro` 提供全站 Canvas 和阅读遮罩；`src/scripts/galaxy.ts` 保留所提供背景的粒子算法与默认参数。

顶栏最右侧“设置 → 背景 · 星空控制”支持参数调节、暂停、恢复默认和临时“只看星空”。参数保存到 `localStorage` 的 `execute233.background.v1`；刷新和站内跳转后保留。只看星空不持久化，关闭菜单或按 Esc 可恢复页面。

系统开启“减少动态效果”时默认暂停，隐藏浏览器标签页时停止渲染。浏览器禁止本地存储或缓存损坏时使用默认值，仍可在本次会话中调节。

## 主题色与背景设置

顶栏「设置 → 背景 · 样式」提供主题色色相滑块（0–360°）和博客背景色调色板，修改即时生效并在本机保存。「恢复默认样式」恢复配置中的主题色及默认博客背景色，不重置星空参数。

- 卡片底色、边框、阴影、按钮与强调色由主题色派生，保持适合阅读的深色层级。卡片背景不再单独配置，旧的卡片颜色缓存不再应用。
- 默认主题色来自 `src/config.ts` 的 `siteConfig.themeColor.hue`；`fixed: true` 隐藏滑块并使用配置色相。刷新时在页面渲染前恢复主题色，Swup 页面切换保留当前色相。
- 博客背景色支持八位 HEX（末两位为 alpha）和不透明度滑块，点击色块展开调色板。
- 博客背景色作用于银河后面的底色；透明时透出页面底层，不影响星星自身的亮度。
- 新增选项在 `src/data/appearance.ts` 的 `appearanceOptions` 中声明，并在目标样式引用对应 CSS 变量；面板按该列表生成。
- `src/utils/local-storage.ts` 统一处理 JSON 读写与存储异常，不依赖组件、DOM 或配置校验。星空和样式分别保留 `execute233.background.v1`、`execute233.appearance.v1` 两个存储键。
- 存储不可用时仍可在当前会话调节；无效颜色恢复默认值。
