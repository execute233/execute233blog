# 内容维护

## 首页

个人简介与栏目入口位于 `src/pages/index.astro`，头像、昵称和社交链接复用 `src/config.ts` 中的 `profileConfig`。

## 博客与学习记录

文章仍写在 `src/content/posts/`，详情链接保持 `/posts/<slug>/`。

- 不填写 `section` 或填写 `section: blog`：出现在 `/blog/`。
- 填写 `section: learning`：出现在 `/learning/`。
- 两个列表均按 `published` 倒序排列并分页；上一篇、下一篇只关联同栏目文章。
- 归档、分类、标签和 RSS 包含两个栏目的文章；Pagefind 在构建时为文章生成搜索索引。
- `learning-start.md`、`learning-review.md` 是示例文章，可直接替换或删除。

示例 frontmatter：

```yaml
title: 一次学习记录
published: 2026-09-13
section: learning
description: 简短说明本次学习内容
tags: [学习笔记]
category: 学习记录
```

## 里程碑与工具

- 关于页：修改 `src/data/milestones.ts`，数组按希望展示的顺序排列；示例日期和事件不代表真实履历。
- 工具页：修改 `src/data/tools.ts`；每项包含名称、分类、简介及可选的 `href`，通过 `ToolCard.astro` 渲染。
- 没有 `href` 时显示“整理中”；填写工具官方网站的 HTTPS 地址后显示外部访问入口。

## 全站背景

音乐播放器的曲目、文件目录和播放行为见 [灵动岛音乐播放器](music-island.md)。

`GalaxyBackground.astro` 提供全站 Canvas 和阅读遮罩；`src/scripts/galaxy.ts` 保留所提供背景的粒子算法与默认参数。

顶栏最右侧“设置 → 背景 · 星空控制”支持参数调节、暂停、恢复默认和临时“只看星空”。参数保存到 `localStorage` 的 `execute233.background.v1`；刷新和站内跳转后保留。只看星空不持久化，关闭菜单或按 Esc 可恢复页面。

系统开启“减少动态效果”时默认暂停，隐藏浏览器标签页时停止渲染。浏览器禁止本地存储或缓存损坏时使用默认值，仍可在本次会话中调节。

## 背景样式设置

顶栏「设置 → 背景 · 样式」可调整卡片背景和博客背景色，点击右侧色块展开调色板。支持八位 HEX 颜色值（末两位为 alpha）和不透明度滑块，修改即时生效。「恢复默认样式」只恢复样式，不重置星空参数。

- 默认卡片底色为原入口卡片的中性深灰，不透明度约 92%；介绍卡片不再单独使用渐变。
- 博客背景色作用于银河后面的底色；透明时透出页面底层，不影响星星自身的亮度。
- 新增选项在 `src/data/appearance.ts` 的 `appearanceOptions` 中声明，并在目标样式引用对应 CSS 变量；面板按该列表生成。
- `src/utils/local-storage.ts` 统一处理 JSON 读写与存储异常，不依赖组件、DOM 或配置校验。星空和样式分别保留 `execute233.background.v1`、`execute233.appearance.v1` 两个存储键。
- 存储不可用时仍可在当前会话调节；无效颜色恢复默认值。
