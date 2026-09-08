/**
 * API 配置：DeepSeek 端点与模型常量（不含密钥）
 * 密钥由用户在设置面板填写，存于 uTools db（键：translator_api_key）
 */

export const API_CONFIG = {
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-v4-flash',
} as const;

/** 缓存有效期：7 天 */
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
