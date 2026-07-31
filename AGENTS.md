# AGENTS.md

本文件遵循 AGENTS.md 开放规范，为 AI 编码 Agents 提供项目指导。

## 项目概述

这是一个基于 Vue 3 构建的 uTools 插件，用于将中文变量名翻译为符合编程规范的英文命名。内置固定使用 DeepSeek-V3 模型（非思考模式），用户仅需配置 API Key。

### 构建与开发

```bash
# 开发模式（在 5173 端口运行 Vite 开发服务器）
npm run dev

# 生产构建（输出到 dist/ 目录）
npm run build
```

开发模式说明： 在 uTools 中，`plugin.json` 的 `development.main` 指向 `http://localhost:5173`。构建后，需要将 `dist/` 目录内容连同 `plugin.json`、`logo.png` 和 `preload/` 一起复制到 uTools 插件目录。

## 项目架构

### 入口文件

| 文件                                                                 | 用途                                         |
| -------------------------------------------------------------------- | -------------------------------------------- |
| [index.html](index.html)                                             | HTML 入口点，挂载 `#app`                     |
| [src/main.js](src/main.js)                                           | Vue 应用初始化                               |
| [src/App.vue](src/App.vue)                                           | 根组件 - 处理路由、主题切换、uTools 生命周期 |
| [src/VariableTranslator/index.vue](src/VariableTranslator/index.vue) | 主要翻译功能组件                             |

### uTools 集成

插件配置： [public/plugin.json](public/plugin.json)

- 功能代码：`translator`
- 命令："变量翻译"、"翻译"、"中文翻译"、"命名助手"、"translator"
- 支持 "over" 类型（文本选择翻译）

预加载脚本： [public/preload/services.js](public/preload/services.js)

- 通过 `window.exports` 设置 uTools 功能处理器（`enter` 为空实现，输入由 `onPluginEnter` 获取）

数据流：

1. 用户通过 uTools 搜索或文本选择调用插件
2. `App.vue` 通过 `window.utools.onPluginEnter()` 接收载荷，设置 `enterAction` prop
3. `VariableTranslator/index.vue` 监听 `enterAction`，触发翻译

### 数据持久化

| 存储方式           | 键名                         | 用途                                           |
| ------------------ | ---------------------------- | ---------------------------------------------- |
| `window.utools.db` | `translator_api_key`         | DeepSeek API Key                               |
| `window.utools.db` | `translator_cache_*`         | 翻译结果缓存（key 含方向与输入文本，7天过期）   |
| `window.utools.db` | `translator_cache_stats`     | 缓存命中统计（hits/total）                     |
| `localStorage`     | `translator_theme`           | 主题偏好（亮色/暗色）                          |

重要提示： API Key 加载在 `onMounted` 中延迟 50ms 执行，`watch(() => props.enterAction)` 使用 `immediate: true`，两者之间可能产生竞态。

### CSS 架构

项目采用 SCSS + Codex 设计 Token 体系：

- 全局 Token：[src/_variables.scss](src/_variables.scss) — 圆角 `$vp-radius`、间距 `$spacing-*`、字体 `$vp-mono`、动画 `$vp-transition`
- 全局样式：[src/main.scss](src/main.scss) — CSS 变量 + `--b3-*` 语义别名
- 组件样式：[src/VariableTranslator/index.scss](src/VariableTranslator/index.scss)
- Vite `additionalData` 自动注入 `@use "@/variables.scss" as *;`，无需手动引入
- 主题：`:root` 上设置 `data-theme="light"` 或 `data-theme="dark"`

## 核心实现细节

### 翻译提示词结构

`getPrompt()` 函数（[VariableTranslator/index.vue](src/VariableTranslator/index.vue)）定义了极简 AI 提示词，约 120 token。输出格式为 JSON 数组，每个中文词汇包含 4 种命名类型：

- `variable`：名词短语（camelCase、snake_case、PascalCase）
- `method`：动词开头（camelCase、snake_case、PascalCase）
- `constant`：全大写下划线（UPPER_SNAKE_CASE）
- `class`：PascalCase 名词

API 调用参数优化：
- `temperature: 0.1`（降低随机性，提高命名一致性）
- `max_tokens: 800`（限制输出长度，兼顾多词输入不被截断）
- `response_format: { type: 'json_object' }`（强制 JSON 输出）
- `thinking: { type: 'disabled' }`（非思考模式，节省 reasoning token）

### 防抖自动翻译

输入使用 2.5 秒防抖进行监听（[VariableTranslator/index.vue](src/VariableTranslator/index.vue)）。当文本来自 uTools（`isFromUtools` 标志）时，会在 100ms 后立即翻译，以确保 API 配置已加载。

### 键盘快捷键

| 快捷键                     | 操作              |
| -------------------------- | ----------------- |
| `Ctrl+Enter` / `Cmd+Enter` | 立即翻译          |
| `Ctrl+K` / `Cmd+K`         | 清空输入和结果    |

### 模型配置

配置文件：[src/config/api.ts](src/config/api.ts)（已加入 `.gitignore`，禁止提交）

- 端点：`https://api.deepseek.com/v1/chat/completions`
- 模型：`deepseek-chat`（DeepSeek-V3）
- API Key 直接写在 `api.ts` 的 `apiKey` 字段，无需 UI 配置
- 参考模板：[src/config/api.example.ts](src/config/api.example.ts)（可提交，供参考）

### 缓存机制

- 缓存 key：`translator_cache_${direction}_${input}`（基于翻译方向 + 输入文本，与模型无关）
- 缓存有效期：7 天（`CACHE_TTL`），读取时发现过期即删除，组件挂载时扫描清理全部过期条目
- 缓存统计：`translator_cache_stats` 记录命中次数（hits）和总翻译请求数（total，含命中与未命中）

### 组件通信

- App.vue → VariableTranslator/index.vue：
  - `enterAction` prop：传递 uTools 进入动作信息
  - `isDarkTheme` prop：传递当前主题状态
  - `@toggle-theme` 事件：子组件触发主题切换

### 样式文件组织

- [src/_variables.scss](src/_variables.scss)：Codex 全局设计 Token（圆角/间距/字体/动画）
- [src/main.scss](src/main.scss)：全局样式、主题变量、`--b3-*` 语义别名
- [src/VariableTranslator/index.scss](src/VariableTranslator/index.scss)：翻译器组件专用样式
- [src/config/icons.ts](src/config/icons.ts)：Iconify 图标注册表
- [src/config/api.ts](src/config/api.ts)：API 配置（含 Key，.gitignore 排除）
- [src/config/api.example.ts](src/config/api.example.ts)：API 配置模板（可提交）

### 依赖说明

主要依赖（[package.json](package.json)）：

- vue@^3.5.13：前端框架
- @iconify/vue：Iconify 图标组件
- sass：SCSS 预处理器（开发依赖）
- @mdi/js：MDI 图标 SVG path，tree-shakeable（开发依赖）

## 强制规则

### UI 规范：Codex 风格

所有新增 feature 的 UI 必须遵循 Codex 风格，使用全局设计 Token，**禁止硬编码**。

核心 Token（`src/_variables.scss`）：

- 圆角：`$vp-radius`（6px）、`$radius-sm`（4px）、`$radius-md`（8px）、`$radius-lg`（12px）、`$radius-full`（胶囊）
- 间距：`$spacing-xs`（4px）、`$spacing-sm`（8px）、`$spacing-md`（12px）、`$spacing-lg`（16px）
- 等宽字体：`$vp-mono`
- 动画：`$vp-transition`（0.12s）

核心模式：

| 模式 | 规则 |
|------|------|
| 卡片 | `border: 1px solid var(--b3-border-color)`，禁用阴影 |
| 卡片 hover | `border-color: var(--b3-theme-primary)` |
| 大写标签 | `font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase` |
| 等宽字段 | 路径/版本号/日期/密码使用 `$vp-mono` |
| focus 发光 | `box-shadow: 0 0 0 2px var(--b3-theme-primary-lightest)` |
| 按钮 | 主按钮实底 `var(--b3-theme-primary)` / 次按钮描边 ghost |
| 动画 | 统一 `0.12s` 过渡 |

### 图标规范

- **禁止使用 emoji 表情作为图标**
- 所有图标必须从 `src/config/icons.ts` 导入已注册的 Iconify 图标
- 图标来源：`@mdi/js`（按需导入 SVG path，tree-shakeable）
- 新增图标步骤：在 `icons.ts` 中从 `@mdi/js` 导入对应 path → 注册到 `COMMON_ICONS` 或 `FEATURE_ICONS` → 组件中引用
- 浏览可用图标：https://icon-sets.iconify.design/mdi/
- 图标渲染：通过全局注册的 `<Icon>` 组件，`:icon` 属性传入 icon data 对象

### 文档参考

- [SRC/vue_uToolsAPI.md](SRC/vue_uToolsAPI.md)：uTools API 文档
