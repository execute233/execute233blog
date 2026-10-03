# 灵动岛音乐播放器

灵动岛固定在视口顶部中央，使用 `position: fixed`，不占文档流，不增加导航栏行数。桌面端悬停展开，手机端点击展开；点击外部或按 Esc 收起。

鼠标操作后离开约 420ms 自动收起；键盘操作时，焦点仍在面板内则保持展开。展开面板采用紧凑比例，封面、文字及按钮随容器宽度缩放；点击音量或歌单按钮时，灵动岛向下扩张，在主控制区下方显示对应内容，互不同时展开。歌单过长时在灵动岛内部滚动。再次点击对应按钮收回下方区域；Esc 优先收回下方区域，再次按下收起整个播放器。

收起时只显示封面和频谱，歌曲信息在展开面板中展示。

## 放置自己的音乐

音乐及本地配置统一放在 `public/media/island/`。整个目录已加入 `.gitignore`，每首歌使用一个子目录：

```text
public/media/island/
├── playlist.json          # 可选：选曲和顺序
├── song-a/
│   ├── track.mp3
│   ├── metadata.json      # 可选：手动维护歌曲信息
│   ├── cover.webp
│   └── lyrics.lrc
└── song-b/
    ├── track.mp3
    └── cover.jpg
```

每个歌曲目录只放一个音频文件，文件名无需改动。扫描支持 MP3、OGG、WAV、M4A、FLAC、Opus、AAC，实际播放取决于浏览器能否解码；保持真实扩展名。只扫描媒体目录的直接子目录，忽略没有音频的目录和点号开头的目录。

## 配置歌单

无需修改 TypeScript。没有 `playlist.json` 时，自动加入全部有效歌曲，按文件夹名排序。需要选曲或指定顺序时，在媒体目录根部创建 `playlist.json`，只写歌曲文件夹名：

```json
[
    "song-b",
    "song-a"
]
```

歌单存在时，只播放其中列出的歌曲，顺序与数组一致；可以重复列出某首歌。歌单中的名称必须对应含音频的歌曲目录。JSON 格式错误、错误的字段类型或不存在的歌曲会明确报错。

**媒体目录没有音频，或 `playlist.json` 内容为 `[]` 时，不渲染灵动岛，也不加载播放器模块。**

## 歌曲信息与封面

歌曲目录中可以创建 `metadata.json`，由自己维护显示信息：

```json
{
    "title": "歌曲 A",
    "artist": "歌手 A",
    "cover": "cover.webp"
}
```

- `title`、`artist`：必填的非空字符串。
- `cover`：可选，填写同目录中存在的图片文件名，不填写完整路径。支持 JPG、PNG、WebP、GIF、AVIF、SVG。
- 有 `metadata.json` 时，以手动配置为准，未指定封面时使用站点图标。配置格式错误、字段不合法或封面不存在会报错。
- 没有 `metadata.json` 时，自动读取音频内置标签中的歌名、歌手和封面；标签缺失时，从 `歌手 - 歌名.mp3` 的文件名推断。文件名没有 ` - ` 分隔符时，以文件名作为歌名，歌手留空。
- 自动提取的内嵌封面输出到构建产物的 `media/island-covers/`，不修改本地音乐文件，也不生成 `metadata.json`。缺少封面时使用站点图标。

例如，你现有的目录可以直接识别，无需重命名：

```text
public/media/island/Mili - world.execute (me) ;/
├── Mili - world.execute (me) ;.mp3
└── Mili - world.execute (me) ;.lrc
```

播放器自动编码 URL，文件名可以包含空格、中文、括号和分号。开发时修改媒体或本地配置后刷新页面；构建时读取当前目录内容。目前采用本地目录方案，静态部署前执行 `pnpm build`，音乐及提取的封面随 `dist/` 输出。

在 `src/config.ts` 中设置 `musicConfig.enable: false` 可以关闭灵动岛；没有显示灵动岛时，手机导航显示完整站名字样。

## 歌词格式

使用 UTF-8 编码的 LRC 文件，例如：

```text
[00:00.00]前奏
[00:12.30]第一句歌词
[00:18.50][00:42.50]重复出现的歌词
```

歌词无需配置路径，依次匹配：与音频同名的 `.lrc`、`lyrics.lrc`、同目录中唯一的 `.lrc`。多个歌词文件无法确定匹配关系时会报错。没有歌词不影响播放。

播放器解析时间戳并随播放进度更新当前歌词，拖动进度时同步更新。歌词作为纯文本展示。

## 播放行为

- 首次打开或整页刷新时暂停，点击播放才加载音频并播放。
- 上一首、下一首按数组顺序切换，保留播放/暂停状态；点击歌单中的曲目立即播放。
- 播放结束自动播放下一首，最后一首之后回到第一首。
- 支持进度调节、音量和静音。
- 音量和静音保存到 `execute233.music.v1`；不会在刷新后自动续播。
- Swup 站内跳转及前进、后退保留音频元素与进度；整页刷新和离站会停止播放。
- 频谱由 Web Audio API 分析音频后驱动。暂停、页面隐藏或系统开启“减少动态效果”时停止频谱动画。
- 音源出错时显示“音频不可用”，可以选择其他曲目继续播放。

## 代码位置

| 文件 | 职责 |
| --- | --- |
| `public/media/island/playlist.json` | 本地选曲和顺序（可选） |
| `public/media/island/<歌曲目录>/metadata.json` | 本地手动歌曲信息（可选） |
| `src/server/music-library.ts` | 服务端扫描、校验、音频标签和封面提取 |
| `src/pages/media/island-covers/[name].[extension].ts` | 输出内嵌封面的静态图片 |
| `src/plugins/music-assets.ts` | 开发时实时读取封面，支持歌单变化后的页面刷新 |
| `src/config.ts` | 全站启用开关 |
| `src/components/MusicIsland.astro` | 胶囊和面板结构、媒体 URL、服务端文案 |
| `src/scripts/music-island.ts` | 播放、切歌、音量、频谱与交互 |
| `src/styles/music-island.css` | 悬浮定位、变形动画、响应式样式 |
| `src/utils/music-utils.ts` | LRC 解析与时间格式 |
| `src/layouts/Layout.astro` | 挂载在 Swup 的 `main`、`#toc` 替换区域之外 |

`astro.config.mjs` 将 Swup 的 `loadOnIdle` 设为 `false`，确保星空动画持续运行时也能及时启用站内导航。播放器通过 DOM 标记防止重复绑定事件。
