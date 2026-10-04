# JetBrains Mono 1.0.3

- 来源：用户提供的 `JetBrainsMono-1.0.3.zip`，文件取自 `web/woff2/`。
- 项目地址：https://github.com/JetBrains/JetBrainsMono
- 许可证：[Apache License 2.0](LICENSE)。此目录保留压缩包中的原始许可证。
- 原始版权信息：© 2000-2020 JetBrains s.r.o. Developed with drive and IntelliJ IDEA.
- 字体文件保持原始字节，未转换、裁剪或修改。

此版本提供静态字重 400（Regular）、500（Medium）、700（Bold）和 800（ExtraBold），每种均包含正体和斜体。网页通过 `src/components/FontFaces.astro` 声明字体，并按需加载 WOFF2；中文使用系统字体回退。

本目录应随 Git 提交，以便静态构建和部署时分发字体及许可证。无需因版权原因加入 `.gitignore`。网站其他内容的许可证不覆盖这些字体。
