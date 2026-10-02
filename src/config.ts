import type {
    ExpressiveCodeConfig,
    LicenseConfig,
    NavBarConfig,
    ProfileConfig,
    SiteConfig,
} from "./types/config";
import {LinkPreset} from "./types/config";

export const siteConfig: SiteConfig = {
    title: "运行实验簿 | execute233's blog",
    subtitle: "运行实验簿 | execute233's blog",
    lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
    themeColor: {
        hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
        fixed: false, // Hide the theme color picker for visitors
    },
    banner: {
        enable: false,
        src: "assets/images/demo-banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
        position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
        credit: {
            enable: false, // Display the credit text of the banner image
            text: "", // Credit text to be displayed
            url: "", // (Optional) URL link to the original artwork or artist's page
        },
    },
    toc: {
        enable: true, // Display the table of contents on the right side of the post
        depth: 2, // Maximum heading depth to show in the table, from 1 to 3
    },
    favicon: [
        // 图标名描述图形/前景色：light 为白图形配黑底，用于深色界面；dark 为黑图形配白底，用于浅色界面
        {src: "/favicon/favicon-dark-16.png", theme: "dark", sizes: "16x16"},
        {src: "/favicon/favicon-dark-32.png", theme: "dark", sizes: "32x32"},
        {src: "/favicon/favicon-light-16.png", theme: "light", sizes: "16x16"},
        {src: "/favicon/favicon-light-32.png", theme: "light", sizes: "32x32"},
        {src: "/favicon/favicon-dark.svg", theme: "dark", sizes: "any"},
        {src: "/favicon/favicon-light.svg", theme: "light", sizes: "any"},
    ],
};

export const navBarConfig: NavBarConfig = {
    links: [
        LinkPreset.Home,
        {name: "博客", url: "/blog/"},
        {name: "学习记录", url: "/learning/"},
        {name: "工具", url: "/tools/"},
        LinkPreset.About,
    ],
};

export const profileConfig: ProfileConfig = {
    avatar: "assets/images/avatar.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
    name: "execute233",
    bio: "大学生 · 边查文档，边写代码，边探索未知。",
    links: [
        {
            name: "QQ",
            icon: "fa6-brands:qq",
            url: "https://user.qzone.qq.com/1647643661"
        },
        {
            name: "bilibili",
            icon: "fa6-brands:bilibili", // Visit https://icones.js.org/ for icon codes
            // You will need to install the corresponding icon set if it's not already included
            // `pnpm add @iconify-json/<icon-set-name>`
            url: "https://space.bilibili.com/482679667",
        },
        {
            name: "Steam",
            icon: "fa6-brands:steam",
            url: "https://steamcommunity.com/profiles/76561198976689029/",
        },
        {
            name: "GitHub",
            icon: "fa6-brands:github",
            url: "https://github.com/execute233",
        },
    ],
};

export const licenseConfig: LicenseConfig = {
    enable: true,
    name: "CC BY-NC-SA 4.0",
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
    // Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
    // Please select a dark theme, as this blog theme currently only supports dark background color
    theme: "github-dark",
};
