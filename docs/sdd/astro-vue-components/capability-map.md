# Capability Map：Astro + Vue 首批组件迁移

状态：已批准（2026-10-12）。用户已确认模块边界、依赖方向、范围假设和迁移顺序。2026-10-13 用户简化后续流程：Specify → Plan → Implement，跳过独立任务拆分，不新建 todo.md；已完成主题模块的 todo.md 保留为历史验收记录。

## 范围假设

- 本次将搜索、归档和主题切换从 Svelte 迁移至 Vue，保留当前外观和可观察行为。
- Astro 继续负责静态路由、内容集合、Markdown 渲染及静态构建；现有文章 URL、Pagefind 和 Swup 导航继续使用。
- 复用已有配置、翻译、URL 和主题工具；保留用户已有设置及未提交改动。
- 本次包含三组件接入、必要的 Vue 检查，以及三组件迁移完成后的 Svelte 构建链清理。具体依赖与检查配置在后续技术计划中明确。

## 模块边界

| Module id | Responsibility | Depends on | 规格路径（审核后创建） |
|---|---|---|---|
| vue-theme-switch | 将 LightDarkSwitch 迁移为 Vue；保持亮色、暗色、跟随系统、偏好保存与图标插槽；接入 Navbar | 既有主题工具、配置与翻译；无其他迁移模块依赖 | docs/sdd/vue-theme-switch/spec.md |
| vue-archive-panel | 将 ArchivePanel 迁移为 Vue；保持查询参数筛选、年份分组、计数、日期及文章链接；接入归档页 | 既有文章列表数据、URL 工具与翻译；无其他迁移模块依赖 | docs/sdd/vue-archive-panel/spec.md |
| vue-search | 将 Search 迁移为 Vue；保持桌面与手机入口、搜索状态、结果与面板交互；接入 Navbar | 既有 Pagefind API、构建索引、URL 工具与翻译；无其他迁移模块依赖 | docs/sdd/vue-search/spec.md |

建议迁移顺序：vue-theme-switch → vue-archive-panel → vue-search → 联合回归与 Svelte 清理。

上述箭头表示实施顺序，不表示模块间的数据依赖。三模块可以分别验证；联合回归与 Svelte 清理以三个模块均完成为前提。

## 共同边界

- 每个模块负责其组件以及 Astro 接入点；Navbar 同时承载主题与搜索入口，按上述顺序协调修改。
- Astro 负责向归档组件传递文章列表，Vue 负责查询参数与显示状态；接口细节在归档模块规格中定义。
- Pagefind 继续由生产构建生成；搜索组件消费其浏览器 API，开发模拟结果不能作为真实搜索验证。
- 保持 Swup 跳转、前进后退及直接访问时的行为一致，避免重复监听；保留 Swup 所需的 #toc 容器。
- 各模块规格记录自己的验收条件，并共同覆盖桌面与手机、亮暗主题及键盘操作。
- 全部 Svelte 组件替换并确认引用清除后，再移除 Svelte 集成和相关依赖；保留 Astro 与 Vue 集成。

## 已确认事项

- 三个模块的职责与共同边界已确认。
- “主题切换 → 归档 → 搜索”的顺序已确认。
- 保留现有外观、行为、内容管线及导航方式的范围假设已确认。

模块文档索引：`vue-theme-switch/spec.md`、`plan.md` 和 `todo.md` 已批准，主题迁移已实施，验证与限制见主题模块 todo.md；`vue-archive-panel/spec.md` 已批准，`vue-archive-panel/plan.md` 已起草、待审核，归档按简化流程推进，尚未开始实现；搜索尚未开始，后续从自己的 Specify 阶段推进。
