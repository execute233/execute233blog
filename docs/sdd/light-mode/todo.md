# Tasks：粉白亮色模式

状态：计划及任务已批准（2026-10-09），已实施并完成下述验证。需求来源：[spec.md](spec.md)。

## T1：统一主题解析及首屏状态

- [x] 实施 T1。
- 验收：无记录或非法值默认 `auto`，合法偏好保留；首屏与运行时实际主题一致；存储失败不影响会话切换。
- 验证：针对变更文件格式检查、`pnpm check`；浏览器检查存储矩阵与直接访问首屏。
- 依赖：无。
- 文件：`src/constants/constants.ts`、`src/utils/setting-utils.ts`、`src/layouts/Layout.astro`。
- 范围：中，3 个文件。

## T2：右上角按钮跑通三态切换

- [x] 实施 T2。
- 验收：搜索与设置之间显示图标按钮，桌面和手机可用；鼠标、Enter、Space 循环三种模式；系统变化仅更新 `auto`，基本页面亮暗配色生效。
- 验证：针对变更文件格式检查、`pnpm check`；浏览器检查刷新、系统变化、小屏幕空间与键盘操作。
- 依赖：T1。
- 文件：`src/components/Navbar.astro`、`src/components/LightDarkSwitch.svelte`、`src/styles/theme-tokens.css`、`src/styles/rose-navigation.css`。
- 范围：中，4 个文件。先复用已有翻译键；如确需新键，追加独立翻译子任务，全部语言完成后才能勾选此项。

### Checkpoint：主题切换可用

- [x] T1、T2 通过静态检查及可执行的行为验证；无错误主题回退或重复监听。
- [x] 记录浏览器可用性；使用环境已有 Playwright 与无头 Edge 完成验证。

## T3：背景分模式编辑及旧值兼容

- [x] 实施 T3。
- 验收：亮暗默认背景正确，旧合法背景仅迁移到暗色；编辑当前实际主题并独立保存；恢复当前主题默认不影响另一背景和模式选择。
- 验证：针对变更文件格式检查、`pnpm check`、必要的 `pnpm type-check`；浏览器检查 v1、v2、部分无效字段、刷新、切换和重置。
- 依赖：T2。
- 文件：`src/data/appearance.ts`、`src/scripts/appearance.ts`、`src/components/AppearanceSettings.astro`、`src/layouts/Layout.astro`。
- 范围：中，4 个文件。

## T4：首页与卡片亮色适配

- [x] 实施 T4。
- 验收：首页、关于和工具卡片显示浅底深字；标签、阴影、边框和焦点符合粉白视觉方向；普通文字对比度达标且暗色外观保留。
- 验证：针对变更文件格式检查、`pnpm check`；桌面及手机截图，计算实际合成背景下的代表性文字对比度。
- 依赖：T3。
- 文件：`src/styles/card.css`、`src/styles/rose-home.css`、`src/components/ProfileInterests.astro`、`src/pages/about.astro`、`src/components/ToolCard.astro`。
- 范围：中，最多 5 个文件；优先只修改确有配色问题的文件。

### Checkpoint：背景兼容与首页可读

- [x] T3、T4 通过存储和视觉检查，旧偏好未丢失。
- [x] 首屏背景与编辑器显示一致，切换模式不重置无关设置。

## T5：导航及浮层亮色适配

- [x] 实施 T5。
- 验收：顶栏、导航轨道、页脚、搜索和设置在亮色下可读；选中、悬停与键盘焦点可辨；断点布局保持可用。
- 验证：针对变更文件格式检查、`pnpm check`；生产构建预览的真实搜索及菜单操作，补查 `767/768px`、`800/801px`。
- 依赖：T3。
- 文件：`src/styles/rose-navigation.css`、`src/styles/rose-footer.css`、`src/components/Search.svelte`、`src/components/BackgroundSettings.astro`、`src/components/widget/NavMenuPanel.astro`。
- 范围：中，最多 5 个文件。

## T6：阅读与归档亮色适配

- [x] 实施 T6。
- 验收：列表、文章、目录和归档亮色可读；表格、提示块、公式和行内代码无白字浅底问题；深色代码块及复制按钮继续可用。
- 验证：针对变更文件格式检查、`pnpm check`；代表性长文、归档筛选、目录和代码复制，检查直接访问与 Swup 导航。
- 依赖：T3。
- 文件：`src/styles/rose-theme.css`、`src/styles/markdown.css`、`src/styles/markdown-extend.styl`、`src/components/ArchivePanel.svelte`、`src/components/widget/TOC.astro`。
- 范围：中，最多 5 个文件；若其他阅读组件有问题，拆出新的小任务。

### Checkpoint：全站内容与导航

- [x] T5、T6 通过检查，构建预览的搜索、归档、目录和页面跳转正常。
- [x] 记录各页亮暗表现及尚需修复的配色，未发现状态回退。

## T7：浅底弱化星空

- [x] 实施 T7。
- 验收：亮色星点淡而可见，正文区域更弱；切换主题及暂停状态可重绘正确材质；只看星空不修改主题偏好或用户参数。
- 验证：针对变更文件格式检查、`pnpm check`；桌面和手机亮暗、暂停后切换、预览及退出，确认单一绘制循环。
- 依赖：T3。
- 文件：`src/components/GalaxyBackground.astro`、`src/scripts/galaxy.ts`、`src/styles/rose-theme.css`。
- 范围：中，3 个文件。

## T8：樱花与光标主题回归

- [x] 实施 T8。
- 验收：浅底樱花与光标可见；保留自定义颜色、点击和链接反馈；减少动态效果、暂停和后台状态符合原行为。
- 验证：针对变更文件格式检查、`pnpm check`；亮暗切换、键盘与指针操作、减少动态效果及后台恢复。
- 依赖：T7。
- 文件：`src/scripts/sakura.ts`、`src/scripts/cursor.ts`、`src/components/CursorSettings.astro`、`src/styles/cursor.css`。
- 范围：中，最多 4 个文件；实际文件名与职责在实施前通过 CodeGraph 确认，无问题时仅记录回归证据。

### Checkpoint：装饰回归

- [x] T7、T8 通过浅底可见性及动画状态检查。
- [x] 星空、樱花和光标通过切换回归；主题代码不重置音乐状态，未做实际音频输出测试。

## T9：完整验收与维护说明

- [x] 完成 T9。
- 验收：规格的页面、存储、主题、导航和无障碍矩阵有结果；检查与构建通过；维护说明准确记录入口、默认模式和背景迁移，未验证项如实列出。
- 验证：针对本次变更文件的 Biome 只读检查、`git diff --check`、`pnpm check`、必要的 `pnpm type-check`、`pnpm build`；构建预览与截图证据写入 `tmp/light-mode/`。
- 依赖：T4、T5、T6、T8。
- 文件：`docs/rose-theme.md`、`docs/sdd/light-mode/todo.md`，以及 `tmp/light-mode/` 下不提交的验证证据。
- 范围：小，2 个正式文档；若验收发现代码问题，回到对应任务修复，不在此任务堆积跨模块变更。

### Checkpoint：完成审核

- [x] 已完成记录中的浏览器验收；既有类型错误及测试边界见下文。
- [x] 代码审核完成，测试和构建结论准确；本次浏览器及调试服务已关闭，未影响已有无关进程。
- [x] 汇报修改、验证和证据路径；未提交或推送代码、规格及计划文件。

## 验证记录

- Biome、`git diff --check`、`pnpm check`、`pnpm build` 通过，Pagefind 索引成功生成。`pnpm type-check` 仍有 10 项既有声明错误；与原提交的 12 项相比未新增，基线记录在 `tmp/light-mode/logs/type-baseline.json`。
- 生产浏览器检查覆盖 18 个亮暗页面组合、20 个视口组合、真实搜索、Swup 跳转与前进后退、监听数量、暂停重绘和星空预览；运行时错误与本地失败请求均为 0，抽样正文、辅助文字和按钮最低对比度约 6.02:1。
- 主题矩阵、系统外观变化、手机键盘操作、刷新、首屏未接管状态、v1/v2 迁移、非法值、独立背景编辑与重置、存储完全禁用下的导航均通过；归档分类与标签筛选、目录、复制事件、光标交互和减少动态效果通过。
- 新按钮使用 Svelte 5 snippet 与 Astro 的命名内容桥接，消除了新增的旧插槽语法警告。阅读页补充调整 `License.astro` 标签配色；窄屏收窄折叠音乐胶囊，修复新增按钮造成的重叠。
- 使用环境已有 Playwright 和无头 Edge，无新增项目依赖；截图、JSON 与临时脚本位于 `tmp/light-mode/`。浏览器临时用户目录由 Playwright 在 Windows 临时目录管理并随关闭清理。
- 复制验证通过替换剪贴板写入函数记录文本，不改写用户系统剪贴板；音乐未做实际音频输出测试。开发工具栏在禁用存储时的异常属于 Astro 开发环境；生产预览相同场景无异常。
