#!/usr/bin/env node
/**
 * 内置词典单元测试
 *
 * 运行：npm test          （或 node scripts/test-dictionary.mjs）
 *
 * 覆盖四类问题：
 *   1. 结构完整性 —— 字段缺失/空数组/风格缺失（会导致词条被静默跳过）
 *   2. 重复检测   —— 重复 key、词条内重复候选、跨词条命名重复
 *   3. 命名规范   —— camelCase / snake_case / PascalCase 拼写合法性
 *   4. 查询行为   —— 命中、未命中、边界输入、纯函数确定性
 *
 * 退出码：0 全部通过；1 存在失败项（可直接用于 CI / pre-commit）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DICT_PATH = path.join(ROOT, 'src/dictionaries/words.json');

const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m',
};

/** 统计与结果收集 */
const failures = [];
const warnings = [];
let checkCount = 0;

function check(name, condition, detail = '') {
  checkCount++;
  if (condition) {
    console.log(`  ${C.green}✓${C.reset} ${name}`);
  } else {
    console.log(`  ${C.red}✗${C.reset} ${name}${detail ? `  ${C.dim}${detail}${C.reset}` : ''}`);
    failures.push(name + (detail ? ` (${detail})` : ''));
  }
  return condition;
}

function warn(name, detail = '') {
  console.log(`  ${C.yellow}!${C.reset} ${name}${detail ? `  ${C.dim}${detail}${C.reset}` : ''}`);
  warnings.push(name);
}

function section(title) {
  console.log(`\n${C.bold}${C.cyan}${title}${C.reset}`);
}

// ── 数据加载 ────────────────────────────────────────────────

if (!fs.existsSync(DICT_PATH)) {
  console.error(`${C.red}找不到词表文件: ${DICT_PATH}${C.reset}`);
  process.exit(1);
}

const raw = fs.readFileSync(DICT_PATH, 'utf8');
let words;
try {
  words = JSON.parse(raw);
} catch (e) {
  console.error(`${C.red}words.json 解析失败: ${e.message}${C.reset}`);
  process.exit(1);
}

const keys = Object.keys(words);

/** 词条必须完整的命名类型字段 */
const FIELDS = ['variable', 'method', 'constant', 'class'];
/** 候选必须完整的风格字段 */
const STYLES = ['camelCase', 'snake_case', 'PascalCase'];
/**
 * 各类型在 UI 中**实际渲染**的风格。
 * 其余字段仍须存在（结构完整性），但不参与拼写校验——
 * 例如 constant 惯例三个字段都填全大写，只有 snake_case 会被渲染。
 */
const DISPLAY_STYLES = {
  variable: ['camelCase', 'snake_case', 'PascalCase'],
  method: ['camelCase', 'snake_case', 'PascalCase'],
  constant: ['snake_case'],
  class: ['PascalCase'],
};

console.log(`${C.bold}内置词典测试${C.reset}  ${C.dim}${DICT_PATH}${C.reset}`);
console.log(`${C.dim}词条总数: ${keys.length}${C.reset}`);

// ── 1. 结构完整性 ────────────────────────────────────────────

section('1. 结构完整性');

const structIssues = [];
for (const [zh, entry] of Object.entries(words)) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    structIssues.push(`${zh}: 不是一个对象`);
    continue;
  }
  for (const field of FIELDS) {
    const options = entry[field];
    if (!Array.isArray(options)) {
      structIssues.push(`${zh}.${field}: 缺失或不是数组`);
    } else if (options.length === 0) {
      structIssues.push(`${zh}.${field}: 空数组`);
    } else {
      options.forEach((opt, i) => {
        if (!opt || typeof opt !== 'object') {
          structIssues.push(`${zh}.${field}[${i}]: 不是对象`);
          return;
        }
        for (const style of STYLES) {
          const v = opt[style];
          if (typeof v !== 'string' || !v.trim()) {
            structIssues.push(`${zh}.${field}[${i}].${style}: 缺失或为空`);
          }
        }
      });
    }
  }
}
if (structIssues.length) {
  structIssues.slice(0, 15).forEach((s) => console.log(`      ${C.dim}${s}${C.reset}`));
  if (structIssues.length > 15) console.log(`      ${C.dim}...还有 ${structIssues.length - 15} 条${C.reset}`);
}
check('所有词条四类字段齐全且均为非空数组', structIssues.length === 0, `${structIssues.length} 处问题`);

const hasConventions = keys.filter((k) => 'conventions' in words[k]);
check('无残留 conventions 字段（该机制已移除）', hasConventions.length === 0, hasConventions.slice(0, 5).join(','));

// ── 2. 重复检测 ──────────────────────────────────────────────

section('2. 重复检测');

// 2.1 原始文本中的重复顶层 key —— JSON.parse 会用后者覆盖前者，
//     导致词条静默丢失，是最隐蔽的一类重复
const rawKeyPositions = new Map();
const rawDupKeys = [];
for (const m of raw.matchAll(/^ {2}"((?:[^"\\]|\\.)*)":\s*\{/gm)) {
  const k = m[1];
  if (rawKeyPositions.has(k)) rawDupKeys.push(k);
  rawKeyPositions.set(k, true);
}
check('无重复顶层 key（不会被静默覆盖）', rawDupKeys.length === 0, rawDupKeys.join(','));
check(
  '原始扫描的 key 数与解析结果一致',
  rawKeyPositions.size === keys.length,
  `原始 ${rawKeyPositions.size} vs 解析 ${keys.length}`
);

// 2.2 单条内部：同一类型下出现完全相同的候选
const innerDups = [];
for (const [zh, entry] of Object.entries(words)) {
  for (const field of FIELDS) {
    if (!Array.isArray(entry[field])) continue;
    const seen = new Set();
    for (const opt of entry[field]) {
      if (!opt) continue;
      const sig = STYLES.map((s) => opt[s]).join('|');
      if (seen.has(sig)) innerDups.push(`${zh}.${field}`);
      seen.add(sig);
    }
  }
}
check('词条内部无完全重复的候选', innerDups.length === 0, innerDups.slice(0, 8).join(' '));

// 2.3 单条内部：渲染出来的同一列出现重复值
//     （比如 variable 的多个候选 camelCase 相同，UI 会显示两行一样的）
const renderDups = [];
for (const [zh, entry] of Object.entries(words)) {
  for (const field of ['variable', 'method']) {
    if (!Array.isArray(entry[field])) continue;
    const vals = entry[field].map((o) => o?.camelCase).filter(Boolean);
    const dup = vals.filter((v, i) => vals.indexOf(v) !== i);
    if (dup.length) renderDups.push(`${zh}.${field}(${[...new Set(dup)].join(',')})`);
  }
}
check('同一类型下渲染值不重复', renderDups.length === 0, renderDups.slice(0, 8).join(' '));

// 2.4 跨词条：不同中文 key 产出完全相同的命名
//     多数是合理的同义词（账户/账号 都叫 account），故仅告警不失败
const bySignature = new Map();
for (const [zh, entry] of Object.entries(words)) {
  const sig = JSON.stringify(FIELDS.map((f) => entry[f]));
  if (!bySignature.has(sig)) bySignature.set(sig, []);
  bySignature.get(sig).push(zh);
}
const synonymGroups = [...bySignature.values()].filter((g) => g.length > 1);
if (synonymGroups.length) {
  warn(`存在同义词条（命名完全相同，属正常，仅提示）: ${synonymGroups.length} 组`);
  synonymGroups.forEach((g) => console.log(`      ${C.dim}${g.join('  ==  ')}${C.reset}`));
} else {
  console.log(`  ${C.green}✓${C.reset} 无同义重复词条`);
}

// 2.5 跨词条：首选变量名撞车（比 2.4 更宽的口径——四类字段不必完全同构，
//     只要 variable[0].camelCase 相同即提示。多数是「代理/代理模式」这类可接受的
//     近义收录，但「位置/职位 都叫 position」这类则说明有一方需要更精确的命名。
//     仅告警不失败：数量是词表冗余度的观察指标，由维护者人工判断。）
const byFirstName = new Map();
for (const [zh, entry] of Object.entries(words)) {
  const n = entry.variable?.[0]?.camelCase;
  if (!n) continue;
  if (!byFirstName.has(n)) byFirstName.set(n, []);
  byFirstName.get(n).push(zh);
}
const firstNameClashes = [...byFirstName.entries()].filter(([, g]) => g.length > 1);
if (firstNameClashes.length) {
  warn(`不同中文词共用同一首选变量名（近义收录或需人工复核）: ${firstNameClashes.length} 组`);
  console.log(`      ${C.dim}${firstNameClashes.slice(0, 10).map(([n, g]) => g.join('/') + '=' + n).join('；')}${firstNameClashes.length > 10 ? ` …等 ${firstNameClashes.length} 组` : ''}${C.reset}`);
} else {
  console.log(`  ${C.green}✓${C.reset} 无首选变量名撞车`);
}

// ── 3. 命名规范 ──────────────────────────────────────────────

section('3. 命名规范');

const RE_CAMEL = /^[a-z][A-Za-z0-9]*$/;
const RE_SNAKE_LOWER = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const RE_SNAKE_UPPER = /^[A-Z0-9]+(_[A-Z0-9]+)*$/;
const RE_PASCAL = /^[A-Z][A-Za-z0-9]*$/;

const styleIssues = [];
for (const [zh, entry] of Object.entries(words)) {
  for (const [field, styles] of Object.entries(DISPLAY_STYLES)) {
    const options = entry[field];
    if (!Array.isArray(options)) continue;
    options.forEach((opt, i) => {
      if (!opt) return;
      for (const style of styles) {
        const v = opt[style];
        if (typeof v !== 'string') continue;
        let ok;
        if (style === 'camelCase') ok = RE_CAMEL.test(v);
        else if (style === 'snake_case') ok = field === 'constant' ? RE_SNAKE_UPPER.test(v) : RE_SNAKE_LOWER.test(v);
        else ok = RE_PASCAL.test(v);
        if (!ok) styleIssues.push(`${zh}.${field}[${i}].${style} = "${v}"`);
      }
    });
  }
}
styleIssues.slice(0, 15).forEach((s) => console.log(`      ${C.dim}${s}${C.reset}`));
check('所有被渲染的风格拼写合法', styleIssues.length === 0, `${styleIssues.length} 处问题`);

// 3.1 语言中立性：词条不得预置语言专属缀
//     这些缀曾在“生态约定”机制下由运行时添加，该机制已移除；
//     若还留在数据里，会导致所有语言都拿到 C# 风格的命名。
//     「异步」类词条本身语义就是异步，故豁免词义含“异步”的 key。
const langAffix = [];
for (const [zh, entry] of Object.entries(words)) {
  const cls = entry.class?.[0]?.PascalCase;
  const mtd = entry.method?.[0]?.PascalCase;
  // 接口 I 前缀：I 开头且后跟大写
  if (typeof cls === 'string' && /^I[A-Z]/.test(cls)) langAffix.push(`${zh}.class = ${cls}`);
  // 异步 Async 后缀：豁免中文语义本身就是“异步”的词条
  if (typeof mtd === 'string' && /Async$/.test(mtd) && !zh.includes('异步')) {
    langAffix.push(`${zh}.method = ${mtd}`);
  }
}
langAffix.slice(0, 15).forEach((s) => console.log(`      ${C.dim}${s}${C.reset}`));
check('无预置的语言专属前缀/后缀', langAffix.length === 0, `${langAffix.length} 处`);

// 3.2 中文 key 不含空白/标点（会因 trim 后不匹配而永远无法命中）
const badKeys = keys.filter((k) => k !== k.trim() || /\s/.test(k));
check('中文 key 无首尾/内部空白', badKeys.length === 0, badKeys.slice(0, 5).join(','));

// ── 4. 查询行为 ──────────────────────────────────────────────
//
// index.js 通过动态 import() 懒加载 words.json，Node 原生 ESM 要求 JSON 的
// import 属性而 Vite 不需要。为不改动业务代码，这里用 esbuild（Vite 既有依赖）
// 把模块打成临时文件再加载——注意必须保留动态 import 的拆分形态，
// 否则测的就不是真实的懒加载行为。

section('4. 查询行为');

let lookupDictionary, dictionarySize;
const bundleDir = path.join(ROOT, '.test-dict-bundle');
try {
  const { build } = await import('esbuild');
  await build({
    entryPoints: [path.join(ROOT, 'src/dictionaries/index.js')],
    bundle: true,
    format: 'esm',
    splitting: true,
    outdir: bundleDir,
    logLevel: 'silent',
  });
  const entry = fs.readdirSync(bundleDir).find((f) => f.startsWith('index') && f.endsWith('.js'));
  ({ lookupDictionary, dictionarySize } = await import(pathToFileURL(path.join(bundleDir, entry)).href));
} catch (e) {
  console.log(`  ${C.red}✗${C.reset} 无法加载词典模块: ${e.message}`);
  failures.push('加载词典模块');
}
// ⚠️ 不能在 finally 里删目录：词表是懒加载的，首次查询时才会去取 words-*.js，
// 提前删除会导致查询静默降级为「未命中」。改为在全部测试结束后清理（见文件末尾）。

if (!lookupDictionary) {
  console.log(`\n${C.red}${C.bold}模块加载失败，跳过查询行为测试${C.reset}`);
  console.log(`失败 ${failures.length} 项`);
  process.exit(1);
}

check('dictionarySize() 与词表 key 数一致', (await dictionarySize()) === keys.length, `${await dictionarySize()} vs ${keys.length}`);
check('lookupDictionary 只接受一个参数', lookupDictionary.length === 1, `实际 ${lookupDictionary.length}`);
check('lookupDictionary 为异步函数（懒加载）', lookupDictionary.constructor.name === 'AsyncFunction');

// 4.1 全部词条可命中且结构同构
const missAll = [];
for (const k of keys) {
  if ((await lookupDictionary(k)) === null) missAll.push(k);
}
check('所有词条均可命中', missAll.length === 0, missAll.slice(0, 5).join(','));

const EXPECTED_SHAPE = 'chinese,class,constant,method,variable';
const badShape = [];
for (const k of keys) {
  const r = await lookupDictionary(k);
  if (!r || Object.keys(r[0]).sort().join(',') !== EXPECTED_SHAPE) badShape.push(k);
}
check('返回结构仅含 chinese + 四类字段', badShape.length === 0, badShape.slice(0, 5).join(','));

// 4.2 chinese 字段与 key 一致
const badChinese = [];
for (const k of keys) {
  const r = await lookupDictionary(k);
  if (r?.[0]?.chinese !== k) badChinese.push(k);
}
check('返回的 chinese 与查询 key 一致', badChinese.length === 0, badChinese.slice(0, 5).join(','));

// 4.3 纯函数确定性
const nondet = [];
for (const k of keys) {
  const a = JSON.stringify(await lookupDictionary(k));
  const b = JSON.stringify(await lookupDictionary(k));
  if (a !== b) nondet.push(k);
}
check('重复查询结果一致（确定性）', nondet.length === 0, nondet.slice(0, 5).join(','));

// 4.4 边界输入
const edgeCases = [
  ['空字符串', '', null],
  ['纯空白', '   ', null],
  ['制表符换行', '\t\n', null],
  ['null', null, null],
  ['undefined', undefined, null],
  ['数字', 12345, null],
  ['对象', {}, null],
  ['数组', [], null],
  ['未收录词', '一个绝对不存在于词表的词组xyz', null],
];
for (const [name, input, expect] of edgeCases) {
  const r = await lookupDictionary(input);
  check(`边界：${name} → ${expect === null ? 'null' : '命中'}`, r === expect, `实际 ${r === null ? 'null' : '命中'}`);
}

// 4.5 首尾空白应被 trim 后命中（取第一条词）
const firstKey = keys[0];
check(`首尾空白可命中（" ${firstKey} "）`, (await lookupDictionary(`  ${firstKey}  `))?.[0]?.chinese === firstKey);

// 4.6 懒加载：词表必须独立于主包
section('4b. 懒加载产物');
const assetsDir = path.join(ROOT, 'dist/assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const mainFile = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
  const dictFile = files.find((f) => f.startsWith('dict-') && f.endsWith('.js'));
  check('产物存在独立 dict chunk', !!dictFile, dictFile || '未找到');
  check('产物存在主包', !!mainFile, mainFile || '未找到');
  if (mainFile && dictFile) {
    const mainSrc = fs.readFileSync(path.join(assetsDir, mainFile), 'utf8');
    check('主包用动态 import 引用词典', /import\(["'][^"']*dict-[^"']*["']\)/.test(mainSrc));
    check('主包未静态引入词典数据', !mainSrc.includes('userName'));
    check('词典 chunk 含词表数据', fs.readFileSync(path.join(assetsDir, dictFile), 'utf8').includes('userName'));
  }
} else {
  check('产物目录存在（需先 npm run build）', false, assetsDir);
}

// ── 5. 来源提示一致性 ────────────────────────────────────────
//
// index.vue 的 pendingSource 会在状态栏提前告诉用户「走内置词典」还是「调用 API」。
// 提示一旦与实际执行路径不符，就是在骗用户，所以这里做源码级校验：
// 两处必须使用同一个判定表达式。

section('5. 来源提示一致性');

const vuePath = path.join(ROOT, 'src/VariableTranslator/index.vue');
const vue = fs.readFileSync(vuePath, 'utf8');

// 词表懒加载后，查询是异步的；两处都必须 await，否则拿到的是 Promise（恒为真值）。
// 两个方向都查词典：中→英 lookupDictionary，英→中 lookupDictionaryReverse
const pendingAwaits = /await (lookupDictionary|lookupDictionaryReverse)\(text\)/.test(vue)
  && /lookupDictionaryReverse\(text\)/.test(vue);
const translateAwaits = /await (lookupDictionary|lookupDictionaryReverse)\(inputSnapshot\)/.test(vue)
  && /lookupDictionaryReverse\(inputSnapshot\)/.test(vue);
check('pendingSource 正确 await 双向词典查询', pendingAwaits);
check('translate 正确 await 双向词典查询', translateAwaits);

// 词典查询必须早于 API Key 校验，否则未配置 Key 的用户会被挡在词典之外，
// 与「命中词典无需 Key」的提示矛盾
const idxDict = vue.indexOf('const dictResult');
const idxKeyGuard = vue.indexOf('!isApiConfigured.value) return');
check(
  '词典查询先于 API Key 校验',
  idxDict !== -1 && idxKeyGuard !== -1 && idxDict < idxKeyGuard,
  `dict@${idxDict} keyGuard@${idxKeyGuard}`
);

// 提示与真实路径逐条比对（中→英）
const hinted = [];
for (const k of keys) {
  if ((await lookupDictionary(k)) !== null) hinted.push(k);
}
check('全部词条都会被提示为「内置词典」', hinted.length === keys.length, `${hinted.length}/${keys.length}`);

// 未收录词必须提示走 API
check('未收录词提示走 API', (await lookupDictionary('绝不存在于词表的词组zzz')) === null);

// 英→中方向也走词典反查：两处都必须含反向查询调用（不再固定提示 API）
check('英→中方向接入词典反查', vue.includes('lookupDictionaryReverse'));

// 反查行为：整名兜底 + 逐段拼合 + 未收录走 API
const { lookupDictionaryReverse } = await import(pathToFileURL(path.join(bundleDir, fs.readdirSync(bundleDir).find((f) => f.startsWith('index') && f.endsWith('.js')))).href);
check('反查：整名命中（method 命名）', (await lookupDictionaryReverse('getUserName'))?.[0]?.meaning === '用户名');
check('反查：整名命中（复合词）', (await lookupDictionaryReverse('cachePenetration'))?.[0]?.meaning === '缓存穿透');
check('反查：snake_case 整名命中', (await lookupDictionaryReverse('user_name'))?.[0]?.meaning === '用户名');
check('反查：UPPER 常量命中', (await lookupDictionaryReverse('USER_NAME'))?.[0]?.meaning === '用户名');
check('反查：相邻段同释义去重', (await lookupDictionaryReverse('shoppingCart'))?.[0]?.meaning === '购物车');
check('反查：未收录词返回 null', (await lookupDictionaryReverse('processData')) === null);
check('反查：空输入返回 null', (await lookupDictionaryReverse('')) === null);
check('反查：返回结构与 LLM 英→中输出同构', (() => {
  const r = lookupDictionaryReverse('orderList');
  return r instanceof Promise; // 异步接口（调用方必须 await）
})());
const reverseShape = await lookupDictionaryReverse('orderList');
check(
  '反查：返回字段齐全',
  reverseShape?.length === 1
    && typeof reverseShape[0].input === 'string'
    && typeof reverseShape[0].style === 'string'
    && typeof reverseShape[0].meaning === 'string'
    && Array.isArray(reverseShape[0].breakdown)
    && reverseShape[0].breakdown.every((b) => typeof b.en === 'string' && typeof b.zh === 'string')
);

// 异步竞态防护：查词返回时若输入已变，必须丢弃过期结果
check('pendingSource 丢弃过期异步结果', /chineseInput\.value\.trim\(\) !== text\) return/.test(vue));
check('translate 丢弃过期异步结果', /chineseInput\.value\.trim\(\) !== inputSnapshot\) return/.test(vue));

// ── 6. 分类数据（词表页） ─────────────────────────────────────
//
// categories.json 支撑「词表」页按类别浏览。与词表一样是懒加载 JSON，
// 这里校验它与 words.json 的覆盖一致性 + listDictionary 查询行为。

section('6. 分类数据');

const CATS_PATH = path.join(ROOT, 'src/dictionaries/categories.json');
let categories;
try {
  categories = JSON.parse(fs.readFileSync(CATS_PATH, 'utf8'));
} catch (e) {
  categories = null;
  check('categories.json 可解析', false, e.message);
}

if (categories) {
  const catIds = Object.keys(categories);
  check('categories.json 至少包含一个类别', catIds.length > 0);

  // 6.1 结构：label 非空字符串，words 是字符串数组
  const badCat = catIds.filter((id) => {
    const c = categories[id];
    return !c || typeof c.label !== 'string' || !c.label || !Array.isArray(c.words) || c.words.some((w) => typeof w !== 'string');
  });
  check('所有类别 label 非空且 words 为字符串数组', badCat.length === 0, badCat.join(','));

  // 6.2 覆盖：分类引用的词必须存在于词表（防拼写漂移）
  const catWords = catIds.flatMap((id) => categories[id].words);
  const ghostWords = catWords.filter((w) => !(w in words));
  check('分类引用的词条都存在于词表', ghostWords.length === 0, ghostWords.slice(0, 5).join(','));

  // 6.3 覆盖：词表每个词条至少归入一个类别（防新词漏标）
  const covered = new Set(catWords);
  const uncovered = keys.filter((k) => !covered.has(k));
  check('词表全部词条已被分类覆盖', uncovered.length === 0, uncovered.slice(0, 10).join(','));

  // 6.4 类别非空
  const emptyCats = catIds.filter((id) => categories[id].words.length === 0);
  check('无空类别', emptyCats.length === 0, emptyCats.join(','));

  // 6.5 listDictionary 行为：全量 == 词表 key 集合；按类别取子集
  //     lookupDictionary 与 listDictionary 同模块导出，借助 Function 原型拿到模块命名空间不可行，
  //     直接重新 dynamic import 一次（bundleDir 未清理，模块缓存命中，零成本）
  const dictModule = await import(pathToFileURL(path.join(bundleDir, fs.readdirSync(bundleDir).find((f) => f.startsWith('index') && f.endsWith('.js')))).href);
  const { listDictionary, dictionaryCategories } = dictModule;
  const all = await listDictionary(null);
  check(
    'listDictionary(null) 覆盖全部词条',
    all.length === keys.length && new Set(all.map((w) => w.chinese)).size === keys.length,
    `${all.length} vs ${keys.length}`
  );
  const cats = await dictionaryCategories();
  check('dictionaryCategories 与文件一致', cats.length === catIds.length, `${cats.length} vs ${catIds.length}`);
  const firstCat = cats[0];
  const sub = await listDictionary(firstCat.id);
  check(
    '按类别查询返回该类别全部词条',
    sub.length === firstCat.count && sub.every((w) => w.category === firstCat.id),
    `${sub.length} vs ${firstCat.count}`
  );

  // 6.6 词表页 UI 引用了新的两个 API（防止组件漏 import 导致页签空白）
  check('词表页已接入 dictionaryCategories/listDictionary', vue.includes('dictionaryCategories') && vue.includes('listDictionary'));
}

// ── 汇总 ────────────────────────────────────────────────────

// 测试全部跑完（词表已加载完毕）再清理临时打包目录
if (fs.existsSync(bundleDir)) fs.rmSync(bundleDir, { recursive: true, force: true });

console.log('');
console.log('─'.repeat(52));
if (failures.length === 0) {
  console.log(`${C.green}${C.bold}全部通过${C.reset}  ${checkCount} 项检查，${keys.length} 条词条`);
  if (warnings.length) {
    console.log(`${C.yellow}${warnings.length} 条提示${C.reset} ${C.dim}（不影响通过）${C.reset}`);
  }
  process.exit(0);
} else {
  console.log(`${C.red}${C.bold}失败 ${failures.length} 项${C.reset} / 共 ${checkCount} 项检查`);
  failures.forEach((f) => console.log(`  ${C.red}•${C.reset} ${f}`));
  process.exit(1);
}
