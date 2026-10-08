/**
 * 内置词典：单一扁平词表 + 懒加载
 *
 * ## 为什么懒加载
 *
 * 词表已达数百条、体积数百 KB。若静态 import，插件启动时就要解析全部数据，
 * 而绝大多数会话只查几个词。改为动态 `import()` 后，词表独立成 chunk，
 * **仅在首次查词时才加载**。
 *
 * ⚠️ 该机制依赖构建产物为多文件：`vite-plugin-singlefile` 会把动态 import
 * 一并内联，使懒加载完全失效（实测产物仍是单个大 HTML）。因此 `vite.config.js`
 * 中已移除该插件——详见该文件注释。
 *
 * ## 设计原则
 *
 * 1. **不按语言分类**——编程词汇跨语言通用，按语言分桶会导致「有时命中有时不命中」
 * 2. **不做生态适配**——只给基础拼写（「接口」→ Service），语言惯例由用户自行调整
 * 3. **异步查询**——统一返回 Promise，调用方 await；加载失败静默降级为未命中
 */

/** 词表必须完整的命名类型字段 */
const REQUIRED_FIELDS = ['variable', 'method', 'constant', 'class'];

/** 命名候选必须完整的风格字段 */
const REQUIRED_STYLES = ['camelCase', 'snake_case', 'PascalCase'];

/** 词表缓存（模块级，整个会话只加载一次） */
let wordsPromise = null;

/**
 * 加载词表（惰性、单次）。失败时返回 null，使查询降级为「未命中」而不是抛错。
 * @returns {Promise<object|null>}
 */
function loadWords() {
  if (!wordsPromise) {
    wordsPromise = import('./words.json')
      .then((m) => m.default || m)
      .catch((e) => {
        // 加载失败不应阻断翻译：返回 null，后续一律视为未命中，交由 API 兜底
        console.warn('[dictionaries] 词表加载失败，已降级为不使用词典:', e?.message || e);
        return null;
      });
  }
  return wordsPromise;
}

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
 * @returns {Promise<Array|null>} 命中返回结果数组，未命中返回 null
 */
export async function lookupDictionary(text) {
  const key = typeof text === 'string' ? text.trim() : '';
  if (!key) return null;

  const words = await loadWords();
  if (!words) return null;

  const entry = words[key];
  if (entry === undefined) return null;

  if (!isValidEntry(entry)) {
    // 词条存在但结构非法：警告并放弃，避免脏数据导致翻译崩溃
    console.warn(`[dictionaries] 词条结构非法，已跳过: "${key}"`);
    return null;
  }

  // chinese 由 key 注入，避免在 JSON 中冗余存储
  return [{ chinese: key, ...entry }];
}

/**
 * 词条总数。需先加载词表，故为异步。
 * @returns {Promise<number>}
 */
export async function dictionarySize() {
  const words = await loadWords();
  return words ? Object.keys(words).length : 0;
}
