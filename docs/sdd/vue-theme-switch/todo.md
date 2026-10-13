# Tasks：主题切换组件迁移至 Vue

状态：已批准、已实施（2026-10-12）。用户确认任务后进入 Implement，T1～T7 已完成；实际验证范围和限制见末尾记录。

模块 id：`vue-theme-switch`。依据已批准的 [规格](./spec.md) 和 [技术计划](./plan.md)，关联 [能力图](../astro-vue-components/capability-map.md)。

## 已批准范围

- [x] 模块边界与迁移顺序已确认。
- [x] 主题切换规格已确认。
- [x] 技术计划已确认。
- [x] 本任务清单已审核，允许进入 Implement 阶段。

## 执行规则

- 按依赖顺序单代理执行；每项只在验收和验证都有结果后标记完成。
- 统一更新本文件的执行状态与证据索引。下列文件范围不重复列出每项都会更新的本文件；每项连同状态记录仍控制在约 5 个正式文件内。
- 首先检查 Git 状态并保留用户已有修改，包括已暂存的 `src/scripts/color-setting.ts`、已有 `docs/sdd/light-mode/` 和 `scripts/tests/` 内容。
- 实施前先用 CodeGraph 确认当前源码，格式化只针对本次变更文件；模板、YAML 和工具未覆盖区域另行检查。格式检查完成后再进行实际运行与浏览器测试。
- 临时脚本、日志、截图和 trace 放在 `tmp/vue-theme-switch/`；不覆盖其他任务产物，不删除整个 `tmp/`。
- 已批准计划中的固定工具安装和最小 CI 接入随任务执行，不重复请求同一授权；遇到范围变化先更新对应文档。

## T1：建立迁移前检查与行为基线

- [x] 完成 T1。

**描述：** 在当前工作区记录源码、检查结果与主题按钮行为，为新增错误、视觉变化和存储兼容提供可比较基线。

**验收：**

- [x] 保存 Git 状态、Astro 检查结果及 TypeScript 声明诊断；既有类型错误按位置和内容记录。
- [x] 确认可用浏览器或已有 Playwright 运行时，以及需要使用的服务、实际端口和进程归属。
- [x] 保存桌面与手机的主题按钮基线，确认现有模式循环、图标、系统跟随、刷新和一次 Swup 导航的实际表现。

**验证：** `pnpm check`、`pnpm type-check`；当前生产行为基线需要时运行 `pnpm build` 与 `pnpm preview --host 127.0.0.1`。通过隔离浏览器上下文核查行为，不能直接复用历史通过结论。

**依赖：** 无。

**文件范围：** 本任务不修改业务文件；记录更新至本文件，日志与截图保存在 `tmp/vue-theme-switch/logs/`、`playwright/`。

**规模：** 小，1 个正式记录文件及临时证据。

## T2：接入 Vue 主题按钮

- [x] 完成 T2。

**描述：** 创建 Vue 组件并接入现有 Navbar，复用主题接口、国际化文案和 Astro 图标插槽，构成从用户操作到主题应用的完整路径。

**验收：**

- [x] Navbar 通过 `client:load` 挂载 Vue 组件，保留按钮 ID、样式类、模式属性、无障碍标签与三个具名图标插槽。
- [x] 组件使用现有主题常量和类型，初始化前禁用、挂载读取会话选择；点击按批准的三模式循环调用现有 `setTheme()`。
- [x] 浏览器对象仅在挂载后使用，系统监听仅在 auto 下应用主题；主题通知只同步状态，卸载清理同一组回调。

**验证：**

```powershell
pnpm exec biome format --write src/components/LightDarkSwitch.vue src/components/Navbar.astro
pnpm exec biome ci src/components/LightDarkSwitch.vue src/components/Navbar.astro
pnpm check
```

人工核验 Vue、Astro 模板缩进和插槽结构；专门的 Vue 类型检查与基础浏览器验收在 T3 和首个检查点完成。旧 Svelte 主题组件暂时保留为未引用基线，T5 再移除。

**依赖：** T1。

**文件范围：** `src/components/LightDarkSwitch.vue`、`src/components/Navbar.astro`。

**规模：** 小，2 个业务文件。

## T3：建立 Vue 单文件组件类型检查

- [x] 完成 T3。

**描述：** 用固定版本工具检查真实 Vue 组件和模板，独立于现有 Astro 检查及 TypeScript 声明检查。

**验收：**

- [x] 安装 `vue-tsc 3.3.13` 为精确版本开发依赖，锁文件更新不包含无关升级。
- [x] `tsconfig.vue.json` 继承当前严格配置和别名，关闭声明输出、开启严格模板检查，入口包含 Vue 文件和环境声明。
- [x] `pnpm check:vue` 检查实际组件并通过；Astro 检查保持正常，原 TypeScript 检查没有迁移新增诊断。

**验证：**

```powershell
pnpm add -D -E vue-tsc@3.3.13
pnpm exec biome format --write package.json tsconfig.vue.json
pnpm exec biome ci package.json tsconfig.vue.json
pnpm check
pnpm check:vue
pnpm type-check
```

比较 T1 诊断位置和内容。需要独立生成 Astro 环境类型时执行 `pnpm exec astro sync`；检查失败先定位配置或组件问题，不能降低模板检查或新增宽泛类型掩盖错误。

**依赖：** T2。

**文件范围：** `package.json`、`pnpm-lock.yaml`、`tsconfig.vue.json`；若组件检查失败，回到 T2 修复组件，再继续此任务。

**规模：** 中，3 个检查配置与依赖文件。

## Checkpoint：Vue 基础能力

- [x] Astro 与 Vue 检查通过，原 TypeScript 检查相对 T1 无新增问题。
- [x] 实际页面中的图标、三模式循环、系统跟随和合法偏好保存正确；接管不会覆盖首屏选择。
- [x] 桌面、手机的按钮可操作，控制台无迁移引入的激活错误；旧主题组件仍可用于源码比对。

使用状态与事件等待实际 Vue 入口就绪。必要时运行生产构建核查插槽及激活；失败先回到 T2 或 T3 修复，未通过不得移除旧组件。

## T4：接入现有 CI 检查

- [x] 完成 T4。

**描述：** 在原 check job 中追加 Vue 检查，保持现有环境矩阵和其他构建流程。

**验收：**

- [x] Astro 检查后执行 `pnpm check:vue`，继续使用冻结锁文件安装。
- [x] Node 22、23 矩阵及现有构建、Biome 工作流保持原约定。
- [x] 工作流 YAML 结构和新增命令已核验；本地命令验证与实际 CI 矩阵执行状态分开记录。

**验证：** 人工核验 YAML 缩进、job 与 step 顺序，执行 `pnpm astro check`、`pnpm check:vue` 和 `git diff --check`。未经运行的远程 CI 或 Node 版本不能报告为通过；不为触发 CI 自动提交或推送。

**依赖：** T3。

**文件范围：** `.github/workflows/build.yml`。

**规模：** 小，1 个配置文件。

## T5：完成旧主题组件替换

- [x] 完成 T5。

**描述：** 基础检查点通过后移除旧主题组件，保留另外两个迁移模块所需的 Svelte 依赖与集成。

**验收：**

- [x] 移除 `LightDarkSwitch.svelte`，确认代码中无旧主题组件导入或引用。
- [x] Search、ArchivePanel 的 Svelte 引用及集成继续存在，依赖清理留到三个模块全部完成后。
- [x] Vue 与 Astro 检查、生产构建通过，Pagefind 索引生成正常。

**验证：** 先通过 CodeGraph 确认引用关系，再用 `rg -n 'LightDarkSwitch\.svelte' src` 补充核查；无匹配为预期。执行 `pnpm check`、`pnpm check:vue`、`pnpm build`。移除仅针对已批准替换的单个旧组件，不扩大文件清理范围。

**依赖：** T4、Vue 基础能力检查点。

**文件范围：** `src/components/LightDarkSwitch.svelte`（删除）。

**规模：** 小，1 个业务文件。

## T6：验证生产主题行为与兼容性

- [x] 完成 T6。

**描述：** 使用生产预览执行规格矩阵，并保留可复用的浏览器验证脚本；覆盖主题、导航、存储故障和其他交互的兼容。

**验收：**

- [x] 主题与系统外观矩阵、首屏接管、刷新、直接访问、Swup、前进后退和存储读写故障均有结果；至少 10 次站内跳转后监听数量不增长。
- [x] 桌面、手机及指定断点的按钮图标、可访问标签、Tab／Enter／Space、焦点和布局满足规格。
- [x] 背景、色相、动画、光标、音乐状态、代码块以及真实搜索和归档完成回归；限制与未验证部分单独记录。

**验证：**

- 使用 T5 生成的最新构建及 `pnpm preview --host 127.0.0.1`；复用合适的已有预览服务，不重复启动无关服务。
- 浏览器脚本接收已有 Page 和任务产物路径，通过现有运行时执行；临时 runner 放入 `tmp/vue-theme-switch/scripts/`，不要求项目安装 Playwright。
- 生产页面覆盖首页、博客、学习、归档、关于、工具和代表性代码文章；桌面 `1440×900`、手机 `390×844`，补查 `767/768px`、`800/801px`。
- 隔离测试存储，初始化脚本注入故障与早期监听记录；使用稳定角色、按钮标识、状态和 URL 等待，截图与 trace 显式保存到 `tmp/vue-theme-switch/playwright/`。
- 脚本写入后执行 `node --check scripts/tests/theme-switch.playwright.mjs` 并检查格式，再运行浏览器；控制台与网络失败记录区分既有问题和迁移新增问题。

**依赖：** T5。

**文件范围：** `scripts/tests/theme-switch.playwright.mjs`；临时 runner、日志和浏览器产物均在任务临时目录。

**规模：** 小，1 个正式验证脚本。验证发现代码问题时回到对应任务修复，不在此项堆积跨模块修改。

## Checkpoint：生产与兼容性

- [x] 规格八项验收标准逐项有结果及证据路径，不能以静态检查代替浏览器结果。
- [x] 新 Vue 入口和保留的搜索、归档行为正常；生产预览没有迁移新增的运行时异常或本地资源失败。
- [x] 无关设置保留，监听不累积，存储失败下会话模式符合约定；未运行的 CI 矩阵及受限媒体验证明确标注。

## T7：代码审核与验收记录

- [x] 完成 T7。

**描述：** 审核最终改动，将检查、浏览器证据、限制和实际交付范围归入模块文档，确保下一模块可以准确接续。

**验收：**

- [x] 按 `code-review-and-quality` 技能审核本次代码，发现项已修复或明确记录；用户已有改动保留。
- [x] 本文件记录各项验证、类型基线比较、证据路径和未验证项；规格、计划及能力图状态与实际完成情况一致。
- [x] 关闭本次启动的服务与浏览器，保留排查证据；未提交、推送或部署，不提前开始归档或搜索迁移。

**验证：** `git diff --check`、最终变更文件的只读格式检查以及 T6 证据完整性核查。代码审核产生修复时，只重跑受影响检查；无新变更或失败不重复完整构建与全部浏览器矩阵。

**依赖：** T6、生产与兼容性检查点。

**文件范围：** `docs/sdd/vue-theme-switch/spec.md`、`plan.md`、`todo.md`，以及 `docs/sdd/astro-vue-components/capability-map.md`。

**规模：** 中，4 个正式文档；代码修复回到原任务处理。

## Checkpoint：交付审核

- [x] 必需检查和验收完成，未验证部分如实披露；存在必需验收缺口时不能宣称模块全量验收通过。
- [x] 正式改动与计划范围一致，用户工作区内容和其他任务临时产物保留。
- [x] 交付说明包含改动、验证与限制，后续归档模块从自己的 Specify 阶段开始。

## 执行与证据记录

- T1：迁移前 `pnpm check` 通过；`pnpm type-check` 有 10 项既有声明诊断，保存在 `tmp/vue-theme-switch/logs/type-before.log`。桌面、手机的三模式循环、系统外观、刷新和 Swup 基线通过，截图及报告在任务 `playwright/` 目录。
- T2～T5：导航栏接入 `LightDarkSwitch.vue`，旧主题 Svelte 组件已删除；搜索和归档继续使用 Svelte。新增 `vue-tsc 3.3.13`、`tsconfig.vue.json`、`pnpm check:vue` 和现有 check job 的 Vue 检查。
- 实施发现原 `@astrojs/vue 7.0.2` 要求 Astro 7，已固定为支持 Astro 5 的 `5.1.4`；对应 peer 范围核对和原因见 plan.md。Vue 严格检查使用官方 `dataAttributes` 识别标准数据属性，未关闭模板严格检查。
- 最终变更文件 Biome 检查、模板格式检查、`git diff --check`、`pnpm check`、`pnpm check:vue`、`pnpm build` 通过。`pnpm type-check` 的 10 项诊断与 T1 按位置和内容完全一致；最终日志为 `check-final.log`、`vue-final.log`、`type-final.log`、`build-final.log`。
- 锁文件由 pnpm 生成；直接依赖差异只涉及 Vue 集成版本和新增 vue-tsc，审查报告在 `logs/lockfile-review.json`。`pnpm install --frozen-lockfile` 通过；随后重新构建并执行完整浏览器矩阵，验证安装结果与交付锁文件一致。
- T6：24 组生产浏览器场景全部通过，运行时异常与本地失败请求均为 0。覆盖主题及系统外观矩阵、非法与空偏好、三种存储故障组合、刷新、直达、Swup 及前进后退、10 次导航监听稳定、组件卸载清理、键盘与 6 个视口、分模式自定义背景和色相、暂停背景、减少动态效果、音乐状态、代码块、归档标签及真实 Pagefind 搜索。
- 音乐实际播放通过按钮启动；主题切换及 Swup 跳转后音频实例、曲目、音量保持一致，时间继续推进。未验证物理音频输出设备；光标验证限于设置保留与交互截图，没有单独穷举全部光标参数。
- 首屏验证暂停组件资源加载，确认接管前按钮禁用、原主题与图标正确；释放资源后模式一致。生产矩阵报告为 `playwright/theme-switch-report.json`，日志为 `logs/browser-final.log`；桌面／手机亮暗截图为 `playwright/after-*.png`。
- Playwright 连接工具不允许新建隔离上下文，实际使用环境已有 Playwright 与无头 Edge，未新增项目浏览器依赖。临时 runner 在 `scripts/`，正式验证脚本为 `scripts/tests/theme-switch.playwright.mjs`。
- T7：按正确性、可读性、架构、安全和性能五个维度自审，无待修复的必要问题。确认 SSR 不访问浏览器对象、主题事件不递归、监听移除与注册匹配、存储及无关配置保留；版本调整及锁文件已审查。
- CI 配置和本地命令已验证，未执行远程 CI 的 Node 22、23 矩阵；本地使用 Node 24。所有实际启动的无头浏览器已关闭，任务预览服务 4323 已关闭，原有 4321 服务保留。
- 用户已暂存 `color-setting.ts` 的补丁前后比较一致，其他用户文档、验证脚本及历史临时目录保留；未提交、推送或部署。
