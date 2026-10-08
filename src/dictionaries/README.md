# 内置词典

命中词条时**完全跳过 DeepSeek API** 直接返回结果：零延迟、零费用、离线可用。
未命中则自动回落到原有的「缓存 → API」流程，用户无感知。

**词典仅在中→英方向生效**（词表是中文 → 英文命名的映射）。

## 设计原则：零外部依赖

`lookupDictionary(text)` 是**纯函数**——同样的输入永远返回同样的结果。

它不接受生态、语言、场景等任何外部选项，这是刻意的：

| 曾经的做法                     | 产生的问题                                                                 |
| ------------------------------ | -------------------------------------------------------------------------- |
| 按语言分 `general` / `csharp`  | 「事件/属性/字段/实例/泛型/事务」在 Java/TS/Python 写法相同，却被塞进 C# 层 |
| 用生态选项决定是否命中         | 输入「委托」在通用生态 MISS、切到 C# 才 HIT；用户看到「切个按钮词典就变了」 |
| 用生态选项微调命名约定         | 为 5 条词的 `I` 前缀 / `Async` 后缀，在界面常驻一排 7 个选项，不成比例      |

**结论：词典只给出基础拼写**（「接口」→ `Service`）。
需要 `I` 前缀、`Async` 后缀这类语言惯例时，由用户自行调整——插件不猜。

## 文件组织

| 文件         | 说明                                 |
| ------------ | ------------------------------------ |
| `index.js`   | 查询入口，**唯一对外 API**           |
| `words.json` | 全部词条，扁平结构，无语言维度       |

## 词条结构

顶层 key 是**中文原文**（与输入 trim 后精确匹配），值为四个命名类型：

```json
{
  "用户名称": {
    "variable": [
      { "camelCase": "userName", "snake_case": "user_name", "PascalCase": "UserName" },
      { "camelCase": "username", "snake_case": "username", "PascalCase": "Username" }
    ],
    "method": [
      { "camelCase": "getUserName", "snake_case": "get_user_name", "PascalCase": "GetUserName" }
    ],
    "constant": [
      { "camelCase": "USER_NAME", "snake_case": "USER_NAME", "PascalCase": "USER_NAME" }
    ],
    "class": [
      { "camelCase": "UserName", "snake_case": "user_name", "PascalCase": "UserName" }
    ]
  }
}
```

### 硬性约束

`lookupDictionary()` 会校验每个词条，**不合法则跳过并打印警告**（不会让翻译崩溃）：

- 四个字段 `variable` / `method` / `constant` / `class` **全部存在**且均为**非空数组**
- 每个候选必须同时具备 `camelCase`、`snake_case`、`PascalCase` 三个**非空字符串**

### 哪些风格会被真正显示

UI 只渲染各类型有意义的风格，其余字段仍须填写（结构完整性），但**填什么都会被忽略**，建议按惯例填成与主风格一致：

| 类型       | 实际显示的风格                          | 惯例填法                    |
| ---------- | --------------------------------------- | --------------------------- |
| `variable` | camelCase / snake_case / PascalCase（另派生 kebab） | 三种风格各不相同 |
| `method`   | camelCase / snake_case / PascalCase     | 三种风格各不相同            |
| `constant` | **仅** snake_case（以 UPPER 展示）       | 三个字段统一填全大写下划线  |
| `class`    | **仅** PascalCase                        | 三个字段统一填 PascalCase   |

> ⚠️ 注意 `constant` 与 `class` 的惯例填法看起来"不合规"（如 `constant.camelCase` 是全大写的 `USER_NAME`），
> 这是**符合现有约定的**——它们只用于占位，实际渲染取上表指定的单一风格。

## 词条选取建议

- **候选数量**：`variable` / `method` 建议 1-2 个（常用优先），`constant` / `class` 1 个即可
- **命名质量**：优先业界惯用名（如「编号」用 `id`），缩写遵循通行写法
- **保持中立**：存基础拼写，**不要**预先加 `I` / `Async` 等语言专属缀
- **不要收录**生僻词或需要语境才能判断的词——这类交给 LLM 更合适

## 新增词条检查清单

- [ ] 中文 key 与用户实际输入一致（「手机」vs「手机号」这类近义词可各收一条）
- [ ] 四个字段齐全且非空
- [ ] 每个候选三种风格拼写正确
- [ ] `snake_case` 全小写下划线，`camelCase` 首字母小写，`PascalCase` 首字母大写
- [ ] **未预先添加**语言专属前缀/后缀（`I` / `Async`）
- [ ] JSON 语法正确：`node -e "JSON.parse(require('fs').readFileSync('src/dictionaries/words.json','utf8'))"`

## 设计说明

**为什么词典结果不写入缓存？**
词典是本地常量，"缓存"它只会占用 uTools db 空间、7 天后过期，还会稀释历史面板的
「缓存命中率」统计（该指标用于反映真实节省的 API 调用）。

**为什么词典先于 API Key 校验？**
词典是纯本地数据，未配置 Key 的用户也应能享受词典直译。

**体积影响**
词表以 JSON 模块 `import`，经 `vite-plugin-singlefile` 内联进 `dist/index.html`。
当前 116 条约带来 40KB 未压缩增量。若词条增至数千条，应改为 `import()` 懒加载。
