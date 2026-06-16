<template>
  <div class="github-dark" :data-theme="isDarkTheme ? 'dark' : 'light'">
    <div class="container">
      <header class="header">
        <span class="header-desc">{{ isZhToEn ? '中文 → 英文变量名' : '英文变量名 → 中文释义' }}</span>
        <div class="header-controls">
          <button @click="toggleDirection" class="btn-swap" title="切换翻译方向">
            <Icon :icon="COMMON_ICONS.swap" width="16" />
          </button>
          <button @click="toggleTheme" class="btn-theme" :title="isDarkTheme ? '切换到亮色' : '切换到暗色'">
            <Icon :icon="isDarkTheme ? COMMON_ICONS.sun : COMMON_ICONS.moon" width="16" />
          </button>
        </div>
      </header>

      <!-- 翻译区域 -->
      <div class="card card-input">
        <div class="input-wrap">
          <textarea v-model="chineseInput" class="input textarea"
            :placeholder="isZhToEn ? '输入中文，例如：用户名称' : '输入英文变量名，例如：getUserName'" rows="1"></textarea>
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
          <span class="keyboard-hints">Ctrl+Enter 翻译 · Ctrl+K 清空</span>
        </div>
      </div>

      <!-- 中→英 翻译结果 -->
      <div v-if="isZhToEn && translationResult && translationResult.length > 0" class="result-card">
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
                  <div class="style-row">
                    <span class="style-tag tag-camel">camel</span>
                    <code class="code-text">{{ option.camelCase }}</code>
                    <button @click="copyToClipboard(option.camelCase, getButtonId(index, mode.value, idx, 'camel'))"
                      class="copy-btn"
                      :class="{ copied: copiedButton === getButtonId(index, mode.value, idx, 'camel') }">
                      <Icon
                        :icon="copiedButton === getButtonId(index, mode.value, idx, 'camel') ? COMMON_ICONS.copied : COMMON_ICONS.copy"
                        width="14" />
                    </button>
                  </div>
                  <div class="style-row">
                    <span class="style-tag tag-snake">snake</span>
                    <code class="code-text">{{ option.snake_case }}</code>
                    <button @click="copyToClipboard(option.snake_case, getButtonId(index, mode.value, idx, 'snake'))"
                      class="copy-btn"
                      :class="{ copied: copiedButton === getButtonId(index, mode.value, idx, 'snake') }">
                      <Icon
                        :icon="copiedButton === getButtonId(index, mode.value, idx, 'snake') ? COMMON_ICONS.copied : COMMON_ICONS.copy"
                        width="14" />
                    </button>
                  </div>
                  <div class="style-row">
                    <span class="style-tag tag-pascal">Pascal</span>
                    <code class="code-text">{{ option.PascalCase }}</code>
                    <button @click="copyToClipboard(option.PascalCase, getButtonId(index, mode.value, idx, 'pascal'))"
                      class="copy-btn"
                      :class="{ copied: copiedButton === getButtonId(index, mode.value, idx, 'pascal') }">
                      <Icon
                        :icon="copiedButton === getButtonId(index, mode.value, idx, 'pascal') ? COMMON_ICONS.copied : COMMON_ICONS.copy"
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
      <div v-if="!isZhToEn && translationResult && translationResult.length > 0" class="result-card">
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

      <!-- 错误提示 -->
      <div v-if="error" class="card error-card">
        <h2>
          <Icon :icon="TI.error" width="16" /> 翻译失败
        </h2>
        <p>{{ error }}</p>
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
const copiedButton = ref(null);  // 记录当前复制的按钮
const isFromUtools = ref(false); // 标记是否来自 uTools 的自动填充

const modes = [
  { value: 'variable', label: 'Variable', icon: TI.variable, desc: '名词或名词短语' },
  { value: 'method', label: 'Method', icon: TI.method, desc: '动词开头' },
  { value: 'constant', label: 'Constant', icon: TI.constant, desc: '全大写下划线' },
  { value: 'class', label: 'Class', icon: TI.class, desc: 'PascalCase' }
];
const direction = ref('zh-en'); // 'zh-en' | 'en-zh'
const isZhToEn = computed(() => direction.value === 'zh-en');
const chineseInput = ref('');
const translationResult = ref(null);
const error = ref('');
const isTranslating = ref(false);
const isFromCache = ref(false);
let debounceTimer = null;

const isApiConfigured = computed(() => !!API_CONFIG.apiKey);

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
  return `编程命名翻译。为每个中文词提供4类(variable/method/constant/class)翻译，每类含camelCase/snake_case/PascalCase。仅输出JSON数组，无解释。
示例输入:控制台
输出:[{"chinese":"控制台","variable":[{"camelCase":"console","snake_case":"console","PascalCase":"Console"}],"method":[{"camelCase":"getConsole","snake_case":"get_console","PascalCase":"GetConsole"}],"constant":[{"camelCase":"CONSOLE","snake_case":"CONSOLE","PascalCase":"CONSOLE"}],"class":[{"camelCase":"Console","snake_case":"console","PascalCase":"Console"}]}]
翻译:${chineseInput.value}`;
}

function getPromptEnToZh() {
  return `分析编程命名。返回JSON数组，无解释。
示例输入:getUserName
输出:[{"input":"getUserName","style":"camelCase","breakdown":[{"en":"get","zh":"获取"},{"en":"user","zh":"用户"},{"en":"name","zh":"名称"}],"meaning":"获取用户名称"}]
分析:${chineseInput.value}`;
}

// 生成缓存键名（仅基于输入文本，与模型无关）
function getCacheKey() {
  return `translator_cache_${direction.value}_${chineseInput.value.trim()}`;
}

// 从缓存加载翻译结果（含 7 天过期检查）
async function loadFromCache() {
  try {
    const cached = window.utools.db.get(getCacheKey());
    if (cached?.data && (Date.now() - cached.timestamp) < CACHE_TTL) {
      // 累加缓存命中计数
      try {
        const stats = window.utools.db.get('translator_cache_stats');
        const hits = (stats?.data?.hits || 0) + 1;
        window.utools.db.put({ _id: 'translator_cache_stats', data: { hits, total: stats?.data?.total || hits } });
      } catch (_) { /* 统计失败不影响功能 */ }
      return cached.data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 保存翻译结果到缓存
async function saveToCache(result) {
  try {
    window.utools.db.put({
      _id: getCacheKey(),
      data: result,
      timestamp: Date.now()
    });
    // 累加总请求计数
    const stats = window.utools.db.get('translator_cache_stats');
    const total = (stats?.data?.total || 0) + 1;
    window.utools.db.put({ _id: 'translator_cache_stats', data: { hits: stats?.data?.hits || 0, total } });
  } catch (e) {
    console.error('保存缓存失败:', e);
  }
}

async function translate() {
  if (!chineseInput.value.trim() || !isApiConfigured.value) return;

  // 超过15个字符不翻译
  if (isZhToEn.value && chineseInput.value.length > 15) {
    error.value = '输入过长，请控制在15字以内';
    setTimeout(() => { error.value = ''; }, 2000);
    return;
  }
  if (!isZhToEn.value) {
    const words = chineseInput.value.trim().split(/[_\s-]+/);
    if (words.some(w => w.length > 30)) {
      error.value = '单词过长';
      setTimeout(() => { error.value = ''; }, 2000);
      return;
    }
  }

  isTranslating.value = true;
  error.value = '';
  translationResult.value = null;

  try {
    // 先尝试从缓存加载
    const cachedResult = await loadFromCache();
    if (cachedResult) {
      translationResult.value = cachedResult;
      isFromCache.value = true;
      isTranslating.value = false;
      return;
    }

    // 缓存未命中，标记为 API 翻译
    isFromCache.value = false;

    // 缓存未命中，调用 API 翻译
    const response = await fetch(API_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: API_CONFIG.model,
        messages: [{ role: 'user', content: getPrompt() }],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' }, // 非思考模式，节省 reasoning token
      })
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || '';

    // 解析JSON结果
    try {
      // 提取JSON部分（移除可能的代码块）
      let jsonText = resultText.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonText);
      const result = Array.isArray(parsed) ? parsed : [parsed];
      translationResult.value = result;

      // 保存到缓存
      await saveToCache(result);
    } catch (parseError) {
      console.error('JSON解析错误:', parseError, '\n原始内容:', resultText);
      throw new Error('翻译结果格式错误，请重试');
    }
  } catch (e) {
    error.value = e.message || '翻译失败，请检查 API 配置';
  } finally {
    isTranslating.value = false;
  }
}

async function copyToClipboard(text, buttonId) {
  try {
    await navigator.clipboard.writeText(text);
    // 显示复制成功反馈
    copiedButton.value = buttonId;
    setTimeout(() => {
      copiedButton.value = null;
    }, 2000);
  } catch (err) {
    error.value = '复制失败';
  }
}

// 生成唯一按钮ID
function getButtonId(resultIndex, modeValue, optionIndex, styleType) {
  return `${resultIndex}-${modeValue}-${optionIndex}-${styleType}`;
}

function clearResults() {
  translationResult.value = null;
  chineseInput.value = '';
  error.value = '';
}

// 键盘快捷键处理
function handleKeyDown(event) {
  // Ctrl+Enter 或 Cmd+Enter: 立即翻译
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    if (isApiConfigured.value && chineseInput.value.trim()) {
      // 清除防抖定时器，立即翻译
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      translate();
    }
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
});

// 监听 enterAction 变化，处理 uTools 输入
watch(
  () => props.enterAction,
  (action) => {
    if (!action || !action.payload) {
      return;
    }

    let text = '';

    // 处理 over 类型（从搜索框过来的文本）
    if (action.type === 'over') {
      if (typeof action.payload === 'string') {
        text = action.payload;
      } else if (action.payload.text) {
        text = action.payload.text;
      }
    }
    // 处理直接输入的情况
    else if (typeof action.payload === 'string') {
      text = action.payload;
    } else if (action.payload.text) {
      text = action.payload.text;
    }

    // 如果获取到文本，填充并翻译
    if (text.trim()) {
      // 先设置标记
      isFromUtools.value = true;
      // 使用 nextTick 确保在下一个 tick 设置值，这样 watch 能正确触发
      nextTick(() => {
        chineseInput.value = text.trim();
      });
    }
  },
  {
    immediate: true,
    deep: true
  }
);

onUnmounted(() => {
  // 清理键盘事件监听
  window.removeEventListener('keydown', handleKeyDown);
  // 清理定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});

// 监听输入变化，自动翻译
watch(chineseInput, (newValue) => {
  // 如果是来自 uTools 的输入，立即翻译
  if (isFromUtools.value) {
    isFromUtools.value = false; // 重置标记

    // 清除之前的定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // 短暂延迟后立即翻译，确保 API 配置已加载
    setTimeout(() => {
      if (isApiConfigured.value && newValue.trim()) {
        translate();
      }
    }, 100);
    return;
  }

  // 清除之前的定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // 如果输入为空，清空结果
  if (!newValue.trim()) {
    translationResult.value = null;
    error.value = '';
    return;
  }

  // 延迟1.5秒后自动翻译（手动输入的情况）
  debounceTimer = setTimeout(() => {
    if (isApiConfigured.value && newValue.trim()) {
      translate();
    }
  }, 1500);
});
</script>

<style lang="scss" scoped>
@import './index.scss';
</style>
