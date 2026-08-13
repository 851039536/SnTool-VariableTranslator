<template>
  <div class="github-dark" :data-theme="isDarkTheme ? 'dark' : 'light'">
    <div class="container">
      <header class="header">
        <nav class="tabs">
          <button class="tab" :class="{ active: activeTab === 'translate' }" @click="switchTab('translate')">翻译</button>
          <button class="tab" :class="{ active: activeTab === 'history' }" @click="switchTab('history')">历史</button>
        </nav>
        <div class="header-controls">
          <span class="header-desc">{{ isZhToEn ? '中文 → 英文变量名' : '英文变量名 → 中文释义' }}</span>
          <button @click="toggleDirection" class="btn-swap" title="切换翻译方向">
            <Icon :icon="COMMON_ICONS.swap" width="16" />
          </button>
          <button @click="toggleTheme" class="btn-theme" :title="isDarkTheme ? '切换到亮色' : '切换到暗色'">
            <Icon :icon="isDarkTheme ? COMMON_ICONS.sun : COMMON_ICONS.moon" width="16" />
          </button>
        </div>
      </header>

      <template v-if="activeTab === 'translate'">

      <!-- 翻译区域 -->
      <div class="card card-input">
        <div class="input-wrap">
          <textarea ref="inputRef" v-model="chineseInput" class="input textarea"
            @keydown.enter.exact.prevent="onEnterKey"
            :placeholder="isZhToEn ? '输入中文，例如：用户名称' : '输入英文变量名，例如：getUserName'" rows="1"></textarea>
        </div>
        <div v-if="isZhToEn" class="context-bar">
          <span class="ctx-label">生态</span>
          <button v-for="ctx in CONTEXTS" :key="ctx.value" class="ctx-pill"
            :class="{ active: context === ctx.value }" @click="setContext(ctx.value)">{{ ctx.label }}</button>
        </div>
        <div class="status-bar">
          <span v-if="isTranslating" class="status-tip status-tip--active">
            <Icon :icon="TI.loading" width="14" class="icon-spin" /> 翻译中...
          </span>
          <span v-else-if="!isApiConfigured" class="status-tip status-tip--warn">
            <Icon :icon="TI.warning" width="14" /> 请在 src/config/api.ts 中配置 API Key
          </span>
          <span v-else-if="chineseInput.trim()" class="status-tip status-tip--ready">
            <Icon :icon="TI.ready" width="14" /> 就绪 · {{ isZhToEn ? '中→英' : '英→中' }}
          </span>
          <span v-else class="status-tip">
            <Icon :icon="TI.edit" width="14" /> {{ isZhToEn ? '输入中文开始翻译' : '输入英文变量名开始翻译' }}
          </span>
          <span class="keyboard-hints">
            <span :class="{ 'len-over': inputLen > maxLen }">{{ inputLen }}/{{ maxLen }}</span>
            · Enter 翻译 · Ctrl+K 清空
          </span>
        </div>
      </div>

      <!-- 中→英 翻译结果 -->
      <div v-if="isZhToEn && translationResult && translationResult.length > 0" class="result-card"
        :class="{ 'is-stale': isTranslating }">
        <div v-for="(result, index) in translationResult" :key="index" class="result-group">
          <div class="result-title">
            <span class="result-chinese">{{ result.chinese }}</span>
            <span v-if="isFromCache" class="cache-badge">
              <Icon :icon="TI.cache" width="12" /> 来自缓存
            </span>
            <span v-else class="api-badge">
              <Icon :icon="TI.api" width="12" /> API 翻译
            </span>
          </div>

          <div class="naming-types">
            <div v-for="mode in modes" :key="mode.value" class="naming-type">
              <div class="type-header">
                <span class="type-icon">
                  <Icon :icon="mode.icon" width="14" />
                </span>
                <div class="type-info">
                  <span class="type-label">{{ mode.label }}</span>
                  <span class="type-desc">{{ mode.desc }}</span>
                </div>
              </div>

              <div class="naming-options">
                <div v-for="(option, idx) in result[mode.value]" :key="idx" class="naming-option">
                  <div v-for="row in mode.rows" :key="row.tag" class="style-row"
                    @click="copyToClipboard(rowValue(option, row), getButtonId(index, mode.value, idx, row.tag))"
                    title="点击复制">
                    <span class="style-tag" :class="'tag-' + row.tag">{{ row.tag }}</span>
                    <code class="code-text">{{ rowValue(option, row) }}</code>
                    <button
                      @click.stop="copyToClipboard(rowValue(option, row), getButtonId(index, mode.value, idx, row.tag))"
                      class="copy-btn"
                      :class="{ copied: copiedButton === getButtonId(index, mode.value, idx, row.tag) }">
                      <Icon
                        :icon="copiedButton === getButtonId(index, mode.value, idx, row.tag) ? COMMON_ICONS.copied : COMMON_ICONS.copy"
                        width="14" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 英→中 翻译结果 -->
      <div v-if="!isZhToEn && translationResult && translationResult.length > 0" class="result-card"
        :class="{ 'is-stale': isTranslating }">
        <div v-for="(result, index) in translationResult" :key="index" class="result-group">
          <div class="result-title">
            <code class="result-english">{{ result.input }}</code>
            <span class="style-badge" :class="'badge-' + (result.style || 'unknown')">{{ result.style || 'unknown'
            }}</span>
            <span v-if="isFromCache" class="cache-badge">
              <Icon :icon="TI.cache" width="12" /> 缓存
            </span>
            <span v-else class="api-badge">
              <Icon :icon="TI.api" width="12" /> API
            </span>
          </div>
          <div class="reverse-body">
            <div class="reverse-meaning">{{ result.meaning }}</div>
            <div class="reverse-breakdown">
              <span v-for="(part, pIdx) in (result.breakdown || [])" :key="pIdx" class="breakdown-chip">
                <code>{{ part.en }}</code>
                <span class="breakdown-arrow">→</span>
                <span>{{ part.zh }}</span>
              </span>
            </div>
            <button @click="copyToClipboard(result.meaning, 'meaning-' + index)" class="copy-btn copy-btn-text"
              :class="{ copied: copiedButton === 'meaning-' + index }">
              <Icon :icon="copiedButton === 'meaning-' + index ? COMMON_ICONS.copied : COMMON_ICONS.copy" width="14" />
              <span>复制释义</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 无法翻译提示（能解析但确无可用命名） -->
      <div v-if="isEmptyResult && !error" class="card empty-card">
        <h2>
          <Icon :icon="TI.warning" width="16" /> 无法翻译
        </h2>
        <p>{{ isZhToEn ? '该内容无法翻译为编程命名，请尝试更具体的词语' : '该内容无法解析为编程命名，请检查输入' }}</p>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="card error-card">
        <h2>
          <Icon :icon="TI.error" width="16" /> 翻译失败
        </h2>
        <p>{{ error }}</p>
      </div>

      </template>

      <!-- 历史记录 -->
      <div v-else class="card history-panel">
        <div class="history-head">
          <span v-if="cacheStats" class="history-stats">缓存命中 {{ cacheStats.hits }}/{{ cacheStats.total }}</span>
          <span v-else class="history-stats">最近 7 天</span>
          <button v-if="historyList.length" class="btn-clear-history" @click="clearHistory">
            <Icon :icon="TI.delete" width="13" /> 清空
          </button>
        </div>
        <div v-if="historyList.length === 0" class="history-empty">
          <Icon :icon="TI.history" width="15" /> 暂无历史记录（保留 7 天）
        </div>
        <div v-for="item in historyList" :key="item._id" class="history-item" @click="useHistory(item)"
          title="点击重新查询">
          <span class="history-dir">{{ item.meta.direction === 'zh-en' ? '中→英' : '英→中' }}</span>
          <span class="history-input">{{ item.meta.input }}</span>
          <span v-if="item.meta.context !== 'general'" class="history-ctx">{{ ctxLabel(item.meta.context) }}</span>
          <span class="history-time">{{ formatTime(item.timestamp) }}</span>
          <button class="history-del" @click.stop="removeHistory(item)" title="删除">
            <Icon :icon="TI.delete" width="13" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { COMMON_ICONS, FEATURE_ICONS } from '@/config/icons';
import { API_CONFIG, CACHE_TTL } from '@/config/api';

const TI = FEATURE_ICONS.translator;

// 接收来自 App.vue 的 enterAction prop
const props = defineProps({
  enterAction: {
    type: Object,
    default: () => ({})
  },
  isDarkTheme: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle-theme']);

// 数据
const copiedButton = ref(null); // 记录当前复制的按钮
let isFromUtools = false;       // 标记输入是否来自 uTools 的自动填充（非模板状态，无需响应式）

// 风格行定义：tag 为展示标签，field 为结果字段名，map 为可选的本地派生变换
const FULL_ROWS = [
  { tag: 'camel', field: 'camelCase' },
  { tag: 'snake', field: 'snake_case' },
  { tag: 'Pascal', field: 'PascalCase' }
];
// variable 额外提供 kebab-case（由 snake_case 本地派生，不消耗 token）
const VAR_ROWS = [
  ...FULL_ROWS,
  { tag: 'kebab', field: 'snake_case', map: (v) => String(v).replace(/_/g, '-') }
];

const modes = [
  { value: 'variable', label: 'Variable', icon: TI.variable, desc: '名词或名词短语', rows: VAR_ROWS },
  { value: 'method', label: 'Method', icon: TI.method, desc: '动词开头', rows: FULL_ROWS },
  // constant 三种风格均为全大写，仅展示单行；class 仅 PascalCase 有意义
  { value: 'constant', label: 'Constant', icon: TI.constant, desc: '全大写下划线', rows: [{ tag: 'UPPER', field: 'snake_case' }] },
  { value: 'class', label: 'Class', icon: TI.class, desc: 'PascalCase', rows: [{ tag: 'Pascal', field: 'PascalCase' }] }
];
const direction = ref('zh-en'); // 'zh-en' | 'en-zh'
const isZhToEn = computed(() => direction.value === 'zh-en');

// 上下文生态（仅中→英生效）：影响提示词命名习惯与缓存 key
const CONTEXTS = [
  { value: 'general', label: '通用', hint: '' },
  { value: 'js', label: 'JS/TS', hint: 'JavaScript/TypeScript,变量camelCase为主' },
  { value: 'python', label: 'Python', hint: 'Python,变量/方法snake_case为主' },
  { value: 'java', label: 'Java', hint: 'Java,camelCase,类PascalCase' },
  { value: 'go', label: 'Go', hint: 'Go,简短驼峰,可导出名PascalCase' },
  { value: 'css', label: 'CSS', hint: 'CSS/前端样式,类名kebab风格,简短' }
];
const context = ref(localStorage.getItem('translator_context') || 'general');

// Tab 与历史记录
const activeTab = ref('translate'); // 'translate' | 'history'
const historyList = ref([]);
const cacheStats = ref(null);

const chineseInput = ref('');
const translationResult = ref(null);
const isEmptyResult = ref(false); // 能解析但确无可用命名时的友好空状态
const error = ref('');
const isTranslating = ref(false);
const isFromCache = ref(false);
const inputRef = ref(null);
let debounceTimer = null;
let utoolsTimer = null;   // uTools 输入的 100ms 延迟翻译定时器
let copyTimer = null;     // 复制反馈定时器
let errorTimer = null;    // 错误自动清除定时器
let abortController = null; // 当前翻译请求的中止控制器
let requestSeq = 0;         // 请求序号，防止旧响应覆盖新结果

const isApiConfigured = computed(() => !!API_CONFIG.apiKey);
const maxLen = computed(() => isZhToEn.value ? 15 : 30);
const inputLen = computed(() => chineseInput.value.trim().length);

function toggleTheme() {
  emit('toggle-theme');
}

function toggleDirection() {
  direction.value = direction.value === 'zh-en' ? 'en-zh' : 'zh-en';
  clearResults();
}

function getPrompt() {
  return isZhToEn.value ? getPromptZhToEn() : getPromptEnToZh();
}

function getPromptZhToEn() {
  const ctx = CONTEXTS.find((c) => c.value === context.value);
  const ctxHint = ctx?.hint ? `目标生态:${ctx.hint}。` : '';
  return `编程命名翻译。为每个中文词提供4类(variable/method/constant/class)翻译,variable/method各给2个候选(常用优先),constant/class各1个,每候选含camelCase/snake_case/PascalCase。${ctxHint}遇网络用语/语气词等无直译词,给出合理音译或意译;某类确无合适命名时该字段返回空数组[],禁止null。仅输出JSON数组,无解释。
示例输入:控制台
输出:[{"chinese":"控制台","variable":[{"camelCase":"console","snake_case":"console","PascalCase":"Console"},{"camelCase":"terminal","snake_case":"terminal","PascalCase":"Terminal"}],"method":[{"camelCase":"getConsole","snake_case":"get_console","PascalCase":"GetConsole"},{"camelCase":"openConsole","snake_case":"open_console","PascalCase":"OpenConsole"}],"constant":[{"camelCase":"CONSOLE","snake_case":"CONSOLE","PascalCase":"CONSOLE"}],"class":[{"camelCase":"Console","snake_case":"console","PascalCase":"Console"}]}]
翻译:${chineseInput.value}`;
}

function getPromptEnToZh() {
  return `分析编程命名。返回JSON数组，无解释。若输入无法解析为编程命名,meaning返回空字符串,breakdown返回空数组,禁止null。
示例输入:getUserName
输出:[{"input":"getUserName","style":"camelCase","breakdown":[{"en":"get","zh":"获取"},{"en":"user","zh":"用户"},{"en":"name","zh":"名称"}],"meaning":"获取用户名称"}]
分析:${chineseInput.value}`;
}

// 生成缓存键名（基于翻译方向 + 生态上下文 + 输入文本）
function getCacheKey() {
  const ctx = isZhToEn.value ? context.value : 'general';
  return `translator_cache_${direction.value}_${ctx}_${chineseInput.value.trim()}`;
}

// 写入/覆盖 db 文档（自动携带 _rev，uTools put 失败不抛异常，需检查返回值）
function dbUpsert(doc) {
  const existing = window.utools.db.get(doc._id);
  if (existing?._rev) {
    doc._rev = existing._rev;
  }
  const result = window.utools.db.put(doc);
  if (result?.error) {
    console.error('db 写入失败:', doc._id, result.message || result.name);
  }
  return result;
}

// 累加缓存统计：total = 总翻译请求数（命中+未命中），hits = 缓存命中数
function bumpStats(isHit) {
  try {
    const stats = window.utools.db.get('translator_cache_stats');
    const hits = (stats?.data?.hits || 0) + (isHit ? 1 : 0);
    const total = (stats?.data?.total || 0) + 1;
    dbUpsert({ _id: 'translator_cache_stats', data: { hits, total } });
  } catch (_) { /* 统计失败不影响功能 */ }
}

// 从缓存加载翻译结果（含 7 天过期检查）
function loadFromCache() {
  try {
    const cached = window.utools.db.get(getCacheKey());
    if (cached?.data) {
      if ((Date.now() - cached.timestamp) < CACHE_TTL) {
        bumpStats(true);
        return cached.data;
      }
      // 过期立即删除，避免残留
      window.utools.db.remove(cached);
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 保存翻译结果到缓存（meta 供历史记录列表使用）
function saveToCache(result) {
  try {
    dbUpsert({
      _id: getCacheKey(),
      data: result,
      timestamp: Date.now(),
      meta: {
        direction: direction.value,
        context: isZhToEn.value ? context.value : 'general',
        input: chineseInput.value.trim()
      }
    });
    bumpStats(false);
  } catch (e) {
    console.error('保存缓存失败:', e);
  }
}

// 启动时扫描缓存条目：过期或非当前格式（无 meta）的一律删除，防止 db 膨胀
function cleanExpiredCache() {
  try {
    const docs = window.utools.db.allDocs('translator_cache_');
    const now = Date.now();
    docs.forEach((doc) => {
      if (doc._id === 'translator_cache_stats') return;
      if (!doc.meta || (now - (doc.timestamp || 0)) >= CACHE_TTL) {
        window.utools.db.remove(doc);
      }
    });
  } catch (_) { /* 清理失败不影响功能 */ }
}

// 校验解析后的翻译结果结构是否符合当前方向的渲染要求
function isValidResult(list) {
  if (!Array.isArray(list) || list.length === 0) return false;
  if (isZhToEn.value) {
    return list.every((item) =>
      item && typeof item.chinese === 'string' &&
      modes.every((m) => Array.isArray(item[m.value]))
    );
  }
  return list.every((item) =>
    item && typeof item.input === 'string' && typeof item.meaning === 'string'
  );
}

// 兼容 json_object 模式的三种输出形态：顶层数组 / 单对象 / 被包裹的数组
function normalizeParsed(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    // 模型可能包一层对象，如 {"result": [...]}，取第一个数组属性
    const wrapped = Object.values(parsed).find((v) => Array.isArray(v));
    if (wrapped) return wrapped;
    return [parsed];
  }
  return [];
}

// 字段级归一化：兜底模型返回的残缺结构（null/缺失字段→空串/空数组），
// 避免把"能解析但字段缺失"误判为格式错误；非对象项补为标准空结构
function normalizeResult(list) {
  if (!Array.isArray(list)) return list;
  return list.map((item) => {
    const base = isZhToEn.value
      ? { chinese: '', variable: [], method: [], constant: [], class: [] }
      : { input: '', style: '', meaning: '', breakdown: [] };
    if (!item || typeof item !== 'object') return base;
    const normalized = { ...base, ...item };
    if (isZhToEn.value) {
      if (typeof normalized.chinese !== 'string') normalized.chinese = '';
      modes.forEach((m) => {
        if (!Array.isArray(normalized[m.value])) normalized[m.value] = [];
      });
    } else {
      if (typeof normalized.input !== 'string') normalized.input = '';
      if (typeof normalized.style !== 'string') normalized.style = '';
      if (typeof normalized.meaning !== 'string') normalized.meaning = '';
      if (!Array.isArray(normalized.breakdown)) normalized.breakdown = [];
    }
    return normalized;
  });
}

// 判定翻译结果是否"确无可用命名"（能解析但各字段均为空）
function isResultEmpty(list) {
  if (!Array.isArray(list) || list.length === 0) return false;
  if (isZhToEn.value) {
    return list.every((item) =>
      modes.every((m) => (item[m.value] || []).length === 0)
    );
  }
  return list.every((item) => !item.meaning || !item.meaning.trim());
}

async function translate() {
  if (!chineseInput.value.trim() || !isApiConfigured.value) return;

  // 长度限制：中文≤15字，英文≤30字符
  if (chineseInput.value.trim().length > maxLen.value) {
    error.value = `输入过长，请控制在${maxLen.value}个字符以内`;
    if (errorTimer) clearTimeout(errorTimer);
    errorTimer = setTimeout(() => { error.value = ''; }, 2000);
    return;
  }

  // 中止上一个未完成的请求，并用序号防止旧响应覆盖新结果
  abortController?.abort();
  abortController = new AbortController();
  const seq = ++requestSeq;

  isTranslating.value = true;
  error.value = '';
  isEmptyResult.value = false;

  try {
    // 先尝试从缓存加载
    const cachedResult = loadFromCache();
    if (cachedResult) {
      translationResult.value = cachedResult;
      isFromCache.value = true;
      isTranslating.value = false;
      return;
    }

    // 缓存未命中，调用 API 翻译
    isFromCache.value = false;
    const response = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_CONFIG.apiKey}`
      },
      signal: abortController.signal,
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages: [{ role: 'user', content: getPrompt() }],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' }, // 非思考模式，节省 reasoning token
      })
    });

    // 已有更新的请求，丢弃本次响应
    if (seq !== requestSeq) return;

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (seq !== requestSeq) return;
    const resultText = data.choices?.[0]?.message?.content || '';

    // 解析JSON结果
    try {
      // 提取JSON部分（移除可能的代码块）
      let jsonText = resultText.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const parsed = normalizeParsed(JSON.parse(jsonText));
      const result = normalizeResult(parsed);
      if (!isValidResult(result)) {
        throw new Error('结果结构不符合预期');
      }
      // 能解析但确无合适命名 → 友好空状态提示，不写入缓存避免历史出现无效条目
      if (isResultEmpty(result)) {
        isEmptyResult.value = true;
        translationResult.value = null;
        return;
      }
      translationResult.value = result;

      // 保存到缓存
      saveToCache(result);
    } catch (parseError) {
      console.error('JSON解析错误:', parseError, '\n原始内容:', resultText);
      throw new Error('翻译结果格式错误，请重试');
    }
  } catch (e) {
    // 被主动中止的请求不展示错误
    if (e.name === 'AbortError') return;
    if (seq !== requestSeq) return;
    error.value = e.message || '翻译失败，请检查 API 配置';
  } finally {
    if (seq === requestSeq) {
      isTranslating.value = false;
    }
  }
}

async function copyToClipboard(text, buttonId) {
  try {
    await navigator.clipboard.writeText(text);
    // 显示复制成功反馈（先清除旧定时器，避免连续复制时反馈被提前清除）
    if (copyTimer) clearTimeout(copyTimer);
    copiedButton.value = buttonId;
    copyTimer = setTimeout(() => {
      copiedButton.value = null;
    }, 2000);
  } catch (err) {
    error.value = '复制失败';
  }
}

// 取命名行展示值（支持 kebab 等本地派生）
function rowValue(option, row) {
  const v = option?.[row.field] ?? '';
  return row.map ? row.map(v) : v;
}

// 生成唯一按钮ID
function getButtonId(resultIndex, modeValue, optionIndex, styleType) {
  return `${resultIndex}-${modeValue}-${optionIndex}-${styleType}`;
}

function clearResults() {
  translationResult.value = null;
  isEmptyResult.value = false;
  chineseInput.value = '';
  error.value = '';
  isFromCache.value = false;
  // 取消待触发的自动翻译
  if (debounceTimer) clearTimeout(debounceTimer);
  if (utoolsTimer) clearTimeout(utoolsTimer);
}

// Enter 立即翻译（Shift+Enter 换行）
function onEnterKey() {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (utoolsTimer) clearTimeout(utoolsTimer);
  if (isApiConfigured.value && chineseInput.value.trim()) {
    translate();
  }
}

// 切换上下文生态：持久化并对当前输入立即重译（命中对应生态缓存则瞬时返回）
function setContext(value) {
  if (context.value === value) return;
  context.value = value;
  localStorage.setItem('translator_context', value);
  if (debounceTimer) clearTimeout(debounceTimer);
  if (isApiConfigured.value && chineseInput.value.trim()) {
    translate();
  }
}

function ctxLabel(value) {
  return CONTEXTS.find((c) => c.value === value)?.label || value;
}

// ── 历史记录 ────────────────────────────────────────

function switchTab(tab) {
  activeTab.value = tab;
  if (tab === 'history') {
    loadHistory();
  } else {
    nextTick(() => inputRef.value?.focus());
  }
}

function loadHistory() {
  try {
    const docs = window.utools.db.allDocs('translator_cache_');
    // 当前格式的缓存条目均带 meta（stats 文档无 meta，随之排除）
    historyList.value = docs
      .filter((d) => d.meta)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
    cacheStats.value = window.utools.db.get('translator_cache_stats')?.data || null;
  } catch (_) {
    historyList.value = [];
    cacheStats.value = null;
  }
}

// 点击历史条目：回填方向/生态/输入并立即翻译（命中缓存瞬时返回）
function useHistory(item) {
  direction.value = item.meta.direction;
  if (item.meta.direction === 'zh-en') {
    context.value = item.meta.context;
  }
  activeTab.value = 'translate';
  chineseInput.value = item.meta.input;
  nextTick(() => {
    // 取消输入 watch 设置的防抖，直接翻译
    if (debounceTimer) clearTimeout(debounceTimer);
    if (isApiConfigured.value) translate();
    inputRef.value?.focus();
  });
}

function removeHistory(item) {
  try {
    window.utools.db.remove(item);
  } catch (_) { /* 删除失败忽略 */ }
  loadHistory();
}

function clearHistory() {
  try {
    const docs = window.utools.db.allDocs('translator_cache_');
    docs.forEach((doc) => {
      if (doc._id !== 'translator_cache_stats') {
        window.utools.db.remove(doc);
      }
    });
  } catch (_) { /* 清空失败忽略 */ }
  loadHistory();
}

// 相对时间展示
function formatTime(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

// 键盘快捷键处理
function handleKeyDown(event) {
  // Ctrl+Enter 或 Cmd+Enter: 立即翻译（与 Enter 行为一致）
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    onEnterKey();
  }

  // Ctrl+K 或 Cmd+K: 清空输入框
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault();
    clearResults();
  }
}

onMounted(() => {
  // 注册键盘事件监听
  window.addEventListener('keydown', handleKeyDown);
  // 清理过期缓存
  cleanExpiredCache();
  // 自动聚焦输入框
  inputRef.value?.focus();
});

// 监听 enterAction 变化，处理 uTools 输入
watch(
  () => props.enterAction,
  (action) => {
    if (!action) {
      return;
    }

    // 每次进入插件自动聚焦输入框（含无 payload 的纯进入场景）
    nextTick(() => inputRef.value?.focus());

    if (!action.payload) {
      return;
    }

    let text = '';

    // 提取文本（over 类型与直接输入的 payload 结构相同）
    if (typeof action.payload === 'string') {
      text = action.payload;
    } else if (action.payload.text) {
      text = action.payload.text;
    }

    // 如果获取到文本，填充并翻译
    text = text.trim();
    if (text) {
      // 与当前输入相同时 watch 不会触发，直接翻译，避免 isFromUtools 标记残留
      if (text === chineseInput.value.trim()) {
        if (isApiConfigured.value) translate();
        return;
      }
      // 先设置标记
      isFromUtools = true;
      // 使用 nextTick 确保在下一个 tick 设置值，这样 watch 能正确触发
      nextTick(() => {
        chineseInput.value = text;
      });
    }
  },
  {
    immediate: true
  }
);

onUnmounted(() => {
  // 清理键盘事件监听
  window.removeEventListener('keydown', handleKeyDown);
  // 清理全部定时器
  if (debounceTimer) clearTimeout(debounceTimer);
  if (utoolsTimer) clearTimeout(utoolsTimer);
  if (copyTimer) clearTimeout(copyTimer);
  if (errorTimer) clearTimeout(errorTimer);
  // 中止未完成的请求
  abortController?.abort();
});

// 监听输入变化，自动翻译
watch(chineseInput, (newValue) => {
  // 如果是来自 uTools 的输入，立即翻译
  if (isFromUtools) {
    isFromUtools = false; // 重置标记
    if (debounceTimer) clearTimeout(debounceTimer);
    if (utoolsTimer) clearTimeout(utoolsTimer);

    // 短暂延迟后立即翻译，确保 API 配置已加载；回调内取当前输入值，避免清空后仍用旧文本翻译
    utoolsTimer = setTimeout(() => {
      if (isApiConfigured.value && chineseInput.value.trim()) {
        translate();
      }
    }, 100);
    return;
  }

  // 清除之前的定时器
  if (debounceTimer) clearTimeout(debounceTimer);

  // 如果输入为空，清空结果
  if (!newValue.trim()) {
    translationResult.value = null;
    isEmptyResult.value = false;
    error.value = '';
    return;
  }

  // 延迟2.5秒后自动翻译（手动输入的情况）
  debounceTimer = setTimeout(() => {
    if (isApiConfigured.value && newValue.trim()) {
      translate();
    }
  }, 2500);
});
</script>

<style lang="scss" scoped>
@use './index.scss';
</style>
