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
  endpoint: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-v4-flash', // DeepSeek-V3
  apiKey: 'sk-xxxxxxxxxxxx', // ← 替换为你的 API Key
} as const;

/** 缓存有效期：7 天 */
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
