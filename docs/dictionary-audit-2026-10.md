# 词典冗余审查报告（2026-10）

> 范围：`src/dictionaries/words.json` 全量 782 条（审查时点）。
> 结论先行：**无破坏性问题**——顶层 key 无重复、无结构非法词条、`npm test` 39 项全过。
> 冗余问题集中在三类：**错译/示例失真**、**复合词条与基础词条"同英文"**、**候选超标**。
> 本次共修复 51 条、删除 1 条，并新增 4 个领域片段约 190 条（见文末汇总）。

## 审查方法

| 手段 | 说明 |
| --- | --- |
| 结构扫描 | 复用 `npm test` 口径 + 独立校验器（派生一致性、constant/class 占位约定） |
| 同构检测 | 四类字段完全相同的词条分组（测试 2.4 的同义词口径） |
| 值级撞车 | 不同中文词的 `variable[0].camelCase` 相同（本次新增为测试告警项 2.5） |
| 复合拆解 | 复合词能否被两个已收录词完整拆出、英文是否体现修饰成分 |
| 语义抽核 | 对 71 个疑点词条逐一人工核对中文语义与英文命名 |

## 发现与处置

### 1. 错译 / 示例失真（已修复 30 条）

历史批量生成时把**具体示例**写进了词条，违反 README「存基础拼写、保持中立」原则：

| 词条 | 原值（问题） | 修复后 |
| --- | --- | --- |
| 枚举 | `status` / class `OrderStatus`（给的是"订单状态"示例） | `enumType` / `EnumType` |
| 结构体 | class `Point` | `Struct` |
| 控制器 | class `UserController` | `Controller` |
| 数据传输对象 | class `UserDto` | `Dto` |
| 视图模型 | class `UserViewModel` | `ViewModel` |
| 映射 | class `UserMapper` | `Mapper` |
| 中间件 | class `AuthMiddleware` | `Middleware` |
| 序列化 | class `JsonSerializer` | `Serializer` |
| 数据库上下文 | class `AppDbContext` | `DbContext` |
| 扩展方法 | method `toDto` / class `StringExtensions` | `extensionMethod` / `ExtensionMethod` |
| 异步 | method `getUser`（明显生成错误） | `runAsync` |

### 2. 复合词条丢失修饰语义 / 与基础词同英文（已修复 15 条）

词典是**精确匹配**，复合词条本不冗余（如「用户列表」→`userList` 无法由「用户」拼出）。
真正的问题是**英文没体现修饰成分**，与基础词完全撞车：

| 词条 | 原值 | 修复后 |
| --- | --- | --- |
| 地址列表 | `host`（错为主机） | `addressList` |
| 消息内容 | `message`（与「消息」同） | `messageContent` |
| 文档文件 | `document`（与「文档」同） | `documentFile` |
| 命名空间隔离 | `namespace`（与「命名空间」同） | `namespaceIsolation` |
| 标签版本 | `tag`（与「标签」同） | `versionTag` |
| 提交事务 / 回滚事务 | variable `transaction`（丢"提交/回滚"） | `commitTransaction` / `rollbackTransaction` |
| 集合元素 | `set`（与「设置」混） | `setElement` |
| 集合初始化 | `initializer`（丢"集合"） | `collectionInitializer` |
| 同步数据 | `synchronize`（动词做名词） | `syncData` |
| 已删除消息 | `trash`（丢"消息"） | `deletedMessage` |
| 通知消息 | `notifyMessage`（生造） | `notificationMessage` |

### 3. 跨域同英文撞车（已修复 12 条）

不同中文概念给出同一个英文，用户无从区分：

| 撞车对 | 处置 |
| --- | --- |
| 位置 / 职位 → `position` | 职位 → `jobTitle` |
| 报表 / 举报 → `report` | 举报 → `flag` |
| 检出 / 结算 → `checkout` | 结算 → `settlement`（检出保留 `checkout`） |
| 图片 / 镜像 → `image` | 保留（Docker 镜像与图片惯用同名，已接受） |
| 进程 / 流程 → `process` | 流程 → `workflow` |
| 索引 / 序号 → `index` | 序号 → `serialNumber` |
| 广播 / 群发 → `broadcast` | 群发 → `massSend` |
| 读取 / 已读 → `read` | 已读 → `isRead` |
| 数量 / 统计 → `count` | 统计 → `statistics` |
| 求和 / 总和 → `sum` | 总和 → `totalSum` |
| 详情 / 明细 → `detail` | 明细 → `breakdown` |
| 摘要 / 汇总 → `summary` | 汇总 → `aggregation` |
| 设置 / 集合元素 → `set` | 设置 → `settings`（集合元素见上） |
| 锁 | `lockObject`/`Locker` → `lock`/`Lock` |

### 4. 候选超标与术语更新（已修复 8 条）

- 3 候选超标（README 建议 1-2）：弹窗、间距、置顶、路由、模拟、耗时、从节点、流水 → 均收敛为 2 候选
- 术语更新：从节点 `slave` → `follower`（slave 已是弃用术语）
- 生僻生造词修正：跨站 `filterCrossSite` → `preventXss`；越权 `checkUnauthorized` → `detectUnauthorized`

### 5. 删除（1 条）

- `已完成执行`：与「执行中/已完成」高度重复，英文 `finished` 生硬，输入概率极低

### 6. 判定为「非冗余、保留」的疑似项

- **4 组完全同构词条**（用户名==用户名称、账户==账号、接口==服务、新增==创建）：词典按精确输入命中，同义词各占一条是覆盖面所需，README 已声明为期望行为
- **13 个单字词条**（年/月/日/行/列/表/栈/堆…）：精确匹配下不会误命中，且都是高频变量词
- **216 条 method 与 variable 同名**：动词词条（获取→get）的固有形态，非冗余
- **75 个可拆解复合词**：精确匹配词典的覆盖面来源，只要英文体现了修饰成分就保留

## 测试口径增强

`scripts/test-dictionary.mjs` 新增 **2.5 跨词条首选变量名撞车**（告警级）：
`variable[0].camelCase` 相同的不同词条会被列出，作为词表冗余度的长期观察指标。
本次修复前该口径下有 33 组撞车，修复后降至 21 组（其余为「代理/代理模式」「桩/存根」这类可接受的近义收录）。

## 扩词汇总

| 片段 | 领域 | 条数 |
| --- | --- | --- |
| fragment-algo-ds | 数据结构与算法 | 45 |
| fragment-patterns-oop | 设计模式与语言基础 | 48 |
| fragment-infra | 安全/测试/DevOps/数据库 | 58 |
| fragment-platform | 缓存/并发/分布式/运行时 | 40 |
| fragment-lead-web | 前端组件/网络协议（Lead 补收） | 20 |
| **合计新增** | | **211** |

词条总数：782 → **992**（新增 211、修复 52、删除 1；词典 chunk 体积见 README「构建与体积」表）。
验证：`npm test` 39 项全部通过；构建产物多文件形态不变，词典独立 chunk 正常懒加载。
