# Spec：主题切换组件迁移至 Vue

状态：已批准、已实现（2026-10-12）。规格、计划和任务清单经用户确认后实施；验证与限制见 [todo.md](./todo.md) 的执行记录。

模块 id：`vue-theme-switch`。范围与顺序来自已批准的 [能力图](../astro-vue-components/capability-map.md)。

## Assumptions（范围假设）

- 本模块将现有主题切换组件迁移为 Vue，保留按钮位置、外观、三种模式及现有切换顺序。
- 复用已实现的主题工具、首屏初始化、翻译和样式规则；现有行为以当前源码为准，旧亮色模式规格的历史“当前基础”不作为运行现状。
- 用户主题及其他设置继续兼容，不引入新的主题存储格式。
- 搜索与归档在本模块期间继续使用 Svelte；三个模块全部完成后再清理 Svelte 构建链。
- 允许在后续批准的技术计划中加入必要的 Vue 类型检查及对应最小配置；不扩大到测试框架或部署架构改造。

## Objective（目标）

将 `LightDarkSwitch.svelte` 替换为 `LightDarkSwitch.vue`，接入现有 Astro 导航栏，使博客访客仍能通过右上角按钮选择亮色、暗色和跟随系统。

成功表现为：当前页面、刷新、直接访问、Swup 跳转及前进后退后的主题和按钮状态一致；系统外观变化按模式正确生效；现有设置、装饰和内容功能保持兼容。

本模块独立交付主题切换能力；搜索和归档的迁移规格由其对应模块维护。

## Current State（迁移前基础）

本节保留实施前的行为基线；当前入口已替换为 `LightDarkSwitch.vue`。

- `Navbar.astro` 已通过 `client:load` 挂载 `LightDarkSwitch.svelte`，并传入 `light`、`dark`、`auto` 三个 Astro Icon 具名内容。
- 当前组件初始化前禁用按钮，挂载后读取主题偏好，并监听系统外观；卸载时移除系统监听。
- `constants.ts` 定义 `light`、`dark`、`auto`，默认值为 `auto`；切换循环是 `light → dark → auto → light`。
- `setting-utils.ts` 优先从 `<html data-theme-mode>` 读取会话选择，再读取 `localStorage.theme`；无效值及读取失败回退为 `auto`。
- `setTheme()` 先应用页面主题，再尝试写入存储；写入失败保留当前会话选择。
- `applyThemeToDocument()` 更新 `.dark`、`data-theme-mode`、代码块主题属性，并派发 `execute233:theme-change`。
- `Layout.astro` 已负责首次绘制前的主题初始化。主题图标显示由 `rose-navigation.css` 中根元素的 `data-theme-mode` 选择器控制。

## Behavior and Interfaces（行为与接口）

### 模式与交互

| 保存的选择 | 系统外观 | 页面实际外观 | 按钮所表示的模式 |
| --- | --- | --- | --- |
| 无记录、非法值、读取失败或 `auto` | 亮色 | 亮色 | 跟随系统 |
| 无记录、非法值、读取失败或 `auto` | 暗色 | 暗色 | 跟随系统 |
| `light` | 任意 | 亮色 | 亮色 |
| `dark` | 任意 | 暗色 | 暗色 |

- 保持当前循环顺序；无记录时从 `auto` 开始，首次操作进入 `light`。
- 桌面与手机均保持独立主题按钮。使用原生按钮，支持 Tab 聚焦、Enter 与 Space 操作。
- 保留当前模式到下一模式的国际化标签及提示；`auto` 不因实际外观为暗色而显示成手动暗色。
- 客户端接管完成前保持禁用状态；接管后读取首屏已确定的会话选择，避免默认 Vue 状态覆盖页面主题。
- 系统外观变化仅在当前选择为 `auto` 时更新页面；不将系统解析出的亮暗外观写为手动偏好。

### Astro 与 Vue 的边界

- Astro 负责挂载组件，并通过 `light`、`dark`、`auto` 三个具名插槽提供现有图标；组件不要求新增业务 props。
- 保留 `client:load`、按钮 `id="scheme-switch"`、`data-mode`、主题图标类名及必要的既有样式类，保证样式和外部引用兼容。
- Vue 负责组件显示状态、操作和监听生命周期；主题应用、偏好读取及保存通过现有主题工具完成。
- 继续使用 `LIGHT_DARK_MODE`、主题常量和现有 I18nKey；不复制一套主题判定或硬编码模式名称。
- 服务端渲染阶段不执行依赖 `window`、`document`、`localStorage` 或 `matchMedia` 的浏览器逻辑。

### 导航、存储与联动

- 刷新与直接访问保留合法旧主题记录；没有合法记录时沿用默认跟随系统。
- 存储拒绝读取或写入时，生产页面仍能加载并完成主题切换；Swup 导航和前进后退保留当前会话选择。写入失败时，完整刷新后的回退遵循既有规则。
- Swup 导航后按钮与页面实际状态一致。系统监听不会随每次跳转累积，组件卸载时释放自身监听。
- 继续通过现有主题变化通知联动背景与星空，保留分模式背景、共用色相、暂停和减少动态效果行为。
- 切换主题不重置音乐播放进度、曲目、音量、光标或背景参数；代码块继续采用现有独立深色主题。

## Tech Stack（技术栈）

声明版本以当前 `package.json` 为依据，安装版本以锁文件为准：Astro `5.13.10`、Vue `^3.5.42`、`@astrojs/vue 5.1.4`、`vue-tsc 3.3.13`、TypeScript `^5.9.3`、Tailwind CSS `^3.4.19`、Biome `2.2.5`、`@swup/astro ^1.7.0`；包管理器为 `pnpm@9.14.4`。

Vue 集成已经启用，Tailwind 扫描范围包含 `.vue`；已补齐 `pnpm check:vue`，通过独立严格配置检查 Vue 单文件组件。Vue 集成版本兼容性校正在技术计划中记录。

## Commands（命令）

在仓库根目录使用 PowerShell 7 执行现有命令：

```powershell
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1
pnpm check
pnpm check:vue
pnpm type-check
pnpm build
pnpm preview --host 127.0.0.1
git diff --check
```

组件创建后，针对本模块实际变更文件格式化与只读检查，例如：

```powershell
pnpm exec biome format --write src/components/LightDarkSwitch.vue src/components/Navbar.astro
pnpm exec biome ci src/components/LightDarkSwitch.vue src/components/Navbar.astro
```

Biome 未覆盖的 Vue、Astro 模板及 CSS 另行检查格式。现有 `pnpm type-check` 用于 TypeScript 基线，不能代替专门的 Vue 单文件组件检查；已配置的 `pnpm check:vue` 检查组件与模板。

以上应用命令已在实施阶段按范围验证；具体结果与既有失败见 todo.md。

## Project Structure（项目结构）

| 路径 | 职责 |
| --- | --- |
| `docs/sdd/astro-vue-components/capability-map.md` | 已批准模块划分与文档索引 |
| `docs/sdd/vue-theme-switch/spec.md` | 本规格与审核状态 |
| `docs/sdd/vue-theme-switch/plan.md`、`todo.md` | 后续阶段创建的技术计划与任务记录 |
| `src/components/LightDarkSwitch.svelte` | 当前组件与迁移行为基线；接入 Vue 并验证后替换 |
| `src/components/LightDarkSwitch.vue` | 目标 Vue 组件 |
| `src/components/Navbar.astro` | 组件接入与图标具名插槽 |
| `src/utils/setting-utils.ts`、`src/constants/constants.ts`、`src/types/config.ts` | 复用的主题接口、常量和类型 |
| `src/layouts/Layout.astro`、`src/styles/rose-navigation.css` | 既有首屏初始化和主题按钮样式 |
| `src/i18n/` | 复用的模式名称和翻译 |
| `scripts/tests/` | 可复用的正式浏览器验证脚本；保留已有脚本 |
| `tmp/vue-theme-switch/` | 本模块临时脚本、日志和浏览器产物，不提交 |

此表描述职责，不要求修改全部列出的文件；检查配置的最终文件范围在技术计划中确定。

## Code Style（代码风格）

沿用制表符缩进、双引号、分号、路径别名及目标文件既有格式；Vue 组件使用 TypeScript 和 Composition API。复用现有主题类型及 CSS 变量。

以下为当前主题工具的真实风格示例，也是存储失败行为的接口基线：

```typescript
export function setTheme(theme: LIGHT_DARK_MODE): void {
	applyThemeToDocument(theme);
	try {
		localStorage.setItem("theme", theme);
	} catch {
		// The DOM keeps the current session's choice when storage is unavailable.
	}
}
```

只格式化本次修改的文件，另行检查 Vue 与 Astro 模板区域；保留现有国际化和图标体系。

## Testing Strategy（验证策略）

- 实施前记录当前工作区的检查基线及按钮表现；已有 `light-mode/todo.md` 记录了历史 TypeScript 声明错误，实际基线需重新确认。报告既有问题与迁移新增问题，不将历史结果当作本次结果。
- 静态检查覆盖变更文件格式、Astro 类型、专门的 Vue 组件类型检查及现有 TypeScript 检查。迁移不能新增类型错误。
- 运行 `pnpm build` 验证 Vue 服务端渲染、静态页面与 Pagefind 构建，通过构建预览检查生产行为。
- 优先使用已有浏览器或 Playwright 运行时，实施时重新确认可用性；项目未声明 Playwright，不假定 `pnpm exec playwright` 可运行，不新增测试框架。
- 主题矩阵覆盖无记录、非法值、`light`、`dark`、`auto`、存储读失败和写失败；每种模式核验系统亮暗变化、按钮模式和实际外观。
- 桌面 `1440×900`、手机 `390×844`，补查 `767/768px`、`800/801px`，检查按钮尺寸、图标、提示、焦点及导航栏重叠。
- 覆盖首页、博客列表、学习列表、归档、关于、工具及包含代码块的代表性文章；验证直达、刷新、Swup 跳转、前进后退和键盘操作。
- 连续完成至少 10 次站内跳转后再次验证切换与系统外观变化；确认每次操作仅推进一个模式，且组件自身的主题监听数量没有增长。
- 检查自定义背景、色相、动画暂停、减少动态效果及音乐状态兼容。搜索和归档在本模块期间做现有功能回归，真实搜索在构建预览验证。
- 截图、trace 和浏览器日志保存至 `tmp/vue-theme-switch/playwright/`，临时运行脚本与日志分别放入该任务的 `scripts/`、`logs/`；工具不支持自定义路径时记录实际位置。
- 不设覆盖率数字，以本规格行为矩阵为验收依据；未执行项明确标为未验证。关闭本次启动的服务与浏览器，不结束无关进程。

## Boundaries（边界）

- **Always：** 保留已有未提交改动；先用 CodeGraph 理解相关代码；使用 PowerShell 7 与 pnpm；复用现有主题接口与存储键；针对改动文件格式化并只读检查后再运行验证；如实记录基线和验收结果。
- **Ask first：** 改变三模式语义或切换顺序、重设计外观、修改存储格式、扩大到搜索或归档迁移、增加非必要依赖或测试框架、改变部署架构。必要的 Vue 检查配置在技术计划中列出并随计划审核，获批后按计划执行。
- **Never：** 覆盖合法旧偏好；删除用户设置；建立第二套主题判定；提前移除仍被搜索和归档使用的 Svelte 集成；直接编辑 `dist/` 或依赖目录；全量格式化无关文件；清理整个 `tmp/`；移除 Swup 必需的 `#toc`；未经请求提交、推送或部署。

## Success Criteria（验收标准）

1. 导航栏使用 `LightDarkSwitch.vue`，本主题组件无 Svelte 引用；搜索和归档仍能正常使用现有 Svelte 实现。
2. 三种模式、循环顺序、默认选择、图标和国际化提示符合行为矩阵；按钮在桌面和手机可用，键盘操作及焦点反馈正常。
3. 首屏既有主题与 Vue 接管后的状态一致，未出现迁移引入的整页主题闪变或模式覆盖。
4. 合法旧记录保留；无记录、非法记录及存储读写失败处理符合接口约定，生产页面无相关未捕获异常。
5. 系统外观变化只更新 `auto` 模式，手动模式不变；直接访问、刷新、Swup、前进后退的表现符合存储与会话边界。
6. 连续导航后模式切换正确，监听不累积；组件卸载时清理自身监听，服务端渲染不访问浏览器对象。
7. 自定义背景、色相、星空、暂停、减少动态效果、光标、音乐状态及代码块配色完成兼容回归。
8. 格式检查、Astro 检查、Vue 组件类型检查、构建和浏览器矩阵有可检查结果；未新增类型错误，既有失败及未验证项单独报告。

## Open Questions（待解决事项）

需求无阻塞问题，用户已审核本规格、技术计划和任务清单；本模块已实施。远程 CI 矩阵、物理音频输出及光标参数穷举的验证边界见 todo.md。

代码和验收记录保留在工作区，未自动提交或部署。
