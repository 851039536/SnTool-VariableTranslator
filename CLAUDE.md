# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供项目指导。

## 项目概述

这是一个基于 Vue 3 构建的 uTools 插件，用于将中文变量名翻译为符合编程规范的英文命名。支持使用 OpenAI 兼容的 API（通义千问、DeepSeek、智谱 GLM、Moonshot Kimi）进行翻译。

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

- 通过 `window.services` 注入 Node.js 能力（文件 I/O、压缩、复制）
- 通过 `window.exports` 设置 uTools 功能处理器
- 通过 `window.translatorPayload` 将搜索输入传递给 Vue

数据流：

1. 用户通过 uTools 搜索或文本选择调用插件
2. `preload/services.js` 在 `window.translatorPayload` 中捕获载荷
3. `App.vue` 通过 `window.utools.onPluginEnter()` 接收，设置 `enterAction` prop
4. `VariableTranslator/index.vue` 监听 `enterAction`，触发翻译

### 数据持久化

| 存储方式           | 键名                         | 用途                                           |
| ------------------ | ---------------------------- | ---------------------------------------------- |
| `window.utools.db` | `translator_api_config`      | 所有预设的 API 配置（endpoint、apiKey、model） |
| `window.utools.db` | `translator_selected_preset` | 当前选中的预设名称                             |
| `localStorage`     | `translator_theme`           | 主题偏好（亮色/暗色）                          |

重要提示： 修改 API 配置持久化时，注意以下竞态条件：

- `loadApiConfig()` 在 `onMounted` 中调用（延迟 50ms）
- `watch(() => props.enterAction)` 使用 `immediate: true`
- `isLoadingConfig` 标志（模块级变量，在 100ms 后重置）

### CSS 架构

主题系统使用 [src/main.css](src/main.css) 中定义的 CSS 自定义属性：

- 在 `:root` 上设置 `data-theme="light"` 或 `data-theme="dark"`
- CSS 变量：`--bg-primary`、`--bg-secondary`、`--text-primary`、`--border` 等

## 核心实现细节

### 翻译提示词结构

`getPrompt()` 函数（[VariableTranslator/index.vue:368-409](src/VariableTranslator/index.vue#L368-L409)）定义了 AI 提示词。输出格式为 JSON，每个中文词汇包含 4 种命名类型：

- `variable`：名词短语（camelCase、snake_case、PascalCase、谐音）
- `method`：动词开头（camelCase、snake_case、PascalCase、谐音）
- `constant`：全大写下划线（UPPER_SNAKE_CASE）
- `class`：PascalCase 名词

### 防抖自动翻译

输入使用 1.5 秒防抖进行监听（[VariableTranslator/index.vue:579-616](src/VariableTranslator/index.vue#L579-L616)）。当文本来自 uTools（`isFromUtools` 标志）时，会在 100ms 后立即翻译，以确保 API 配置已加载。

### 键盘快捷键

| 快捷键                     | 操作              |
| -------------------------- | ----------------- |
| `Ctrl+Enter` / `Cmd+Enter` | 立即翻译          |
| `Ctrl+K` / `Cmd+K`         | 清空输入和结果    |
| `Esc`                      | 关闭 API 配置弹窗 |

### API 预设管理

项目支持多个 API 预设配置（[VariableTranslator/index.vue:174-196](src/VariableTranslator/index.vue#L174-L196)）：

- 通义千问：使用 DashScope 兼容模式端点
- DeepSeek：官方 API 端点
- 智谱 GLM：使用 glm-4-flash 模型
- Moonshot Kimi：使用 moonshot-v1-8k 模型

配置数据格式：

```javascript
{
  qwen: { endpoint: '', apiKey: '', model: 'qwen-turbo' },
  deepseek: { endpoint: '', apiKey: '', model: 'deepseek-chat' },
  zhipu: { endpoint: '', apiKey: '', model: 'glm-4-flash' },
  kimi: { endpoint: '', apiKey: '', model: 'moonshot-v1-8k' }
}
```

### 组件通信

- App.vue → VariableTranslator/index.vue：
  - `enterAction` prop：传递 uTools 进入动作信息
  - `isDarkTheme` prop：传递当前主题状态
  - `@toggle-theme` 事件：子组件触发主题切换

### 样式文件组织

- [src/main.css](src/main.css)：全局样式和主题 CSS 变量
- [src/VariableTranslator/index.css](src/VariableTranslator/index.css)：翻译器组件专用样式

### 依赖说明

主要依赖（[package.json](package.json)）：

- vue@^3.5.13：前端框架
- unocss@^66.5.4：原子化 CSS 框架（开发依赖）

### 文档参考

- [SRC/vue_uToolsAPI.md](SRC/vue_uToolsAPI.md)：uTools API 文档
