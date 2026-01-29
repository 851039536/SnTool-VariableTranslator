# 中文变量名翻译助手 (VariableTranslator)

一个基于 Vue 3 和 AI 技术的 uTools 插件，用于将中文转换为符合编程规范的英文变量名。

## ✨ 功能特点

### 🎯 核心功能

- 智能翻译：将中文转换为专业、准确的英文编程命名
- 多种命名风格：支持 camelCase、snake_case、PascalCase 三种命名风格
- 多种命名类型：提供变量、方法、常量、类四种命名类型
- AI 模型集成：支持通义千问、DeepSeek、智谱 GLM、Moonshot Kimi 等多种 AI 模型
- 翻译缓存：自动缓存翻译结果，提高响应速度

### 🎨 用户体验

- 深色/亮色主题：支持主题切换，适应不同使用环境
- 实时翻译：输入中文后自动翻译，无需手动触发
- 键盘快捷键：支持 Ctrl+Enter 立即翻译，Ctrl+K 清空输入
- 一键复制：点击即可复制生成的命名到剪贴板
- 友好提示：提供清晰的状态提示和错误信息

### 🔧 技术特性

- 现代化技术栈：Vue 3 + Vite + Unocss
- 响应式设计：适配不同屏幕尺寸
- 配置持久化：自动保存 API 配置到本地
- 错误处理：完善的错误提示和处理机制
- 代码规范：遵循现代前端开发最佳实践

## 📦 安装方法

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

## 🚀 使用指南

### 基本使用

1. 在 uTools 中输入命令：`变量翻译` 或 `translator`
2. 在输入框中输入中文（例如：用户名称）
3. 等待自动翻译完成，或按 Ctrl+Enter 立即翻译
4. 从结果中选择合适的命名风格，点击复制按钮

### API 配置

1. 点击右上角的设置图标 ⚙️
2. 选择一个 AI 模型预设（通义千问、DeepSeek、智谱 GLM、Moonshot Kimi）
3. 填写对应模型的 API Key
4. 点击 "保存配置" 按钮

### 键盘快捷键

- Ctrl+Enter：立即翻译
- Ctrl+K：清空输入框
- Esc：关闭配置面板

## 🛠️ 技术栈

| 技术       | 版本    | 用途         |
| ---------- | ------- | ------------ |
| Vue        | ^3.5.13 | 前端框架     |
| Vite       | ^6.0.11 | 构建工具     |
| Unocss     | ^66.5.4 | CSS 框架     |
| uTools API | -       | 插件平台集成 |

## 📁 项目结构

```
SnTool-VariableTranslator/
├── public/             # 静态资源
│   ├── preload/        # 预加载脚本
│   ├── logo.png        # 插件图标
│   └── plugin.json     # 插件配置
├── src/                # 源代码
│   ├── VariableTranslator/  # 核心组件
│   │   ├── index.vue   # 主组件
│   │   └── index.css   # 组件样式
│   ├── App.vue         # 应用入口组件
│   ├── main.js         # 应用入口文件
│   └── main.css        # 全局样式
├── .gitignore          # Git 忽略文件
├── package.json        # 项目配置
├── vite.config.js      # Vite 配置
└── README.md           # 项目说明
```
