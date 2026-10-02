export interface Tool {
    name: string;
    category: string;
    description: string;
    href?: string;
}

// 展示用占位数据：添加 href 后，卡片将提供外部访问入口。
export const tools: Tool[] = [
    {
        name: "开发工具 · 示例",
        category: "开发环境",
        description: "在这里记录顺手的编辑器、终端或调试工具，以及你的使用心得。",
    },
    {
        name: "AI 助手 · 示例",
        category: "AI 探索",
        description: "在这里整理体验过的 AI 工具，写下适用场景与值得注意的限制。",
    },
    {
        name: "效率工具 · 示例",
        category: "日常效率",
        description: "在这里收藏笔记、资料整理和自动化工具，后续替换为真实推荐。",
    },
];
