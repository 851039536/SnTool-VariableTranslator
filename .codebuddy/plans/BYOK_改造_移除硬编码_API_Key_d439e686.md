---
name: BYOK 改造：移除硬编码 API Key
overview: 将变量翻译插件从硬编码 DeepSeek Key 改为用户自带 Key（BYOK）方案：移除 api.ts 中的密钥，新增「设置」入口让用户填写自己的 key 并存储到 uTools db，运行时从 db 读取，彻底杜绝密钥随打包产物泄露。
design:
  styleKeywords:
    - Codex 极简
    - 卡片式
    - 描边按钮
    - 密码掩码
    - 一致性
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 14px
      weight: 600
    subheading:
      size: 11px
      weight: 600
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#3b82f6"
      - "#2563eb"
    background:
      - "#ffffff"
      - "#f9fafb"
      - "#303133"
    text:
      - "#1f2937"
      - "#6b7280"
      - "#ffffff"
    functional:
      - "#10b981"
      - "#dc2626"
todos:
  - id: config-cleanup
    content: 改造配置层：api.ts 移除 apiKey、删除 api.example.ts、.gitignore 移除排除项
    status: completed
  - id: byok-index
    content: index.vue 实现 BYOK：key ref 与 db 读写清除、Authorization/isApiConfigured 改造、设置面板与状态栏文案
    status: completed
    dependencies:
      - config-cleanup
  - id: byok-style
    content: icons.ts 注册 key 图标，index.scss 新增设置面板样式
    status: completed
    dependencies:
      - byok-index
  - id: docs-sync
    content: 同步 AGENTS.md、README.md、docs/deepseek-api-config-guide.md 为 BYOK 说明
    status: completed
    dependencies:
      - byok-index
---

## 产品概述

将插件从「作者硬编码 API Key」改为「用户自带 Key（BYOK）」模式。插件打包产物中不再包含任何 DeepSeek 密钥，从根本上杜绝 key 被直接提取或反代的泄露风险。用户在插件内填写、保存自己的 DeepSeek API Key，密钥仅存储在用户本机 uTools 数据库中。

## 核心功能

- 移除 `api.ts` 中的硬编码真实密钥，仅保留非敏感的 endpoint、model、缓存时长等常量
- 新增 API Key 设置面板：用户可填写、保存、清除自己的 DeepSeek Key，输入框默认掩码并支持显示/隐藏
- Key 通过 uTools db（键 `translator_api_key`）持久化，插件启动时自动读取，翻译请求实时使用最新值
- 未配置 Key 时状态栏显示引导文案，点击可直接展开设置面板
- 错误提示细化：401 提示 Key 无效、402 提示余额不足，便于用户自行排查
- 同步更新项目文档（AGENTS.md、README.md、配置指南），去除旧的「复制 api.example.ts 填 key」流程

## 技术栈

- 前端：Vue 3 + SCSS（沿用现有，不引入新依赖）
- 图标：@iconify/vue + @mdi/js（沿用现有）
- 数据持久化：uTools db（`window.utools.db`）

## 实现方案

### 总体思路

把 API Key 从「编译期常量」改为「运行期响应式状态」。`api.ts` 只保留非敏感的 `endpoint`、`model`、`CACHE_TTL`；Key 由用户在设置面板填写后写入 uTools db，组件挂载时读回并存入 `ref`，翻译请求时从该 `ref` 取值。打包产物中不再出现任何密钥。

### 关键决策

- **复用 uTools db 而非 localStorage**：与现有 `translator_cache_*`、`translator_cache_stats` 存储模式一致，复用已有 `dbUpsert` 工具函数
- **Key 使用 `ref` 状态**：用户在运行期保存/清除后，翻译请求能即时生效
- **设置入口复用 header ghost 按钮**：沿用 `%btn-ghost-icon` 模式（`btn-theme`/`btn-swap` 同款），保持视觉一致
- **密码输入框 `type="password"` + 显示/隐藏切换**：避免旁人窥屏
- **错误提示细化**：401/402 分别映射为「Key 无效」「余额不足」，契合 BYOK 场景

### 数据流

组件挂载 → `window.utools.db.get('translator_api_key')` → `apiKey` ref → `isApiConfigured` 派生 → 翻译守卫 → `callTranslateApi` 取 `apiKey.value` 作为 Authorization → 保存时 `dbUpsert` 写回 → 清除时 `db.remove`

## 实现细节

- `api.ts` 移除 `apiKey` 字段后仍导出 `API_CONFIG`（endpoint/model）与 `CACHE_TTL`，保持 import 结构最小改动
- db 文档形状：`{ _id: 'translator_api_key', data: { apiKey: 'sk-...' } }`，保存时复用现有 `dbUpsert` 处理 `_rev`
- `callTranslateApi` 中 `Authorization: Bearer ${apiKey.value}`；`isApiConfigured = computed(() => !!apiKey.value)`
- 状态栏未配置文案由「请在 src/config/api.ts 中配置 API Key」改为「请先设置 DeepSeek API Key」，点击展开设置
- 禁止在 console/日志中输出 Key；保存成功仅提示「已保存」，不回显完整密钥
- `index.vue` 顶部补充文件头功能说明注释（遵循项目规则）

## 目录结构

```
project-root/
├── src/config/api.ts                        # [MODIFY] 移除 apiKey，仅保留 endpoint/model/CACHE_TTL，不再含密钥
├── src/config/api.example.ts                # [DELETE] BYOK 后「复制填 key」流程废弃，文件删除
├── src/config/icons.ts                      # [MODIFY] 新增 key 图标（如 mdiKeyVariant/mdiKeyOutline）
├── src/VariableTranslator/index.vue         # [MODIFY] BYOK 逻辑 + 设置面板 UI + 状态栏引导文案
├── src/VariableTranslator/index.scss        # [MODIFY] 新增设置面板相关样式，遵循 Codex Token
├── .gitignore                               # [MODIFY] 移除 src/config/api.ts 排除行（文件已不含密钥）
├── AGENTS.md                                # [MODIFY] 更新模型配置、数据持久化、核心实现细节为 BYOK 描述
├── README.md                                # [MODIFY] 更新安装方法与 API 配置章节
└── docs/deepseek-api-config-guide.md        # [MODIFY] 修正配置模板与接入 Checklist 中已废弃的 api.example.ts 流程
```

## 设计风格

设置面板沿用项目现有 Codex 极简风格：卡片式布局、1px 细边框、6px 圆角、0.12s 过渡，与翻译区视觉完全一致，不引入新风格。

## 布局与交互

- 头部右侧新增齿轮按钮（ghost 描边样式），与主题切换、方向切换按钮并列
- 点击齿轮在输入卡片上方展开「API Key 设置」卡片，再次点击收起
- 卡片内自上而下：标题、掩码密码输入框（右侧显示/隐藏切换）、保存与清除按钮、DeepSeek 平台获取 Key 的提示链接
- 未配置时状态栏显示警示文案，点击状态栏可直接展开设置面板
- 保存成功后输入框与面板收起，状态栏切换为「就绪」状态