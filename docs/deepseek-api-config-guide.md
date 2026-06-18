# DeepSeek API 接入配置指南

> 通用文档，适用于任何需要接入 DeepSeek API 的前端 / Node.js 项目。

---

## 1. 配置文件结构

### 1.1 创建配置模板 `api.example.ts`

此文件**提交到 Git**，供团队成员参考格式：

```ts
/**
 * API 配置示例文件
 * 复制此文件为 api.ts 并填入你的 API Key
 *
 * 操作步骤：
 * 1. 复制本文件 → 重命名为 api.ts
 * 2. 将 apiKey 字段填入你的 DeepSeek API Key
 * 3. api.ts 已加入 .gitignore，不会被提交
 */

export const API_CONFIG = {
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',             // 模型标识符，见下方模型列表
  apiKey: 'sk-xxxxxxxxxxxx',          // ← 替换为你的 API Key
} as const;

/** 缓存有效期：7 天（按需调整） */
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
```

### 1.2 创建本地配置 `api.ts`

此文件**禁止提交到 Git**，每位开发者在本地维护自己的 Key：

```ts
export const API_CONFIG = {
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
  apiKey: 'sk-your-real-api-key-here', // ← 填入你的真实 Key
} as const;

export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
```

### 1.3 `.gitignore` 配置

```gitignore
# API 密钥配置（含敏感信息）
src/config/api.ts
```

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
    Authorization: `Bearer ${API_CONFIG.apiKey}`,
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
    Authorization: `Bearer ${API_CONFIG.apiKey}`,
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
        Authorization: `Bearer ${API_CONFIG.apiKey}`,
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

- [ ] 复制 `api.example.ts` → `api.ts`，填入 API Key
- [ ] 将 `src/config/api.ts` 加入 `.gitignore`
- [ ] 实现 `fetch` 调用，设置 `Authorization: Bearer ${apiKey}`
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
