# DeepSeek API 接入配置指南

> 通用文档，适用于任何需要接入 DeepSeek API 的前端 / Node.js 项目。

> **本项目现状（BYOK）**：SnTool-VariableTranslator 已改为「用户自带 Key」——不再提供 `api.example.ts` 模板，`src/config/api.ts` 只含 endpoint/model 常量，不含任何密钥。用户 Key 通过插件设置面板写入本机 uTools db（键 `translator_api_key`），请求时读取并置于 `Authorization` 头。下文示例中的 `apiKey` 均指**运行期变量**，请勿硬编码。

---

## 1. 配置文件结构

> ⚠️ 在**随客户端分发**的代码（uTools/浏览器插件、桌面应用前端）中，任何形式的硬编码 Key（含 `api.example.ts` 模板、混淆、加密产物）都会被提取。密钥只能存在于：用户本机存储（BYOK）或持有密钥的服务端（代理）。

### 1.1 方式 A：用户自带 Key（BYOK，本项目采用）

`src/config/api.ts` 仅声明非敏感常量，可正常提交仓库：

```ts
export const API_CONFIG = {
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-v4-flash',  // 当前模型（非思考模式）
} as const;

export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
```

Key 由用户在插件设置面板填写，写入本机 uTools db 并读回运行期状态：

```ts
// 保存：window.utools.db.put({ _id: 'translator_api_key', data: { apiKey: 'sk-xxx' } })
// 加载：const doc = window.utools.db.get('translator_api_key')
//       const apiKey = doc?.data?.apiKey || ''   // 运行期 ref，非源码常量
// 请求：Authorization: `Bearer ${apiKey}`
```

### 1.2 方式 B：后端代理（作者代付 / 免配置分发必选）

需要“用户零配置、作者代付”的体验时，Key 只能放在你的后端服务器/云函数，前端把文本发给你的服务，由服务端转发 DeepSeek。纯客户端方案不具备此安全前提。

### 1.3 反模式：把 Key 写进源码 / 配置文件

将密钥写入任何客户端文件（含 `api.example.ts`、`.env`、本地常量、混淆/加密产物）都会被提取并滥用。BYOK 之后本项目已移除该类流程与 `.gitignore` 排除项。

---

## 2. 可用模型

| 模型标识符         | 说明                          | 适用场景           |
| ------------------ | ----------------------------- | ------------------ |
| `deepseek-chat`    | DeepSeek-V3（通用对话模型）   | 日常对话、代码生成 |
| `deepseek-reasoner`| DeepSeek-R1（推理增强模型）   | 复杂逻辑推理       |

> **省钱技巧**：对于简单任务（翻译、格式化、分类），使用 `deepseek-chat` 并关闭思考模式即可，无需 `deepseek-reasoner`。

---

## 3. API 调用方式

### 3.1 基础请求（Fetch）

```ts
import { API_CONFIG } from '@/config/api';

const response = await fetch(API_CONFIG.endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`, // apiKey 为运行期变量（BYOK 存本机 / 后端下发），勿硬编码
  },
  body: JSON.stringify({
    model: API_CONFIG.model,
    messages: [
      { role: 'system', content: '你是一个专业的翻译助手' },
      { role: 'user', content: '你好' },
    ],
    temperature: 0.7,       // 0~2，越低越确定，越高越有创意
    max_tokens: 2048,       // 最大输出 token 数
  }),
});

if (!response.ok) {
  throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
}

const data = await response.json();
const resultText = data.choices?.[0]?.message?.content || '';
```

### 3.2 JSON 结构化输出

当需要模型返回 JSON 格式时，启用 `response_format`：

```ts
const response = await fetch(API_CONFIG.endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`, // apiKey 为运行期变量（BYOK 存本机 / 后端下发），勿硬编码
  },
  body: JSON.stringify({
    model: API_CONFIG.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 300,
    response_format: { type: 'json_object' },  // 强制输出合法 JSON
    thinking: { type: 'disabled' },            // 关闭思考模式，节省 token
  }),
});
```

> **注意**：使用 `response_format: { type: 'json_object' }` 时，prompt 中必须明确要求模型输出 JSON，否则可能报错。

### 3.3 非思考模式（节省 Token）

DeepSeek 模型支持思考模式（Chain-of-Thought），默认开启后会消耗额外的 `reasoning_token`。对于简单任务可以关闭：

```ts
thinking: { type: 'disabled' }  // 关闭思考模式
```

| 模式      | 配置                             | 适用场景               |
| --------- | -------------------------------- | ---------------------- |
| 关闭思考  | `thinking: { type: 'disabled' }` | 翻译、格式化、分类     |
| 开启思考  | 默认（不传 thinking 字段）       | 复杂推理、数学、编程   |

---

## 4. 响应结构

DeepSeek API 兼容 OpenAI 格式，标准响应如下：

```json
{
  "id": "chatcmpl-xxxx",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{\"result\": \"hello\"}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 20,
    "total_tokens": 70
  }
}
```

### 安全解析响应

```ts
const data = await response.json();
const resultText = data.choices?.[0]?.message?.content || '';

// 如果期望 JSON 输出，需要二次解析
try {
  let jsonText = resultText.trim();
  // 移除可能的 markdown 代码块包裹
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }
  const parsed = JSON.parse(jsonText);
  // 使用 parsed ...
} catch (e) {
  console.error('JSON 解析失败:', e);
}
```

---

## 5. 缓存策略

为减少 API 调用次数和费用，建议实现本地缓存：

```ts
import { CACHE_TTL } from '@/config/api';

// ---- 缓存读取 ----
function loadFromCache(key: string) {
  const raw = localStorage.getItem(`cache_${key}`);
  if (!raw) return null;

  const { data, timestamp } = JSON.parse(raw);
  if (Date.now() - timestamp > CACHE_TTL) {
    localStorage.removeItem(`cache_${key}`);  // 过期清除
    return null;
  }
  return data;
}

// ---- 缓存写入 ----
function saveToCache(key: string, data: unknown) {
  localStorage.setItem(`cache_${key}`, JSON.stringify({
    data,
    timestamp: Date.now(),
  }));
}
```

### 缓存 Key 设计建议

| 策略         | Key 格式                        | 说明                   |
| ------------ | ------------------------------- | ---------------------- |
| 输入匹配     | `cache_${inputText}`            | 相同输入命中缓存       |
| 输入+模型    | `cache_${model}_${inputText}`   | 切换模型后重新请求     |
| 哈希匹配     | `cache_${md5(inputText)}`       | 长文本用哈希缩短 Key   |

---

## 6. 错误处理

### 6.1 常见错误码

| HTTP 状态码 | 含义                    | 处理方式               |
| ----------- | ----------------------- | ---------------------- |
| 401         | API Key 无效或过期      | 提示用户检查 Key       |
| 402         | 余额不足                | 提示用户充值           |
| 429         | 请求频率超限            | 延迟重试或降低并发     |
| 500         | 服务端内部错误          | 稍后重试               |
| 503         | 服务过载                | 稍后重试               |

### 6.2 推荐的错误处理模式

```ts
async function callDeepSeek(prompt: string) {
  try {
    const response = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`, // apiKey 为运行期变量（BYOK 存本机 / 后端下发），勿硬编码
      },
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      switch (response.status) {
        case 401: throw new Error('API Key 无效，请检查配置');
        case 402: throw new Error('API 余额不足，请充值');
        case 429: throw new Error('请求过于频繁，请稍后重试');
        default:  throw new Error(`请求失败: ${response.status}`);
      }
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    if (e instanceof TypeError && e.message.includes('fetch')) {
      throw new Error('网络连接失败，请检查网络');
    }
    throw e;
  }
}
```

---

## 7. 快速接入 Checklist

- [ ] 确认客户端代码**不含**任何 API Key（BYOK：Key 存本机 uTools db，或由后端代理持有）
- [ ] 实现 `fetch` 调用，设置 `Authorization: Bearer ${apiKey}`（运行期变量）
- [ ] 根据任务决定是否启用 `response_format` 和 `thinking`
- [ ] 实现缓存层，减少重复调用
- [ ] 处理常见错误码（401 / 402 / 429）
- [ ] 设置合理的 `temperature` 和 `max_tokens`

---

## 8. API Key 获取

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册/登录账号
3. 进入 **API Keys** 页面
4. 点击 **创建 API Key**
5. 复制生成的 `sk-xxxx` 格式的 Key

> API Key 是敏感信息，**切勿**提交到 Git 仓库或暴露在客户端代码中（生产环境应通过后端代理转发请求）。
