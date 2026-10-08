/**
 * 内置词典：单一扁平词表
 *
 * 设计原则：
 *   1. **不按语言分类**——绝大多数编程词汇（用户/订单/事件/属性/事务…）跨语言通用，
 *      按语言分桶会造成同一词条「有时命中有时不命中」。
 *   2. **不做生态适配**——命中的判定与返回结果**完全一致**，不因任何外部选项而变。
 *      词典只给出基础拼写（如「接口」→ Service），需要 I 前缀/Async 后缀等
 *      语言惯例由用户自行调整，不由插件猜测。
 */

import wordsData from './words.json';

/** 词条必须完整的命名类型字段 */
const REQUIRED_FIELDS = ['variable', 'method', 'constant', 'class'];

/** 命名候选必须完整的风格字段 */
const REQUIRED_STYLES = ['camelCase', 'snake_case', 'PascalCase'];

/**
 * 校验词条结构（防御手写 JSON 的笔误）。
 * 要求 4 个命名类型字段齐全且均为非空数组，每个候选含 3 种风格。
 */
function isValidEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  return REQUIRED_FIELDS.every((field) => {
    const options = entry[field];
    if (!Array.isArray(options) || options.length === 0) return false;
    return options.every(
      (option) =>
        option &&
        typeof option === 'object' &&
        REQUIRED_STYLES.every((style) => typeof option[style] === 'string' && option[style])
    );
  });
}

/**
 * 查找词条，返回与 LLM 输出同构的结果数组。
 *
 * 返回结构可直接赋给 translationResult，复用现有模板与校验逻辑：
 *   [{ chinese, variable, method, constant, class }]
 *
 * @param {string} text 用户输入（内部 trim）
 * @returns {Array|null} 命中返回结果数组，未命中返回 null
 */
export function lookupDictionary(text) {
  const key = typeof text === 'string' ? text.trim() : '';
  if (!key) return null;

  const entry = wordsData[key];
  if (entry === undefined) return null;

  if (!isValidEntry(entry)) {
    // 词条存在但结构非法：警告并放弃，避免脏数据导致翻译崩溃
    console.warn(`[dictionaries] 词条结构非法，已跳过: "${key}"`);
    return null;
  }

  // chinese 由 key 注入，避免在 JSON 中冗余存储
  return [{ chinese: key, ...entry }];
}

/** 词条总数（用于文档/统计展示） */
export function dictionarySize() {
  return Object.keys(wordsData).length;
}
