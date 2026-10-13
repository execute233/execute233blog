# Spec：归档组件迁移至 Vue

状态：已批准（2026-10-13）。用户已确认归档规格；技术计划已起草、待审核。按用户要求跳过任务拆分，不创建 todo.md，尚未开始实现。

模块 id：`vue-archive-panel`。范围来自已批准的 [能力图](../astro-vue-components/capability-map.md)。前序主题模块已实现；归档与搜索当前仍使用 Svelte。

## Assumptions（范围假设）

- 将 `ArchivePanel.svelte` 替换为 Vue，保留当前归档外观、查询参数语义、年份分组、计数、日期和文章 URL。
- Astro 继续提供文章列表，Vue 负责查询参数筛选和展示；复用当前内容、URL 与国际化工具。
- 继续采用客户端归档渲染；本模块不增加服务端筛选或新的静态归档路由。
- 复用主题模块已建立的 Vue 集成、类型检查与 CI；搜索尚未迁移，继续保留 Svelte 集成和依赖。

## Objective（目标）

使访客在 Vue 归档组件中继续查看按年份组织的文章，并能通过已有分类、标签链接获得相同结果。直接访问、刷新、Swup 跳转和前进后退均显示当前 URL 对应的文章集合。

成功表现为迁移前后的归档列表、顺序、计数、日期、链接和响应式展示一致，主题切换及现有内容管线继续正常工作。

## Current State（当前基础）

- `src/pages/archive.astro` 调用 `getSortedPostsList()`，将 `sortedPosts` 传给 `ArchivePanel.svelte`，使用 `client:only="svelte"`。
- 文章列表同时包含博客和学习记录；生产模式过滤草稿，开发模式可见草稿。列表按现有发布日期逻辑排序。
- 当前归档读取所有 `tag` 和 `category` 参数，以及第一个 `uncategorized` 参数；挂载后筛选并按年份组织。
- 年份降序排列，同一年内保留输入列表顺序；日期显示 `MM-DD`，标签显示为以空格连接的 `#标签`。
- 模板使用现有卡片、时间线、链接、深浅主题类和 `md` 响应式规则；无结果时保留空卡片，不显示额外文案。

## Behavior and Interfaces（行为与接口）

### 查询参数与筛选

| 参数 | 当前语义及迁移约定 |
| --- | --- |
| 无有效筛选参数 | 展示传入的全部文章 |
| 一个或多个 `tag` | 文章任一标签与任一参数值完全匹配即可；多个标签是 OR |
| 一个或多个 `category` | 分类与任一参数值完全匹配即可；多个分类是 OR |
| 同时提供标签与分类 | 标签条件与分类条件均需满足，即条件组之间是 AND |
| `uncategorized` | 第一个参数值非空时，再筛选分类为空字符串、null 或 undefined 的文章 |
| 未知标签或分类 | 返回相应空结果，不抛出异常 |
| 其他参数、URL hash | 不参与筛选 |

- 保留现有大小写和空格的精确匹配规则，不引入隐式 trim、大小写折叠或新的分类归一化。
- 按 `URLSearchParams.getAll()` 和 `get()` 的现有行为处理重复及空参数；不把空参数自动删除。`tag=` 仍是一个空标签条件，`category=` 按当前分类存在性判断筛选。
- 当前 `uncategorized=false`、`uncategorized=0` 等非空字符串也会启用未分类筛选；本轮保持兼容，不将其改成布尔解析。空值 `uncategorized=` 不启用该条件。
- 标签、分类和未分类条件按现有组合语义叠加；条件冲突时展示空结果。
- URL 筛选值只参与数据匹配，不用于未转义的 HTML 输出。

### 数据与展示

- Astro 继续传入仅包含 `slug` 与 `data` 的 `sortedPosts`，不把正文引入归档客户端数据。
- 归档消费标题、标签数组、可空分类和 `published: Date`；日期经 Astro 向 Vue 传递后保持可正确读取年份、月份及日期。
- 不改变内容 schema、草稿规则、博客／学习栏目范围、文章排序及同日期文章的既有顺序。
- 每个年份标题显示对应筛选结果的文章数量，沿用单数／复数国际化键；空结果不生成空年份组。
- 文章链接通过 `getPostUrlBySlug()` 生成，保留标题的可访问名称及标签文字。
- 保留手机布局、桌面标签列、标题省略、悬停反馈、卡片间距、明暗主题及现有键盘链接操作。

### Astro 与 Vue 接入

- 归档页改为挂载 `ArchivePanel.vue`，使用 `client:only="vue"`，传入相同文章数据；本轮不增加 SSR 归档内容。
- 查询参数读取位于客户端生命周期，服务端模块导入不访问浏览器对象。
- 同一归档路径的不同筛选 URL、从其他页面进入归档、前进和后退，都以本次导航的 URL 得到正确结果，不能残留上一轮筛选。
- 若为导航同步增加监听，组件卸载时清理；不能因反复进入归档累积监听或重复列表。
- 保留页面外壳、Swup 替换容器和始终存在的 `#toc`；主题、音乐及背景等常驻组件继续工作。

## Tech Stack（技术栈）

以当前 package.json 和锁文件为准：Astro `5.13.10`、Vue `^3.5.42`、`@astrojs/vue 5.1.4`、`vue-tsc 3.3.13`、TypeScript `^5.9.3`、Tailwind CSS `^3.4.19`、Biome `2.2.5`、`@swup/astro ^1.7.0`，包管理器为 `pnpm@9.14.4`。

已有 Vue 模板严格检查和 CI 接入，本模块预期不新增运行时依赖或测试框架。

## Commands（命令）

在仓库根目录使用 PowerShell 7：

```powershell
pnpm dev --host 127.0.0.1
pnpm check
pnpm check:vue
pnpm type-check
pnpm build
pnpm preview --host 127.0.0.1
git diff --check
```

组件创建后针对本次实际变更格式化与只读检查，例如：

```powershell
pnpm exec biome format --write src/components/ArchivePanel.vue src/pages/archive.astro
pnpm exec biome ci src/components/ArchivePanel.vue src/pages/archive.astro
```

另行检查 Vue、Astro 模板格式；已有 TypeScript 声明错误按实施前基线比较。本轮只写规格，不运行归档迁移测试或更改应用。

## Project Structure（项目结构）

| 路径 | 职责 |
| --- | --- |
| `docs/sdd/astro-vue-components/capability-map.md` | 模块边界、顺序与文档索引 |
| `docs/sdd/vue-archive-panel/spec.md` | 本规格及审核状态 |
| 同目录 `plan.md` | 技术计划及后续实施、验证记录；不另建 todo.md |
| `src/components/ArchivePanel.svelte` | 当前实现及行为基线，Vue 接入验证后替换 |
| `src/components/ArchivePanel.vue` | 目标归档组件 |
| `src/pages/archive.astro` | 数据获取与 Vue 客户端接入 |
| `src/utils/content-utils.ts`、`url-utils.ts` | 复用的数据与链接接口 |
| `src/i18n/` | 复用年份计数及相关翻译 |
| `tsconfig.vue.json`、现有 CI | 已有 Vue 检查能力 |
| `scripts/tests/` | 可复用的正式浏览器验证脚本 |
| `tmp/vue-archive-panel/` | 临时数据、runner、日志及浏览器证据，不提交 |

## Code Style（代码风格）

沿用制表符、双引号、分号、路径别名及 Vue Composition API。使用明确的 props 和派生列表类型，复用内容类型；避免复制文章查询逻辑或引入全局 store。

当前日期显示逻辑的命名与格式示例：

```typescript
function formatDate(date: Date) {
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${month}-${day}`;
}
```

模板保留现有 CSS 类和变量，内部 URL 使用既有工具；只格式化实际修改的文件。

## Testing Strategy（验证策略）

- 实施前记录当前归档的文章标题、URL、年份、计数和日期，迁移后逐项比较，不只检查链接数量大于零。
- 覆盖无筛选、单标签、多标签、单分类、多分类、标签与分类交集、未分类、冲突组合、未知值、空值、重复参数、中文编码及大小写差异。
- 当前内容没有覆盖的未分类与空输入场景使用临时测试数据；不为测试修改正式文章。测试接入方式在技术计划中确定。
- 验证 `Date` 传递和显示，以及年份降序、年内顺序、草稿和两个内容栏目的范围；生产结果以构建预览为准。
- 桌面 `1440×900`、手机 `390×844`、`767/768px`，检查两种主题下的时间线、标签列、截断和链接焦点。
- 同时验证直接打开筛选 URL、刷新、Swup 从分类／标签链接进入归档、同路径不同查询跳转、前进后退与连续导航；主题模式保持一致。
- 运行变更文件格式检查、`pnpm check`、`pnpm check:vue`、类型基线比较与 `pnpm build`；回归已迁移的主题组件和仍使用 Svelte 的搜索。
- 优先复用可用 Playwright 或已有运行时，不新增浏览器测试框架；正式脚本进入 `scripts/tests/`，临时脚本和测试数据放入本任务 `tmp/`。
- 截图、trace 和 JSON 报告保存至 `tmp/vue-archive-panel/playwright/`，记录控制台与失败请求；按元素、URL 或事件等待，不使用固定长时间等待。
- 不设覆盖率数字，以筛选矩阵与导航行为为验收依据，未验证项如实记录；关闭本次启动的服务和浏览器。

## Boundaries（边界）

- **Always：** 保留用户及前序模块改动；先查 CodeGraph；使用 pnpm 与 PowerShell 7；保持数据、筛选、URL 与视觉兼容；先查格式再运行；基线失败与新增失败分开报告。
- **Ask first：** 改变筛选语义、布尔解析、内容 schema 或草稿规则；新增空结果文案或筛选控件；改为服务端渲染；增加依赖；扩展到搜索迁移或部署变更。
- **Never：** 修改正式文章来制造测试数据；把正文打包进归档列表；提前移除搜索所需的 Svelte 集成；破坏主题、音乐和背景的常驻状态；移除 `#toc`；编辑 `dist/`；覆盖用户文件；未经请求提交、推送或部署。

## Success Criteria（验收标准）

1. 归档页使用 `ArchivePanel.vue` 和 `client:only="vue"`，旧归档组件引用清除；主题 Vue 入口及 Svelte 搜索继续正常工作。
2. 查询参数矩阵的文章集合、年份分组和计数与当前实现一致，包括重复、空值、未知值和未分类组合。
3. 年份、年内文章顺序、MM-DD 日期、标签、标题与 URL 保持一致，Astro 传递的日期数据可正确使用。
4. 生产模式不展示草稿，归档继续覆盖博客和学习记录；空结果维持当前空卡片表现。
5. 直达、刷新、Swup、同路径不同查询及前进后退得到当前 URL 的结果，无重复列表、旧筛选残留或监听累积。
6. 桌面与手机、明暗主题及断点布局保持兼容，文章链接可通过键盘操作，标题可访问名称正确。
7. 静态检查、Vue 检查、构建和浏览器验证有对应证据；原类型检查不新增诊断，运行时问题和限制单独记录。

## Open Questions（待解决事项）

需求无阻塞问题，本规格已获用户确认。临时测试数据的接入及导航同步方式记录在同目录技术计划中，待审核；本模块业务代码尚未修改。
