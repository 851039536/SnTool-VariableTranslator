# 中文变量名翻译助手 (VariableTranslator)

一个基于 Vue 3 和 AI 技术的 uTools 插件，支持**中文 → 英文变量名**和**英文变量名 → 中文释义**双向翻译。

## 功能特点

### 核心功能

- **双向翻译**：中→英生成编程命名，英→中解析变量含义
- **多种命名风格**：支持 camelCase、snake_case、PascalCase 三种命名规范
- **多种命名类型**：提供变量（Variable）、方法（Method）、常量（Constant）、类（Class）四种类型
- **AI 驱动**：内置 DeepSeek 模型，翻译精准
- **翻译缓存**：自动缓存翻译结果（7 天有效期），减少重复请求

### 用户体验

- 深色/亮色主题切换
- 输入防抖自动翻译（2.5 秒），Ctrl+Enter 立即翻译
- 实时字符计数与长度限制提示（中文 ≤15 字 / 英文 ≤30 字符）
- 一键复制命名到剪贴板
- 英→中模式提供词根拆解分析

### 技术规范

- Codex 设计体系：全局 SCSS Token，禁止硬编码
- Iconify 图标系统：按需加载 MDI 图标，禁止 emoji
- 单文件构建：JS/CSS 全部内联到 index.html
- 构建后自动清理调试文件（.map / .d.ts 等）
- API Key 安全：用户自带 Key（BYOK），仅存本机 uTools db，打包产物零密钥

## 安装方法

### 方法一：通过 uTools 插件市场安装

1. 打开 uTools
2. 点击插件市场
3. 搜索 "变量翻译"
4. 点击安装

### 方法二：本地开发安装

1. 克隆本仓库
2. 安装依赖：`npm install`
3. 开发模式启动：`npm run dev`
4. 在 uTools 中添加本地插件，指向 `public` 目录
5. 打开插件后，点击右上角钥匙按钮，填入**你自己的** DeepSeek API Key（详见下方「API 配置」）

## 使用指南

### API 配置（用户自带 Key / BYOK）

插件**不再内置任何 API Key**（打包产物中不含密钥），请配置你自己的 DeepSeek API Key：

1. 打开插件，点击右上角**钥匙按钮**，展开「DeepSeek API Key」设置面板
2. 前往 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建并复制 `sk-` 开头的 Key
3. 粘贴后点击**保存**——Key 仅保存在本机 uTools 数据库，不会写入插件包或上传
4. 需要更换或移除时，再次打开设置面板操作即可

> 未配置 Key 时，输入卡片底部会显示提示，点击即可直达设置面板。

### 基本使用

1. 在 uTools 中输入命令：`变量翻译` 或 `translator`
2. 输入中文（如：用户名称）或英文变量名（如：getUserName）
3. 点击切换按钮可切换翻译方向（中→英 / 英→中）
4. 从结果中选择合适的命名，点击复制按钮

### 键盘快捷键

| 快捷键 | 功能 |
| ------ | ---- |
| Ctrl+Enter | 立即翻译 |
| Ctrl+K | 清空输入框 |

## 技术栈

| 技术 | 版本 | 用途 |
| ---- | ---- | ---- |
| Vue | ^3.5.13 | 前端框架 |
| Vite | ^6.0.11 | 构建工具 |
| Sass (SCSS) | ^1.101.0 | CSS 预处理 + Codex Token |
| @iconify/vue | ^5.0.1 | 图标组件 |
| @mdi/js | ^7.4.47 | MDI 图标 SVG path（tree-shakeable） |
| vite-plugin-singlefile | ^2.3.3 | 单文件构建（JS/CSS 内联） |
| uTools API | - | 插件平台集成 |

## 项目结构

```
SnTool-VariableTranslator/
├── public/                        # 静态资源（构建时原样复制到 dist）
│   ├── preload/                   # uTools 预加载脚本
│   │   └── services.js
│   ├── logo.png                   # 插件图标 (130×130)
│   └── plugin.json                # uTools 插件配置
├── scripts/
│   └── clean-dist.mjs            # 构建后清理脚本
├── src/
│   ├── config/
│   │   ├── api.ts                 # API 端点/模型常量（不含密钥，可提交）
│   │   └── icons.ts               # Iconify 图标注册表
│   ├── VariableTranslator/
│   │   ├── index.vue              # 核心组件
│   │   └── index.scss             # 组件样式
│   ├── App.vue                    # 应用入口组件
│   ├── main.js                    # 应用入口
│   ├── main.scss                  # 全局样式 + CSS 变量
│   └── _variables.scss            # Codex 设计 Token
├── .gitignore
├── package.json
├── vite.config.js
└── AGENTS.md                      # AI 辅助开发规则
```

## 构建与发布

```bash
npm run build
```

构建产物输出到 `dist/` 目录，JS/CSS 内联到单个 `index.html`，并自动清理 `.map`、`.d.ts`、`LICENSE`、`README` 等调试/文档文件。

发布前检查 `dist/` 目录不应包含：`.git/`、`.gitignore`、`.github/`、`.vscode/`、`*.map`、`*.gz`。
