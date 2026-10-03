# AGENTS.md

本文件为在此仓库工作的 AI 编程助手提供项目说明与操作约定。

## 项目概览

本项目是基于 **Fuwari** 的静态博客，使用 **Astro 5**、**Tailwind CSS** 和 **Svelte 5**（交互组件）。站点设置位于 `src/config.ts`，请以当前配置为准。构建产物位于 `dist/`，采用静态部署，仓库包含 Vercel 配置。

**仅使用 pnpm**，版本由 `package.json` 中的 `packageManager` 指定（`pnpm@9.14.4`）。`preinstall` 钩子通过 `npx only-allow pnpm` 拒绝 npm/yarn 安装。

## Windows 命令约定

本机运行 Windows，执行命令时遵循以下规则：

- 使用 PowerShell 7（`pwsh`），不要调用 `cmd.exe`、`cmd` 或 `cmd.exe /c` 执行常规命令。
- 当前 shell 已经是 PowerShell 时，不要再套一层 `pwsh -Command`。
- 优先直接调用 `rg`、`git`、`python`、`pnpm` 等可执行程序；`.cmd`、`.bat` 文件也直接从 PowerShell 调用。
- 包含空格、中文或特殊字符的路径、搜索模式使用 PowerShell 单引号。
- 避免嵌套 shell 引号；复杂命令可写入 `tmp/` 下的临时 `.ps1` 脚本后执行。
- 删除或移动目录前核实完整路径，只处理本次任务产生的文件，不清理他人正在使用的临时文件。

## 常用命令

以下命令均在仓库根目录执行：

| 命令 | 用途 |
|---|---|
| `pnpm install --frozen-lockfile` | 按锁文件安装依赖 |
| `pnpm dev` | 启动开发服务器，默认地址为 `http://localhost:4321`，实际端口以终端输出为准 |
| `pnpm check` / `pnpm astro check` | 检查类型、内容及 schema，不生成构建产物 |
| `pnpm type-check` | 执行 `tsc --noEmit --isolatedDeclarations` |
| `pnpm build` | 执行 `astro build && pagefind --site dist`，先构建页面，再生成搜索索引 |
| `pnpm preview` | 在本地预览已构建的 `dist/` |
| `pnpm new-post <filename>` | 在 `src/content/posts/` 下创建文章 |
| `pnpm format` | 执行 `biome format --write ./src`，会修改源文件 |
| `pnpm lint` | 执行 `biome check --write ./src`，会修改源文件 |
| `pnpm exec biome ci ./src` | 执行不写入文件的 Biome 检查 |

修改后按影响范围执行检查。代码与内容变更通常使用 `pnpm check`，涉及构建、静态路由或搜索时执行 `pnpm build`。纯文档变更检查内容与差异即可，无需启动应用或运行完整构建。CI 的实际命令和 Node 版本以 `.github/workflows/` 为准。

## 临时文件与调试缓存

**调试脚本、临时文件和可配置输出位置的调试缓存统一优先放在当前项目根目录的 `tmp/` 下**，即本仓库的 `E:\projs\web\execute233blog\tmp`。在其他机器上以仓库实际路径为准，不硬编码此绝对路径。

- 目录不存在时按需创建：`New-Item -ItemType Directory -Force -Path 'tmp'`。
- 按任务划分子目录，例如 `tmp/<任务名>/`，避免多次调试相互覆盖。
- 日志可放在 `tmp/<任务名>/logs/`，临时脚本放在 `tmp/<任务名>/scripts/`，浏览器产物放在 `tmp/<任务名>/playwright/`。
- Playwright 截图、录像、trace、HTML 报告、测试结果及临时浏览器配置目录均优先写入上述目录；调用工具时显式指定其支持的输出路径。
- 工具固定生成的目录（例如 `.astro/`、`node_modules/`）保持默认位置，无需为此迁移。工具不支持自定义输出路径时使用其默认位置，并在汇报中说明实际产物路径。
- `tmp/` 为本地临时目录，不提交到 Git；可复用的正式测试、脚本和文档应进入对应的项目目录。
- 调试完成后关闭本次启动的浏览器与服务进程，按需保留排查证据，不删除整个 `tmp/` 或其他任务的文件。

## 浏览器与 Playwright 调试

涉及页面样式、响应式布局、交互、导航或浏览器运行时问题时，使用可用的浏览器工具或 Playwright 验证实际页面表现。

当前 `package.json` 未声明 Playwright 依赖，也没有 Playwright 测试脚本。不要假定 `pnpm exec playwright` 可直接运行；先确认当前环境是否提供 Playwright 工具或运行时。一次性调试优先使用已有能力；需要引入正式端到端测试时，再通过 pnpm 添加依赖与配置。

建议流程：

1. 确认可用的本地服务；没有服务时启动 `pnpm dev --host 127.0.0.1`，根据终端输出访问实际端口。不要重复启动或结束已有的无关服务。
2. 按用户报告的操作复现问题，记录页面 URL、视口尺寸、操作步骤、控制台错误和失败的网络请求。
3. 使用稳定的角色、文本或测试标识定位元素，通过元素可见、URL 变化等条件等待页面就绪，避免固定长时间等待。
4. 修复后重复原复现步骤，并按影响范围检查桌面与移动端、明暗主题、菜单、目录、归档筛选等行为。
5. 导航相关修改同时验证直接打开页面与 Swup 站内跳转；必要时检查前进、后退，确认事件监听没有重复绑定。
6. 验证真实搜索时先运行 `pnpm build`，再运行 `pnpm preview --host 127.0.0.1`。开发模式的搜索是假数据，不能用来验证 Pagefind 索引。
7. 将截图、trace 等证据保存到 `tmp/<任务名>/playwright/`，汇报验证结果、尚未验证的部分及关键产物路径。无法执行浏览器验证时说明原因，不把静态检查表述为浏览器测试通过。

使用 Playwright API 时，截图的 `path`、`context.tracing.stop({ path })`、`recordVideo.dir` 等输出参数应指向上述临时目录。使用 Playwright Test 时，设置 `outputDir` 和 HTML reporter 的 `outputFolder`；浏览器下载缓存仅在确有需要时通过 `PLAYWRIGHT_BROWSERS_PATH` 指向 `tmp/`，安装与运行须使用一致的设置。

## 项目架构

### 站点配置

全站配置集中在 **`src/config.ts`**，类型定义位于 `src/types/config.ts`，包括标题、语言、主题色相、横幅、目录、导航、个人资料和许可证。通过 `@/config` 引用。

`src/layouts/Layout.astro` 将主题 `hue` 导出为全局 CSS 变量 `--hue`，配色由其派生。明暗模式通过 `<html>` 上的 `.dark` 类切换，对应 `tailwind.config.cjs` 的 `darkMode: "class"`。`ConfigCarrier.astro` 将色相同步到 DOM 属性，供 `src/utils/setting-utils.ts` 读取默认值。

### 内容模型

`src/content/config.ts` 定义带 frontmatter 校验的 **`posts`** 集合和较宽松的 **`spec`** 集合。文章位于 `src/content/posts/<slug>.md`。

- `section` 默认为 `blog`；设为 `learning` 后进入学习记录列表。两个栏目均复用文章详情页，内容维护说明见 `docs/content-editing.md`。
- frontmatter 包含 `title`、`published`，以及可选的 `description`、`image`、`tags`、`category`、`draft`、`lang`、`updated`。
- `prevSlug`、`prevTitle`、`nextSlug`、`nextTitle` 在查询时自动填充，不应手写。
- `src/utils/content-utils.ts` 仅在 `import.meta.env.PROD` 为真时过滤 `draft: true`；开发模式可见草稿。
- `getSortedPosts()` 统一处理排序和前后文章关联，列表、归档与文章页共用该逻辑。
- 支持 `guide/index.md` 等子目录文章，URL 由 `src/utils/url-utils.ts` 的 `getPostUrlBySlug`、`getDir` 等函数处理。

### 静态路由与布局

- `src/pages/index.astro`：个人介绍与栏目入口首页。
- `src/pages/blog/[...page].astro`、`src/pages/learning/[...page].astro`：按 `section` 筛选的分页列表，共用 `ArticleList.astro`、`PostPage.astro` 和原有分页组件。旧的数字分页路径由 `src/pages/[...page].astro` 重定向。
- `src/pages/posts/[...slug].astro`：文章页，调用 `entry.render()`，输出 JSON-LD 和文章元数据。
- `src/pages/archive.astro`：将文章传给 `ArchivePanel.svelte`（`client:only="svelte"`），客户端通过查询参数筛选分类与标签。
- `src/pages/about.astro`：展示 `src/data/milestones.ts` 中的里程碑。
- `src/pages/tools.astro`：使用 `ToolCard.astro` 渲染 `src/data/tools.ts`。
- `src/pages/rss.xml.ts`、`src/pages/robots.txt.ts`：生成对应的静态端点。
- `Layout.astro`：负责页面外壳、head、SEO、主题初始化、滚动条和灯箱。
- `MainGridLayout.astro`：负责导航栏、横幅、响应式网格、侧栏、页脚和目录。

### 银河背景与设置

`GalaxyBackground.astro` 在 `Layout.astro` 中挂载 Canvas 和遮罩；`BackgroundSettings.astro` 在顶栏提供下拉面板。二者均位于 Swup 替换容器之外，`src/scripts/galaxy.ts` 只初始化一次。设置写入 `localStorage` 的 `execute233.background.v1`，只看星空为临时状态。首页分栏由 `MainGridLayout.astro` 根据 `[data-landing]` 内容标记调整。

### Swup 页面导航

`@swup/astro` 提供站内页面过渡，配置位于 `astro.config.mjs`，替换容器为 `containers: ["main", "#toc"]`。

- 客户端通过 `window.swup.hooks.on(...)` 处理主题重新初始化、滚动条绑定、目录与导航栏联动等逻辑。
- **DOM 中必须始终保留 `#toc` 容器**，以满足 Swup 替换要求。目录内容是否显示由 `siteConfig.toc.enable` 控制，修改时参考 `MainGridLayout.astro` 中的说明。

### Markdown 处理流程

`astro.config.mjs` 配置 `src/plugins/` 下的 remark/rehype 插件，在 GFM 基础上增加以下功能：

- `remark-reading-time`：生成 `minutes`、`words`，用于文章阅读信息。
- `remark-excerpt`：将首段写入 `excerpt`。
- `:::note`、`:::tip`、`:::important`、`:::caution`、`:::warning`：使用 GitLab 风格指令语法，可附加 `{name="..."}`，通过 `rehype-component-admonition.mjs` 渲染提示块。
- `:::github user/repo`：通过 `rehype-component-github-card.mjs` 渲染 GitHub 仓库卡片。
- `remark-math` 与 `rehype-katex`：渲染数学公式；`remark-sectionize`：按标题组织章节。
- `astro-expressive-code`：渲染代码块，样式使用博客 CSS 变量，并结合 `language-badge`、`custom-copy-button` 等自定义插件。

### 国际化

`src/i18n/` 根据 `siteConfig.lang` 映射到 `Translation`，所有文案以 `I18nKey` 枚举为键。`i18n(key)` 通过 `getTranslation()` 返回当前语言的文本。

新增文案时，在枚举和所有 `src/i18n/languages/*.ts` 文件中补齐对应键；新增语言时，还需在 `translation.ts` 的 `map` 中注册。导航预设 `link-presets.ts` 与归档页复用这些翻译。

### Pagefind 搜索

搜索索引**仅在构建时生成**：`pnpm build` 在 `astro build` 之后执行 `pagefind --site dist`。生产模式下 `Search.svelte` 调用 `window.pagefind.search()`；开发模式显示预设的模拟结果。

`pagefind.yml` 排除 KaTeX、`.search-panel` 和带有 `[data-pagefind-ignore]` 的内容。

### 图标

使用 `astro-icon` 与 Iconify 图标集（`fa6-brands/regular/solid`、`material-symbols`），在 `astro.config.mjs` 中配置。图标名例如 `material-symbols:notes-rounded`。新增图标集时执行 `pnpm add @iconify-json/<set>`，并在 `icon()` 集成中注册。

## 编码约定

- **路径别名**：优先使用 `@/`（映射至 `src/`）、`@components`、`@assets`、`@constants`、`@utils`、`@i18n`、`@layouts`。
- **内部 URL**：通过 `src/utils/url-utils.ts` 的 `url()` 生成链接，以兼容 `import.meta.env.BASE_URL` 子路径部署；`site` 和 `trailingSlash: "always"` 配置位于 `astro.config.mjs`。
- **样式**：使用 Tailwind 工具类和 `src/styles/` 中的 CSS 变量。新增颜色尽量由 `--hue` 派生，兼顾明暗模式，复用 `--primary`、`--card-bg` 等变量。
- **格式与检查**：新增及修改代码必须遵循项目当前格式，以 `biome.json` 和目标文件的既有风格为准，使用制表符缩进和双引号，保持换行、分号、导入顺序及多行属性排版一致。写入后先针对本次修改的文件运行格式化，再执行不写入文件的检查（例如 `pnpm exec biome format --write <文件路径...>`、`pnpm exec biome ci <文件路径...>`），确认通过后再进行实际运行或浏览器测试。不要用全量 `pnpm format` 或 `pnpm lint` 顺带修改无关文件。
- **格式检查覆盖范围**：当前 Biome 配置排除了 CSS；对于 CSS 以及工具未覆盖的 `.astro`、`.svelte` 模板区域，必须另行检查缩进、属性换行和排版，沿用项目已有格式或适用的格式化工具。不能仅凭 Biome 检查通过就认定这些区域的格式正确。
- **构建产物**：`dist/` 仅用于输出，不直接编辑。
- **已有改动**：开始修改前检查 Git 状态，保留用户已有的未提交改动，不随意覆盖或还原。

<!-- CODEGRAPH_START -->
## CodeGraph

如果仓库根目录存在 `.codegraph/`，在理解或定位代码时，**先使用 CodeGraph，再考虑文本搜索或直接读取源文件**：

- **MCP 工具**：优先使用 `codegraph_explore`，可返回相关符号源码与调用路径。查询中指定文件或符号可读取带行号的当前源码；工具需要延迟加载时，先通过工具搜索加载。
- **命令行**：执行 `codegraph explore '<符号名或问题>'` 获取相关信息。
- CodeGraph 不可用或结果不足时，再使用 `rg` 等工具补充检索，并说明限制。

根目录不存在 `.codegraph/` 时，跳过 CodeGraph；是否建立索引由用户决定。
<!-- CODEGRAPH_END -->
