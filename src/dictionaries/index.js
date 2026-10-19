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

/** 分类数据缓存（模块级，首次打开「词表」页时才加载） */
let categoriesPromise = null;

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

// ── 英→中 反查 ──────────────────────────────────────────
//
// 词表是「中文 → 英文命名」的单向映射；反查把英文命名切词后逐段比对词表。
// 与正向查询同一设计原则：纯函数、全部段命中才返回（部分命中会给出误导性释义）。

/**
 * 英文索引缓存（模块级）：小写英文词段 -> 中文 key 集合。
 * 仅为**单字段单词条**的段建立映射：索引时若某段已存在且中文不同，
 * 说明该段是多义词（如 get 出现在几乎所有 getXxx 方法里），标记为歧义段，
 * 反查时跳过歧义段（动词前缀通常无需翻译也能读懂，误译反而误导）。
 */
let enIndexPromise = null;

function loadEnIndex() {
  if (!enIndexPromise) {
    enIndexPromise = loadWords().then((words) => {
      if (!words) return null;
      const index = new Map(); // 'cache' -> '缓存'（唯一）；歧义段不入索引
      for (const [zh, entry] of Object.entries(words)) {
        for (const field of REQUIRED_FIELDS) {
          for (const opt of entry[field] || []) {
            for (const style of REQUIRED_STYLES) {
              for (const seg of splitEnglishName(opt[style])) {
                const k = seg.toLowerCase();
                if (!k) continue;
                const prev = index.get(k);
                if (prev === undefined) {
                  index.set(k, zh);
                } else if (prev !== zh) {
                  index.set(k, null); // 歧义：多词条共用同一段
                }
              }
            }
          }
        }
      }
      // 清除歧义段
      for (const [k, v] of index) if (v === null) index.delete(k);
      return index;
    });
  }
  return enIndexPromise;
}

/**
 * 把英文命名切为小写词段：camelCase / snake_case / kebab-case / 空格 / 点分均可。
 * 'getUserName' → ['get','user','name']；'user_name' → ['user','name']；'USER_NAME' → ['user','name']
 */
function splitEnglishName(text) {
  return String(text)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')      // camelCase 边界
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')   // HTTPServer 连续大写边界
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** 整名索引缓存（模块级）：去掉分隔符的小写完整拼写 -> 中文 key（唯一时） */
let fullNameIndexPromise = null;

function loadFullNameIndex() {
  if (!fullNameIndexPromise) {
    fullNameIndexPromise = loadWords().then((words) => {
      if (!words) return null;
      const index = new Map(); // 'cachepenetration' -> '缓存穿透'
      const add = (en, zh) => {
        const k = String(en || '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        if (!k) return;
        const prev = index.get(k);
        // 同一拼写对应多词条时取最短中文（多为同义词，取简洁者）
        if (prev === undefined || [...zh].length < [...prev].length) index.set(k, zh);
      };
      for (const [zh, entry] of Object.entries(words)) {
        for (const field of REQUIRED_FIELDS) {
          for (const opt of entry[field] || []) {
            for (const style of REQUIRED_STYLES) add(opt[style], zh);
          }
        }
      }
      return index;
    });
  }
  return fullNameIndexPromise;
}

/** 整名精确匹配：'cachePenetration' → '缓存穿透'；未命中返回 null */
async function matchFullName(raw) {
  const index = await loadFullNameIndex();
  if (!index) return null;
  return index.get(String(raw).replace(/[^A-Za-z0-9]/g, '').toLowerCase()) || null;
}

/**
 * 英→中反查：逐段命中优先，整名兜底，两者皆败交由 API。
 *
 * 两级匹配（部分命中会给出误导性释义，故宁缺勿错）：
 *  1. 逐段命中：'shoppingCart' → shopping+cart 全部有唯一释义 → 拼合（相邻段同释义只保留一个）
 *  2. 整名兜底：输入去掉分隔符后与某词条完整拼写一致（cachePenetration = 缓存穿透，
 *     组成段 penetration 无独立词条，逐段必失败，整名救回；getUserName/isDeleted 等
 *     method 命名也靠这一级翻译）
 *
 * @param {string} text 英文命名（内部 trim）
 * @returns {Promise<Array|null>} 与 LLM 英→中输出同构：[{ input, style, meaning, breakdown }]
 */
export async function lookupDictionaryReverse(text) {
  const raw = typeof text === 'string' ? text.trim() : '';
  if (!raw) return null;

  const index = await loadEnIndex();
  if (!index) return null;

  // 风格检测（与 LLM 输出的 style 字段同口径）
  const style = /^[a-z]+([A-Z]|$)/.test(raw) && !raw.includes('_')
    ? 'camelCase'
    : /^[a-z0-9]+(_[a-z0-9]+)+$/.test(raw) ? 'snake_case'
    : /^[A-Z0-9]+(_[A-Z0-9]+)+$/.test(raw) ? 'constant'
    : /^[A-Z]/.test(raw) ? 'PascalCase' : 'unknown';

  // 1) 逐段命中：仅收录唯一释义的段参与拼合；任何一段无唯一释义 → 试整名兜底。
  //    （get/is 这类高频段几乎必然歧义，不会入选；误译不如不译）
  const parts = splitEnglishName(raw);
  if (parts.length === 0) return null;

  let segmentMiss = false;
  const breakdown = [];
  for (const part of parts) {
    const zh = index.get(part); // undefined=未收录/歧义；命中即唯一释义
    if (!zh) {
      segmentMiss = true;
      break;
    }
    // 相邻段同释义只保留一个（'shoppingCart' 两段都是"购物车"，避免"购物车购物车"）
    if (breakdown.length === 0 || breakdown[breakdown.length - 1].zh !== zh) {
      breakdown.push({ en: part, zh });
    }
  }
  if (!segmentMiss) {
    const meaning = breakdown.map((b) => b.zh).join('');
    return [{ input: raw, style, meaning, breakdown }];
  }

  // 2) 整名兜底：完整拼写比对（O(1)，预建索引）
  const full = await matchFullName(raw);
  if (full) {
    return [{ input: raw, style, meaning: full, breakdown: [{ en: raw, zh: full }] }];
  }

  return null;
}

/**
 * 加载分类数据（惰性、单次）。失败返回 null，词表页降级为「暂无分类」而不是抛错。
 * @returns {Promise<object|null>}
 */
function loadCategories() {
  if (!categoriesPromise) {
    categoriesPromise = import('./categories.json')
      .then((m) => m.default || m)
      .catch((e) => {
        console.warn('[dictionaries] 分类数据加载失败，词表页将不可用:', e?.message || e);
        return null;
      });
  }
  return categoriesPromise;
}

/**
 * 按类别列出词条（词表页数据源）。
 *
 * @param {string|null} category 类别 id；null/undefined 返回全部词条
 * @returns {Promise<Array<{chinese: string, category: string}>>}
 *   按中文排序的轻量列表——只含 key 与类别，不含命名数据（完整数据用 lookupDictionary 按需取）
 */
export async function listDictionary(category = null) {
  const cats = await loadCategories();
  if (!cats) return [];

  const ids = category ? [category] : Object.keys(cats);
  const seen = new Set();
  const list = [];
  for (const id of ids) {
    for (const zh of cats[id]?.words || []) {
      if (seen.has(zh)) continue; // 一个词归入多个类别时只在首个类别展示
      seen.add(zh);
      list.push({ chinese: zh, category: id });
    }
  }
  list.sort((a, b) => a.chinese.localeCompare(b.chinese, 'zh-Hans-CN'));
  return list;
}

/**
 * 分类元信息（词表页分类栏数据源）。
 * @returns {Promise<Array<{id: string, label: string, count: number}>>} 按文件内声明顺序返回
 */
export async function dictionaryCategories() {
  const cats = await loadCategories();
  if (!cats) return [];
  return Object.entries(cats).map(([id, meta]) => ({ id, label: meta.label, count: (meta.words || []).length }));
}
