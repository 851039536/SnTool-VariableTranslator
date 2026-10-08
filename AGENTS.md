# AGENTS.md

本文件遵循 AGENTS.md 开放规范，为 AI 编码 Agents 提供项目指导。

## 项目概述

这是一个基于 Vue 3 构建的 uTools 插件，用于将中文变量名翻译为符合编程规范的英文命名。调用 DeepSeek API（非思考模式）完成翻译，API Key 采用**用户自带（BYOK）**模式：由使用者在插件设置面板中填写，仅保存在本机 uTools db，绝不打包进分发产物。

### 构建与开发

```bash
# 开发模式（在 5173 端口运行 Vite 开发服务器）
npm run dev

# 生产构建（输出到 dist/ 目录）
npm run build

# 内置词典测试（结构/重复/命名规范/查询行为/懒加载产物）
npm test
```

构建产物为**多文件**（`index.html` + `assets/`），词典独立成 chunk 按需加载。
⚠️ 发布时需复制整个 `dist/` 目录，不能只拷 `index.html`。
⚠️ 不要重新引入 `vite-plugin-singlefile`——它会把动态 import 内联，使词典懒加载失效。

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
| `window.utools.db` | `translator_cache_*`         | 翻译结果缓存（key 含方向/输入，含 meta，7天过期） |
| `window.utools.db` | `translator_cache_stats`     | 缓存命中统计（hits/total）                     |
| `localStorage`     | `translator_theme`           | 主题偏好（亮色/暗色）                          |

Key 安全说明： `api.ts` 仅含 endpoint/model 等非敏感常量，**不含任何密钥**。用户填写的 API Key 存于本机 uTools db（键 `translator_api_key`），`onMounted` 中同步读入 `apiKey` ref；uTools 输入走 100ms 延迟翻译，可保证 Key 已就绪，不存在旧版「延迟 50ms 加载 Key」的竞态。

### CSS 架构

项目采用 SCSS + Codex 设计 Token 体系：

- 全局 Token：[src/_variables.scss](src/_variables.scss) — 圆角 `$vp-radius`、间距 `$spacing-*`、字体 `$vp-mono`、动画 `$vp-transition`
- 全局样式：[src/main.scss](src/main.scss) — CSS 变量 + `--b3-*` 语义别名
- 组件样式：[src/VariableTranslator/index.scss](src/VariableTranslator/index.scss)
- Vite `additionalData` 自动注入 `@use "@/variables.scss" as *;`，无需手动引入
- 主题：`:root` 上设置 `data-theme="light"` 或 `data-theme="dark"`

## 核心实现细节

### 翻译提示词结构

`getPrompt()` 函数（[VariableTranslator/index.vue](src/VariableTranslator/index.vue)）定义了极简 AI 提示词。输出格式为 JSON 数组，每个中文词汇包含 4 种命名类型：

- `variable`：名词短语（camelCase、snake_case、PascalCase），2 个候选
- `method`：动词开头（camelCase、snake_case、PascalCase），2 个候选
- `constant`：全大写下划线（UPPER_SNAKE_CASE），1 个候选
- `class`：PascalCase 名词，1 个候选

kebab-case 不经 API 返回，由 snake_case 在本地派生（`VAR_ROWS` 的 `map` 变换），仅在 variable 类型展示。

API 调用参数优化：
- `temperature: 0.1`（降低随机性，提高命名一致性）
- `max_tokens: 1000`（限制输出长度，兼顾多候选/多词输入不被截断）
- `response_format: { type: 'json_object' }`（强制 JSON 输出）
- `thinking: { type: 'disabled' }`（非思考模式，节省 reasoning token）

### 防抖自动翻译

输入使用 2.5 秒防抖进行监听（[VariableTranslator/index.vue](src/VariableTranslator/index.vue)）。当文本来自 uTools（`isFromUtools` 标志）时，会在 100ms 后立即翻译，以确保 API 配置已加载。

### 结果展示与复制交互

- 结果行由 `modes` 数组的 `rows` 字段数据驱动：variable 展示 camel/snake/Pascal/kebab 四行（kebab 本地派生）；method 展示三行；constant 仅展示单行 UPPER（三字段均为全大写，取 snake_case）；class 仅展示单行 PascalCase
- variable/method 返回 2 个候选词，候选之间用虚线分隔（`.naming-option + .naming-option`）
- 命名行整行可点击复制（行内复制按钮 `@click.stop` 避免双触发），复制后窗口保持打开，支持连续复制
- 重新翻译时旧结果保留并加 `.is-stale`（半透明），避免内容闪空；进入插件时输入框自动聚焦

### Tab 历史记录

- Tab 切换（header 左侧）：“翻译”/“历史”两个视图；历史列表读取带 `meta` 的 `translator_cache_*` 文档（最多 50 条，按时间倒序），展示方向/输入/相对时间
- 点击历史条目回填方向+输入并立即重查（命中缓存瞬时返回）；支持单条删除与清空；头部展示缓存命中统计（hits/total）
- 历史与缓存共用存储，随 7 天 TTL 自然淘汰

### 键盘快捷键

| 快捷键                     | 操作              |
| -------------------------- | ----------------- |
| `Enter`                    | 立即翻译（`Shift+Enter` 换行） |
| `Ctrl+Enter` / `Cmd+Enter` | 立即翻译          |
| `Ctrl+K` / `Cmd+K`         | 清空输入和结果    |

### 模型配置与 API Key（BYOK）

端点与模型常量在 [src/config/api.ts](src/config/api.ts)，**不含密钥**，可正常提交版本库：

- 端点：`https://api.deepseek.com/v1/chat/completions`
- 模型：`deepseek-v4-flash`（非思考模式）
- API Key 由每个用户在**插件设置面板**填写（header 右侧钥匙按钮），保存后写入 uTools db（键 `translator_api_key`），组件挂载时读入 `apiKey` ref，翻译请求实时取该值作为 `Authorization: Bearer`
- Key 输入框 `type="password"` 掩码 + 显示/隐藏切换；「清除」按钮可移除本机 Key
- 未配置 Key 时状态栏显示「请先设置 DeepSeek API Key」，点击可直接展开设置面板
- 安全约束：Key 永不写入源码/日志/打包产物；401（Key 无效）、402（余额不足）、429（限流）均做中文错误提示

### 内置词典（本地直译）

模块：[src/dictionaries/](src/dictionaries/)（`index.js` 为唯一查询入口，`words.json` 为扁平词表）

- **命中即跳过 API**：`translate()` 中词典查询前置于缓存与 Key 校验，命中直接返回结果，**不调用 API、不写缓存、不计缓存统计**
- **懒加载（异步）**：`lookupDictionary(text)` / `dictionarySize()` 均返回 **Promise**，内部用动态 `import('./words.json')` 加载并缓存，整个会话只加载一次
  - ⚠️ **调用方必须 `await`**，否则拿到的是 Promise（恒为真值），会导致所有词条被误判为命中
  - ⚠️ **构建产物必须保持多文件**：`vite-plugin-singlefile` 会把动态 `import()` 一并内联，使懒加载彻底失效，故 `vite.config.js` 中已移除该插件（详见该文件注释与 [README](README.md) 的「构建与体积」）
  - 加载失败时捕获并 `console.warn`，返回 `null` 降级为「未命中」，**绝不阻断翻译**（由 API 兜底）
- **异步竞态防护**：`pendingSource` 与 `translate()` 在 `await` 后都要比对输入快照，输入已变则丢弃过期结果
- **零外部依赖**：不接受生态/语言/场景等任何选项，同样输入永远同样结果
- **不按语言分类**：词表扁平。绝大多数编程词汇跨语言通用，按语言分桶会造成同一词条「有时命中有时不命中」
- **不做生态适配**：只给出基础拼写（「接口」→ `Service`），不自动加 `I` 前缀 / `Async` 后缀，语言惯例由用户自行调整
- **结果同构**：返回与 LLM 输出一致的 `[{ chinese, variable, method, constant, class }]`，直接复用现有模板与校验
- **非法词条**：字段缺失/空数组会被 `isValidEntry` 判定非法并跳过（`console.warn`），不影响翻译
- **来源提示**：`pendingSource`（ref，异步更新）预判本次输入的路径，状态栏实时显示「内置词典直译 · 不消耗 API」或「将调用 API 翻译」；`resultSource`（`'dictionary' | 'cache' | 'api'`）驱动结果徽标与 tooltip
  - ⚠️ 词典查询须早于 API Key 校验，否则未配 Key 的用户会被挡在词典之外，与提示矛盾（`npm test` 第 5 组专门校验）
- **词表改动后必须运行 `npm test`**（[scripts/test-dictionary.mjs](scripts/test-dictionary.mjs)）：校验结构完整性、重复、命名规范、查询行为、懒加载产物与来源提示一致性，失败时非 0 退出
- 词条贡献规范见 [src/dictionaries/README.md](src/dictionaries/README.md)

### 帮助面板

- header 右侧问号按钮（`.btn-key` 复用）切换 `showHelp`，面板以 `<aside class="help-aside">` 渲染
- **采用右侧滑出浮层**（`position: fixed` + 320px 宽 + 遮罩），**不挤压主内容**：
  uTools 窗口通常 ~800px，若并排会把结果区（四类命名）压到 ~450px，明显变窄
- 遮罩 `.help-backdrop` 与 `Esc` 均可关闭；与 Key 设置面板**互斥**（`toggleHelp` / `openSettings` 互相关闭）
- 词条总数由 `dictionarySize()` **运行时**计算后展示，新增词条无需改文案

### 缓存机制

- 缓存 key：`translator_cache_${direction}_${input}`（基于方向 + 输入）
- 缓存文档含 `meta`（direction/input）供历史记录列表使用
- 缓存有效期：7 天（`CACHE_TTL`），读取时发现过期即删除；组件挂载时扫描清理过期条目及所有非当前格式的旧条目（无 `meta`、或 `meta` 含已废弃的 `context` 字段），不做向后兼容
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
- [src/config/api.ts](src/config/api.ts)：API 配置（仅 endpoint/model/CACHE_TTL，不含密钥）
- [src/dictionaries/index.js](src/dictionaries/index.js)：内置词典查询入口 + 命名约定表
- [src/dictionaries/words.json](src/dictionaries/words.json)：扁平词表数据（无语言维度，可提交）

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

### 安全红线

- **禁止**在任何客户端代码、配置文件或文档中写入真实 API Key
- 新增涉及外部服务的 Key 一律采用 BYOK（用户本机存储）或后端代理，不得硬编码进前端

### 文档参考

- [SRC/vue_uToolsAPI.md](SRC/vue_uToolsAPI.md)：uTools API 文档
