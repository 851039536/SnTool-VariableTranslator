<template>
  <div class="github-dark" :data-theme="isDarkTheme ? 'dark' : 'light'">
    <div class="container">
      <header>
        <h1>🔤 中文变量名翻译助手</h1>
        <p>将中文转换为符合编程规范的英文变量名</p>
        <div class="header-controls">
          <button @click="toggleTheme" class="btn-theme" :title="isDarkTheme ? '切换到亮色' : '切换到暗色'">
            {{ isDarkTheme ? '☀️' : '🌙' }}
          </button>
          <button @click="toggleApiConfig" class="btn-config" title="API配置">
            ⚙️
          </button>
        </div>
      </header>

      <!-- API 配置浮层 -->
      <div v-show="showApiConfig" class="config-modal">
        <div class="config-overlay" @click="toggleApiConfig"></div>
        <div class="config-panel">
          <div class="config-header">
            <h2>⚙️ API 配置</h2>
            <button @click="toggleApiConfig" class="btn-close">×</button>
          </div>
          <div class="config-content">
            <div class="form-group">
              <label>选择预设</label>
              <select v-model="selectedPreset" @change="applyPreset" class="input">
                <option value="">自定义</option>
                <option value="openai">OpenAI</option>
                <option value="qwen">通义千问</option>
                <option value="deepseek">DeepSeek</option>
                <option value="zhipu">智谱 GLM</option>
                <option value="kimi">Moonshot Kimi</option>
              </select>
            </div>
            <div class="form-group">
              <label>API 端点</label>
              <input v-model="apiConfig.endpoint" type="text" class="input"
                placeholder="https://api.example.com/v1/chat/completions" />
              <span class="input-tip">支持 OpenAI 兼容格式的接口</span>
            </div>
            <div class="form-group">
              <label>API Key</label>
              <input v-model="apiConfig.apiKey" type="password" class="input" placeholder="sk-..." />
            </div>
            <div class="form-group">
              <label>模型名称</label>
              <input v-model="apiConfig.model" type="text" class="input" placeholder="gpt-3.5-turbo" />
            </div>
            <button @click="saveApiConfig" class="btn btn-primary">保存配置</button>
            <span v-if="configSaved" class="save-tip">✓ 已保存</span>
          </div>
        </div>
      </div>

      <!-- 翻译区域 -->
      <div class="card">
        <h2>✍️ 输入中文</h2>
        <div class="form-group">
          <textarea v-model="chineseInput" class="input textarea" placeholder="例如：用户名称,获取用户信息;输入完成后将自动翻译..."
            rows="1"></textarea>
        </div>

        <div class="status-bar">
          <span v-if="isTranslating" class="status-tip translating">🔄 翻译中...</span>
          <span v-else-if="!isApiConfigured" class="status-tip error">⚠️ 请先配置 API</span>
          <span v-else-if="chineseInput.trim()" class="status-tip ready">✓ 就绪，稍后自动翻译</span>
          <span v-else class="status-tip">✏️ 请输入中文</span>
          <span class="keyboard-hints">💡 Ctrl+Enter 立即翻译 | Ctrl+K 清空</span>
        </div>
      </div>

      <!-- 翻译结果 -->
      <div v-if="translationResult && translationResult.length > 0" class="result-card">
        <div v-for="(result, index) in translationResult" :key="index" class="result-group">
          <div class="result-title">
            <span class="result-index">{{ index + 1 }}</span>
            <span class="result-chinese">{{ result.chinese }}</span>
          </div>

          <div class="naming-types">
            <div v-for="mode in modes" :key="mode.value" class="naming-type">
              <div class="type-header">
                <span class="type-icon">{{ mode.icon }}</span>
                <div class="type-info">
                  <span class="type-label">{{ mode.label }}</span>
                  <span class="type-desc">{{ mode.desc }}</span>
                </div>
              </div>

              <div class="naming-options">
                <div v-for="(option, idx) in result[mode.value]" :key="idx" class="naming-option">
                  <div class="option-group">
                    <div class="style-row">
                      <code class="code-text">{{ option.camelCase }}</code>
                      <button @click="copyToClipboard(option.camelCase, getButtonId(index, mode.value, idx, 'camel'))"
                        class="copy-btn"
                        :class="{ 'copied': copiedButton === getButtonId(index, mode.value, idx, 'camel') }">
                        {{ copiedButton === getButtonId(index, mode.value, idx, 'camel') ? '✓' : '📋' }}
                      </button>
                    </div>
                    <div class="style-row">
                      <code class="code-text">{{ option.snake_case }}</code>
                      <button @click="copyToClipboard(option.snake_case, getButtonId(index, mode.value, idx, 'snake'))"
                        class="copy-btn"
                        :class="{ 'copied': copiedButton === getButtonId(index, mode.value, idx, 'snake') }">
                        {{ copiedButton === getButtonId(index, mode.value, idx, 'snake') ? '✓' : '📋' }}
                      </button>
                    </div>
                    <div class="style-row">
                      <code class="code-text">{{ option.PascalCase }}</code>
                      <button @click="copyToClipboard(option.PascalCase, getButtonId(index, mode.value, idx, 'pascal'))"
                        class="copy-btn"
                        :class="{ 'copied': copiedButton === getButtonId(index, mode.value, idx, 'pascal') }">
                        {{ copiedButton === getButtonId(index, mode.value, idx, 'pascal') ? '✓' : '📋' }}
                      </button>
                    </div>
                    <div v-if="option.phonetic" class="phonetic-row">
                      <span class="phonetic-label">🎧 谐音：</span>
                      <div class="pinyin-box">{{ option.phonetic }}</div>
                      <button @click="speakPhonetic(option.camelCase)" class="copy-btn" title="读出英文发音">
                        🔊
                      </button>
                      <button @click="copyToClipboard(option.phonetic, getButtonId(index, mode.value, idx, 'phonetic'))"
                        class="copy-btn"
                        :class="{ 'copied': copiedButton === getButtonId(index, mode.value, idx, 'phonetic') }">
                        {{ copiedButton === getButtonId(index, mode.value, idx, 'phonetic') ? '✓' : '📋' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="result-actions">
          <button @click="clearResults" class="btn btn-outline">🗑️ 清空结果</button>
        </div>
      </div>


      <!-- 错误提示 -->
      <div v-if="error" class="card error-card">
        <h2>❌ 翻译失败</h2>
        <p>{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';

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
const showApiConfig = ref(false);
const selectedPreset = ref('');
const apiConfig = ref({
  endpoint: '',
  apiKey: '',
  model: 'gpt-3.5-turbo'
});
const configSaved = ref(false);
const copiedButton = ref(null); // 记录当前复制的按钮
const isFromUtools = ref(false); // 标记是否来自 uTools 的自动填充

// API 预设配置
const presets = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo'
  },
  qwen: {
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo'
  },
  deepseek: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  },
  zhipu: {
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash'
  },
  kimi: {
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k'
  }
};

const modes = [
  { value: 'variable', label: '变量命名', icon: '', desc: '名词或名词短语' },
  { value: 'method', label: '方法命名', icon: '', desc: '动词开头' },
  { value: 'constant', label: '常量命名', icon: '', desc: '全大写下划线' },
  { value: 'class', label: '类名命名', icon: '', desc: 'PascalCase' }
];
const chineseInput = ref('');
const translationResult = ref(null);
const error = ref('');
const isTranslating = ref(false);
let debounceTimer = null;

// 计算属性
const isApiConfigured = computed(() => {
  return apiConfig.value.endpoint && apiConfig.value.apiKey;
});

// 方法
function toggleApiConfig() {
  showApiConfig.value = !showApiConfig.value;
}

function toggleTheme() {
  emit('toggle-theme');
}

function applyPreset() {
  if (selectedPreset.value && presets[selectedPreset.value]) {
    const preset = presets[selectedPreset.value];
    apiConfig.value.endpoint = preset.endpoint;
    apiConfig.value.model = preset.model;
  }
}

function saveApiConfig() {
  try {
    const config = {
      ...apiConfig.value,
      preset: selectedPreset.value
    };
    // 使用 uTools 数据库存储
    window.utools.db.put({
      _id: 'translator_api_config',
      data: config
    });
    configSaved.value = true;
    setTimeout(() => {
      configSaved.value = false;
    }, 2000);
  } catch (e) {
    error.value = '保存配置失败';
  }
}

function loadApiConfig() {
  try {
    // 从 uTools 数据库读取
    const saved = window.utools.db.get('translator_api_config');
    if (saved && saved.data) {
      const config = saved.data;
      apiConfig.value = {
        endpoint: config.endpoint || '',
        apiKey: config.apiKey || '',
        model: config.model || 'gpt-3.5-turbo'
      };
      selectedPreset.value = config.preset || '';
    }
  } catch (e) {
    console.error('加载配置失败', e);
  }
}

// Web Speech API 方法 - 播放英文发音
function speakPhonetic(englishText) {
  // 检查浏览器是否支持 Web Speech API
  const SpeechSynthesisUtterance = window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance;
  const speechSynthesis = window.speechSynthesis;

  if (!SpeechSynthesisUtterance || !speechSynthesis) {
    error.value = '你的浏览器不支持 Web Speech API';
    setTimeout(() => {
      error.value = '';
    }, 2000);
    return;
  }

  try {
    // 取消正在播放的音声
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    // 创建语音对象
    const utterance = new SpeechSynthesisUtterance(englishText);
    utterance.lang = 'en-US';
    utterance.rate = 1; // 正常速度
    utterance.pitch = 1;
    utterance.volume = 1;

    // 播放语音
    speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Web Speech API 错误:', e);
    error.value = '音频播放失败';
    setTimeout(() => {
      error.value = '';
    }, 2000);
  }
}



function getPrompt() {
  return `你是一个专业的编程命名助手。请将以下中文翻译为符合编程规范的英文命名。

要求:
1. 为每个中文提供4种类型的翻译:
   - variable(变量命名):名词或名词短语
   - method(方法命名):动词开头
   - constant(常量命名):全大写下划线,如:USER_NAME
   - class(类名):名词,使用PascalCase

2. 每种类型提供1-2个可选方案,每个方案包含3种命名风格和谐音:
   - camelCase:驼峰命名(首字母小写),如:userName
   - snake_case:下划线命名(全小写),如:user_name
   - PascalCase:帕斯卡命名(首字母大写),如:UserName
   - phonetic:英文发音的谐音(使用英式自然发音,带拼音标注,如:西斯腾(xī sī téng))

3. 语义清晰、简洁、符合英语习惯

4. 严格按照JSON格式输出,不要有其他解释

输出格式(JSON):
[
  {
    "chinese": "控制台",
    "variable": [
      { "camelCase": "console", "snake_case": "console", "PascalCase": "Console", "phonetic": "康萨欧(kāng sà ōu)" }
    ],
    "method": [
      { "camelCase": "getConsole", "snake_case": "get_console", "PascalCase": "GetConsole", "phonetic": "盖特康萨欧(gài tè kāng sà ōu)" }
    ],
    "constant": [
      { "camelCase": "CONSOLE", "snake_case": "CONSOLE", "PascalCase": "CONSOLE", "phonetic": "康萨欧(kāng sà ōu)" }
    ],
    "class": [
      { "camelCase": "Console", "snake_case": "console", "PascalCase": "Console", "phonetic": "康萨欧(kāng sà ōu)" }
    ]
  }
]

请翻译以下内容:
${chineseInput.value}`;
}

async function translate() {
  if (!chineseInput.value.trim() || !isApiConfigured.value) return;

  isTranslating.value = true;
  error.value = '';
  translationResult.value = null;

  try {
    const response = await fetch(apiConfig.value.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.value.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.value.model,
        messages: [
          {
            role: 'user',
            content: getPrompt()
          }
        ],
        temperature: 0.3
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
      translationResult.value = Array.isArray(parsed) ? parsed : [parsed];



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

  // Esc: 关闭配置面板
  if (event.key === 'Escape' && showApiConfig.value) {
    event.preventDefault();
    toggleApiConfig();
  }
}

onMounted(() => {
  loadApiConfig();
  // 注册键盘事件监听
  window.addEventListener('keydown', handleKeyDown);
});

// 监听 enterAction 变化，处理 uTools 输入
watch(() => props.enterAction, (action) => {
  if (!action || !action.payload) {
    return;
  }

  // 每次进入时重新加载配置，确保数据不丢失
  loadApiConfig();

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
}, {
  immediate: true,
  deep: true
});

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

<style scoped>
.github-dark {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  padding: 16px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

header {
  text-align: center;
  margin-bottom: 16px;
  position: relative;
}

header h1 {
  font-size: 20px;
  margin-bottom: 4px;
  color: #3b82f6;
  font-weight: 600;
}

header p {
  color: var(--text-secondary);
  font-size: 13px;
}

.header-controls {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-theme {
  padding: 8px 12px;
  font-size: 18px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-theme:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transform: rotate(20deg);
}

.btn-config {
  padding: 8px 12px;
  font-size: 18px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-config:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transform: rotate(45deg);
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 14px;
  margin-bottom: 10px;
}

.card h2 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 18px;
  color: var(--text-primary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.btn-text {
  background: transparent;
  color: #3b82f6;
  border: none;
  cursor: pointer;
  font-size: 13px;
  padding: 4px 8px;
}

.btn-text:hover {
  color: #1d4ed8;
}

.config-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.config-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.config-panel {
  position: relative;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  z-index: 1;
}

.config-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.btn-close {
  padding: 4px 10px;
  font-size: 24px;
  line-height: 1;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.btn-close:hover {
  color: var(--text-primary);
}

.config-content {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 14px;
}

.input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-dark);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.textarea {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  resize: vertical;
  line-height: 1.6;
}

.status-tip {
  font-size: 13px;
  color: var(--text-secondary);
}

.keyboard-hints {
  margin-left: 12px;
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.8;
}

.result-group {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 18px;
  margin-bottom: 16px;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 3px solid var(--border);
  transition: border-color 0.2s;
}

.result-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  border-radius: 50%;
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.result-chinese {
  font-size: 26px;
  font-weight: 700;
  color: #3b82f6;
  letter-spacing: 0.5px;
}

.naming-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.naming-type {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.naming-type:hover {
  border-color: var(--border-dark);
  background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--border-dark) 100%);
}

.type-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-dark);
  transition: border-color 0.2s;
}

.type-header:hover {
  border-bottom-color: var(--text-secondary);
}

.type-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.type-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.type-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.type-desc {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
  letter-spacing: 0.2px;
}

.naming-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.naming-option {
  background: var(--bg-primary);
  border-radius: 4px;
  padding: 10px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 5px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  transition: all 0.2s;
}

.style-row:hover {
  background: var(--border-dark);
}

.style-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 3px;
  flex-shrink: 0;
  min-width: 110px;
  text-align: center;
  letter-spacing: 0.2px;
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.style-row:hover .style-label {
  background: var(--border-dark);
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.code-text {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
  color: #3b82f6;
  font-size: 18px;
  font-weight: 500;
  background: transparent;
  border: none;
  padding: 0;
  word-break: break-all;
  letter-spacing: 0.3px;
}

.copy-btn {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
  flex-shrink: 0;
  min-width: 28px;
  text-align: center;
}

.copy-btn:hover {
  opacity: 1;
  background: #e5e7eb;
  transform: scale(1.05);
}

.copy-btn.copied {
  background: #10b981;
  color: #ffffff;
  opacity: 1;
  border-color: #10b981;
  animation: copySuccess 0.3s ease;
}

@keyframes copySuccess {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.15);
  }

  100% {
    transform: scale(1);
  }
}

.result-actions {
  margin-top: 20px;
  text-align: center;
}

.btn-copy {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #30363d;
  background: #21262d;
  border-radius: 4px;
  cursor: pointer;
}

.btn-copy:hover {
  background: #30363d;
}

.error-card {
  border-color: #dc2626;
  background: rgba(220, 38, 38, 0.05);
}

.phonetic-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 5px;
  background: var(--bg-secondary);
  border-radius: 4px;
  margin-top: 8px;
  border: 1px solid var(--border);
}

.phonetic-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
  min-width: 80px;
}

.pinyin-box {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-dark);
  border-radius: 4px;
  padding: 6px 10px;
  color: #3b82f6;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.3px;
}
</style>
