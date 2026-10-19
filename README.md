# 中文变量名翻译助手 (VariableTranslator)

一个基于 Vue 3 和 AI 技术的 uTools 插件，支持**中文 → 英文变量名**和**英文变量名 → 中文释义**双向翻译。

## 功能特点

### 核心功能

- **双向翻译**：中→英生成编程命名，英→中解析变量含义
- **内置词典直译**：常见词本地命中即返回，**零延迟、零费用、离线可用**，未命中自动回落 AI；词表扁平、不分语言，命中结果稳定可预期（当前收录 990+ 条编程词汇）
- **词表浏览**：「词表」页签按 10 个类别浏览内置词条，支持关键词筛选，点击任意词条回填并立即翻译（数据独立 chunk 懒加载，不增启动体积）
- **多种命名风格**：支持 camelCase、snake_case、PascalCase 三种命名规范
- **多种命名类型**：提供变量（Variable）、方法（Method）、常量（Constant）、类（Class）四种类型
- **AI 驱动**：调用 DeepSeek 模型（`deepseek-v4-flash`，非思考模式）翻译未收录词汇；**插件不内置 Key**，需自备（见「API 配置」）
- **翻译缓存**：自动缓存翻译结果（7 天有效期），减少重复请求
- **历史记录**：保留最近 7 天的翻译，可点击回填重查
- **内置帮助**：顶部问号按钮展开侧边说明（来源含义、快捷键、使用要点）
- **零配置**：无需选择语言、生态或场景，输入即翻译

### 用户体验

- 深色/亮色主题切换
- 输入防抖自动翻译（2.5 秒），Ctrl+Enter 立即翻译
- 实时字符计数与长度限制提示（中文 ≤15 字 / 英文 ≤30 字符）
- 一键复制命名到剪贴板
- 英→中模式提供词根拆解分析

### 技术规范

- Codex 设计体系：全局 SCSS Token，禁止硬编码
- Iconify 图标系统：按需加载 MDI 图标，禁止 emoji
- 代码分包：主包与内置词典分离，词典**按需懒加载**（启动仅解析主包，见下方「构建与体积」）
- 构建后自动清理调试文件（.map / .d.ts 等）
- API Key 安全：用户自带 Key（BYOK），仅存本机 uTools db，打包产物零密钥

## 安装方法

### 方法一：通过 uTools 插件市场安装

1. 打开 uTools
2. 点击插件市场
3. 搜索 "变量翻译"
4. 点击安装

### 方法二：本地安装

uTools 加载的插件目录必须**同时包含 `plugin.json` 与 `index.html`**。
本仓库的 `public/` 只有 `plugin.json`、`logo.png`、`preload/`，**没有 `index.html`**
（真正的入口在仓库根目录，构建时才产出到 `dist/`）——因此**不能直接把 `public/` 当作插件目录**。

**方式 A：构建后加载（推荐）**

```bash
npm install
npm run build
```

在 uTools 中添加本地插件，指向 **`dist/` 目录**（构建后它同时含 `plugin.json` 与 `index.html`）。

**方式 B：开发模式（改代码即时生效，无需重新构建）**

```bash
npm install
npm run dev
```

`public/plugin.json` 的 `development.main` 已指向 `http://localhost:5173`，
uTools 会加载 Vite 开发服务器。插件目录仍指向 `public/`——此方式下它只需提供
`plugin.json`，实际页面由开发服务器提供。

> ⚠️ 无论哪种方式，首次使用都需填入自己的 API Key（见下方「API 配置」）。

## 使用指南

### API 配置（用户自带 Key / BYOK）

插件**不再内置任何 API Key**（打包产物中不含密钥），请配置你自己的 DeepSeek API Key：

1. 打开插件，点击右上角**钥匙按钮**，展开「DeepSeek API Key」设置面板
2. 前往 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建并复制 `sk-` 开头的 Key
3. 粘贴后点击**保存**——Key 仅保存在本机 uTools 数据库，不会写入插件包或上传
4. 需要更换或移除时，再次打开设置面板操作即可

> 未配置 Key 时，输入卡片底部会显示「请先设置 DeepSeek API Key」，点击即可直达设置面板。
> 例外：若输入**命中了内置词典**，状态栏会优先显示「内置词典直译 · 不消耗 API」——
> 因为这种情况本就不需要 Key。

### 基本使用

1. 在 uTools 中输入命令：`变量翻译` 或 `translator`
2. 输入中文（如：用户名称）或英文变量名（如：getUserName）
3. 点击切换按钮可切换翻译方向（中→英 / 英→中）
4. 从结果中选择合适的命名，点击复制按钮

### 结果来源标识

插件会**提前告知**本次翻译走哪条路径，无需等到出结果：

- **输入时**：状态栏实时显示「内置词典直译 · 不消耗 API」或「将调用 API 翻译」
- **出结果后**：结果卡片徽标标明实际来源

| 徽标           | 含义                       | 是否消耗 API |
| -------------- | -------------------------- | ------------ |
| **内置词典**   | 命中本地词表直接返回       | 否（零费用） |
| **来自缓存**   | 命中 7 天内缓存            | 否           |
| **API 翻译**   | 调用 DeepSeek 模型实时翻译 | 是           |

> 词典命中时**不会发起任何网络请求**，未配置 API Key 也能正常使用。
> 想扩充词表见 [src/dictionaries/README.md](src/dictionaries/README.md)。

### 内置帮助

点击顶部**问号按钮**可展开侧边帮助面板，内容包含：

- **翻译来源说明**：三种来源（内置词典 / 缓存 / API）的含义与是否计费
- **快捷键**：Enter、Shift+Enter、Ctrl+K
- **使用要点**：输入长度、四类命名、复制方式
- **API Key**：BYOK 说明与直达设置入口

帮助面板从**右侧滑出**，覆盖在内容之上（不挤压翻译结果区），点击遮罩或按 `Esc` 关闭。

### 键盘快捷键

| 快捷键 | 功能 |
| ------ | ---- |
| `Enter` | 立即翻译（`Shift+Enter` 换行） |
| `Ctrl+Enter` / `Cmd+Enter` | 立即翻译 |
| `Ctrl+K` / `Cmd+K` | 清空输入**与结果** |
| `Esc` | 关闭已展开的帮助 / Key 设置面板 |

> 输入 2.5 秒无操作后自动翻译；来自 uTools 划词的输入则在 100ms 后立即翻译。

## 技术栈

| 技术 | 版本 | 用途 |
| ---- | ---- | ---- |
| Vue | ^3.5.13 | 前端框架 |
| Vite | ^6.0.11 | 构建工具 |
| Sass (SCSS) | ^1.101.0 | CSS 预处理 + Codex Token |
| @iconify/vue | ^5.0.1 | 图标组件 |
| @mdi/js | ^7.4.47 | MDI 图标 SVG path（tree-shakeable） |
| vite-plugin-singlefile | ^2.3.3 | 单文件构建（已**停用**，见下方说明） |
| uTools API | - | 插件平台集成 |

## 开发命令

```bash
npm run dev     # 开发模式（http://localhost:5173）
npm run build   # 生产构建，输出到 dist/
npm test        # 内置词典测试（结构 / 重复 / 命名规范 / 查询行为 / 懒加载产物 / 分类数据）
```

> `npm test` 通过时退出码 0，存在失败项时为 1，可用于 CI 或 pre-commit。
> 不阻断的「同义词条」（如 账户/账号 输出相同）只告警，不影响退出码。

## 项目结构

```
SnTool-VariableTranslator/
├── index.html                     # Vite 入口（构建时产出到 dist/）
├── public/                        # 静态资源（构建时原样复制到 dist）
│   ├── preload/                   # uTools 预加载脚本
│   │   ├── services.js
│   │   └── package.json           # preload 依赖声明
│   ├── logo.png                   # 插件图标 (130×130)
│   └── plugin.json                # uTools 插件配置
├── docs/
│   └── deepseek-api-config-guide.md  # DeepSeek API 接入指南
├── scripts/
│   ├── clean-dist.mjs             # 构建后清理脚本
│   └── test-dictionary.mjs        # 内置词典测试（npm test）
├── src/
│   ├── config/
│   │   ├── api.ts                 # API 端点/模型常量（不含密钥，可提交）
│   │   └── icons.ts               # Iconify 图标注册表
│   ├── dictionaries/              # 内置词典（命中即跳过 API）
│   │   ├── index.js               # 查询入口（异步懒加载）
│   │   ├── words.json             # 扁平词表（不按语言分类）
│   │   ├── categories.json        # 分类索引（词表页按类别浏览）
│   │   └── README.md              # 词条贡献规范
│   ├── VariableTranslator/
│   │   ├── index.vue              # 核心组件
│   │   └── index.scss             # 组件样式
│   ├── App.vue                    # 应用入口组件
│   ├── main.js                    # 应用入口
│   ├── main.scss                  # 全局样式 + CSS 变量
│   ├── vue_uToolsAPI.md           # uTools API 参考
│   └── _variables.scss            # Codex 设计 Token
├── .gitignore
├── jsconfig.json
├── package.json
├── vite.config.js
└── AGENTS.md                      # AI 辅助开发规则
```

## 构建与发布

```bash
npm run build
```

构建产物输出到 `dist/` 目录，并自动清理 `.map`、`.d.ts`、`LICENSE`、`README` 等调试/文档文件。

### 构建与体积

产物为**多文件**（`index.html` + `assets/`），不再是单文件内联：

| 产物 | 体积（实测） | 加载时机 |
| ---- | ------------ | -------- |
| `assets/index-*.js` | ~128 KB | 插件启动 |
| `assets/style-*.css` | ~22 KB | 插件启动 |
| `assets/dict-*.js` | ~362 KB | **首次翻译时按需加载** |

**加词不影响启动**：词典独立成 chunk，词条增长只增大该 chunk（首次查词时加载），主包体积恒定。

**为什么放弃单文件构建**：内置词典已达数百条。单文件方案要求全部内联，插件每次启动都要解析整包；
而实测发现 `vite-plugin-singlefile` 会把**动态 `import()` 也一并内联**，使词典懒加载完全失效
（验证方法：动态 import + singlefile 的产物仍是单个 HTML，数据仍内联）。

因此移除该插件，让词典独立成 chunk：**启动只需解析 ~150 KB，而非整包 ~512 KB**。

> 注：以上为一次构建的实测值，会随词条增删小幅浮动；构建后可直接查看 `dist/assets/` 下各文件大小。

> ⚠️ 发布时需复制**整个 `dist/` 目录**（含 `assets/`），不能只拷 `index.html`。
> 相对路径由 `vite.config.js` 的 `base: './'` 保证，uTools 下可正常加载。
>
> ⚠️ **`dist/preload/node_modules/` 体积约 4 MB（1600+ 文件）**，由 `public/preload/` 原样复制而来，
> `clean-dist.mjs` **不会**清理它。若你确认 preload 运行时不依赖这些包，发布前应手动删除以缩小分发包；
> 若保留，请注意分发包体积。**这是当前的已知问题，尚未修正。**

发布前检查 `dist/` 目录不应包含：`.git/`、`.gitignore`、`.github/`、`.vscode/`、`*.map`、`*.gz`。
