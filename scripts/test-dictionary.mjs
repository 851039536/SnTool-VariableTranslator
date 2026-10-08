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
// index.js 直接 import 了 words.json，Node 原生 ESM 要求 import 属性
// （`with { type: 'json' }`）而 Vite 不需要。为了不改动业务代码，这里先用
// esbuild（Vite 的既有依赖）把模块打成临时文件再加载——顺带也验证了该模块
// 能被真实打包。

section('4. 查询行为');

let lookupDictionary, dictionarySize;
const bundledPath = path.join(ROOT, '.test-dictionary.bundle.mjs');
try {
  const { build } = await import('esbuild');
  await build({
    entryPoints: [path.join(ROOT, 'src/dictionaries/index.js')],
    bundle: true,
    format: 'esm',
    outfile: bundledPath,
    logLevel: 'silent',
  });
  ({ lookupDictionary, dictionarySize } = await import(pathToFileURL(bundledPath).href));
} catch (e) {
  console.log(`  ${C.red}✗${C.reset} 无法加载词典模块: ${e.message}`);
  failures.push('加载词典模块');
} finally {
  if (fs.existsSync(bundledPath)) fs.unlinkSync(bundledPath);
}

if (!lookupDictionary) {
  console.log(`\n${C.red}${C.bold}模块加载失败，跳过查询行为测试${C.reset}`);
  console.log(`失败 ${failures.length} 项`);
  process.exit(1);
}

check('dictionarySize() 与词表 key 数一致', dictionarySize() === keys.length, `${dictionarySize()} vs ${keys.length}`);
check('lookupDictionary 为纯函数（无第二参数）', lookupDictionary.length === 1, `实际 ${lookupDictionary.length}`);

// 4.1 全部词条可命中且结构同构
const missAll = keys.filter((k) => lookupDictionary(k) === null);
check('所有词条均可命中', missAll.length === 0, missAll.slice(0, 5).join(','));

const EXPECTED_SHAPE = 'chinese,class,constant,method,variable';
const badShape = keys.filter((k) => {
  const r = lookupDictionary(k);
  return !r || Object.keys(r[0]).sort().join(',') !== EXPECTED_SHAPE;
});
check('返回结构仅含 chinese + 四类字段', badShape.length === 0, badShape.slice(0, 5).join(','));

// 4.2 chinese 字段与 key 一致
const badChinese = keys.filter((k) => lookupDictionary(k)?.[0]?.chinese !== k);
check('返回的 chinese 与查询 key 一致', badChinese.length === 0, badChinese.slice(0, 5).join(','));

// 4.3 纯函数确定性
const nondet = keys.filter(
  (k) => JSON.stringify(lookupDictionary(k)) !== JSON.stringify(lookupDictionary(k))
);
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
  const r = lookupDictionary(input);
  check(`边界：${name} → ${expect === null ? 'null' : '命中'}`, r === expect, `实际 ${r === null ? 'null' : '命中'}`);
}

// 4.5 首尾空白应被 trim 后命中（取第一条词）
const firstKey = keys[0];
check(`首尾空白可命中（" ${firstKey} "）`, lookupDictionary(`  ${firstKey}  `)?.[0]?.chinese === firstKey);

// ── 汇总 ────────────────────────────────────────────────────

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
