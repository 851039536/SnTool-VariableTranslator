<template>
  <div class="github-dark" :data-theme="isDarkTheme ? 'dark' : 'light'">
    <div class="container">
      <header>
        <p>将中文转换为符合编程规范的英文变量名</p>
        <div class="header-controls">
          <button @click="toggleTheme" class="btn-theme" :title="isDarkTheme ? '切换到亮色' : '切换到暗色'">
            {{ isDarkTheme ? '☀️' : '🌙' }}
          </button>
          <button @click="toggleApiConfig" class="btn-config" title="API配置">⚙️</button>
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
                <option value="qwen">通义千问</option>
                <option value="deepseek">DeepSeek</option>
                <option value="zhipu">智谱 GLM</option>
                <option value="kimi">Moonshot Kimi</option>
              </select>
            </div>
            <div class="form-group">
              <label>API 端点</label>
              <input
                v-model="currentPresetConfig.endpoint"
                type="text"
                class="input"
                placeholder="https://api.example.com/v1/chat/completions"
              />
              <span class="input-tip">支持 OpenAI 兼容格式的接口</span>
            </div>
            <div class="form-group">
              <label>API Key</label>
              <input v-model="currentPresetConfig.apiKey" type="text" class="input" placeholder="sk-..." />
            </div>
            <div class="form-group">
              <label>模型名称</label>
              <input v-model="currentPresetConfig.model" type="text" class="input" placeholder="gpt-3.5-turbo" />
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
          <textarea
            v-model="chineseInput"
            class="input textarea"
            placeholder="例如：用户名称,获取用户信息;输入完成后将自动翻译..."
            rows="1"
          ></textarea>
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
                      <button
                        @click="copyToClipboard(option.camelCase, getButtonId(index, mode.value, idx, 'camel'))"
                        class="copy-btn"
                        :class="{ copied: copiedButton === getButtonId(index, mode.value, idx, 'camel') }"
                      >
                        {{ copiedButton === getButtonId(index, mode.value, idx, 'camel') ? '✓' : '📋' }}
                      </button>
                    </div>
                    <div class="style-row">
                      <code class="code-text">{{ option.snake_case }}</code>
                      <button
                        @click="copyToClipboard(option.snake_case, getButtonId(index, mode.value, idx, 'snake'))"
                        class="copy-btn"
                        :class="{ copied: copiedButton === getButtonId(index, mode.value, idx, 'snake') }"
                      >
                        {{ copiedButton === getButtonId(index, mode.value, idx, 'snake') ? '✓' : '📋' }}
                      </button>
                    </div>
                    <div class="style-row">
                      <code class="code-text">{{ option.PascalCase }}</code>
                      <button
                        @click="copyToClipboard(option.PascalCase, getButtonId(index, mode.value, idx, 'pascal'))"
                        class="copy-btn"
                        :class="{ copied: copiedButton === getButtonId(index, mode.value, idx, 'pascal') }"
                      >
                        {{ copiedButton === getButtonId(index, mode.value, idx, 'pascal') ? '✓' : '📋' }}
                      </button>
                    </div>
                    <div v-if="option.phonetic" class="phonetic-row">
                      <span class="phonetic-label">🎧 谐音：</span>
                      <div class="pinyin-box">{{ option.phonetic }}</div>
                      <button @click="speakPhonetic(option.camelCase)" class="copy-btn" title="读出英文发音">🔊</button>
                      <button
                        @click="copyToClipboard(option.phonetic, getButtonId(index, mode.value, idx, 'phonetic'))"
                        class="copy-btn"
                        :class="{ copied: copiedButton === getButtonId(index, mode.value, idx, 'phonetic') }"
                      >
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
const configSaved = ref(false);
const copiedButton = ref(null); // 记录当前复制的按钮
const isFromUtools = ref(false); // 标记是否来自 uTools 的自动填充

// API 预设配置（每个预设包含 endpoint, apiKey, model）
const presets = ref({
  qwen: {
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKey: '',
    model: 'qwen-turbo'
  },
  deepseek: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '',
    model: 'deepseek-chat'
  },
  zhipu: {
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey: '',
    model: 'glm-4-flash'
  },
  kimi: {
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: '',
    model: 'moonshot-v1-8k'
  }
});

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

// 计算属性 - 获取当前选中预设的配置
const currentPresetConfig = computed(() => {
  if (!selectedPreset.value) {
    return { endpoint: '', apiKey: '', model: '' };
  }
  return presets.value[selectedPreset.value] || { endpoint: '', apiKey: '', model: '' };
});

const isApiConfigured = computed(() => {
  return currentPresetConfig.value.endpoint && currentPresetConfig.value.apiKey;
});

// 方法
function toggleApiConfig() {
  showApiConfig.value = !showApiConfig.value;
}

function toggleTheme() {
  emit('toggle-theme');
}

function applyPreset() {
  // 如果正在加载配置，不应用预设，避免覆盖已保存的配置
  if (isLoadingConfig) {
    console.log('applyPreset - 加载配置中，跳过');
    return;
  }
  console.log('applyPreset - 切换预设:', selectedPreset.value);
  // 如果切换到"自定义"，提示用户
  if (!selectedPreset.value) {
    error.value = '请选择一个预设，自定义功能暂不可用';
    setTimeout(() => {
      error.value = '';
    }, 2000);
    return;
  }
  // 预设切换后，配置会自动通过 currentPresetConfig 计算属性切换
  // 不需要重新加载配置
}

function saveApiConfig() {
  try {
    // 如果没有选中预设，提示用户先选择预设
    if (!selectedPreset.value) {
      error.value = '请先选择一个预设';
      setTimeout(() => {
        error.value = '';
      }, 2000);
      return;
    }

    console.log('saveApiConfig - 保存配置:', {
      preset: selectedPreset.value,
      config: presets.value[selectedPreset.value]
    });

    // 将 Vue 响应式对象转换为普通对象
    const plainPresets = JSON.parse(JSON.stringify(presets.value));

    // 保存所有预设的配置
    window.utools.db.put({
      _id: 'translator_api_config',
      data: plainPresets
    });
    // 同时保存当前选中的预设
    window.utools.db.put({
      _id: 'translator_selected_preset',
      data: selectedPreset.value
    });
    configSaved.value = true;
    setTimeout(() => {
      configSaved.value = false;
    }, 2000);
    console.log('saveApiConfig - 保存成功');
  } catch (e) {
    console.error('saveApiConfig - 保存失败:', e);
    error.value = '保存配置失败';
  }
}

let isLoadingConfig = false; // 标记是否正在加载配置，防止触发 applyPreset

function loadApiConfig() {
  // 防止重复调用
  if (isLoadingConfig) {
    console.log('loadApiConfig - 已在加载中，跳过');
    return;
  }

  try {
    isLoadingConfig = true; // 开始加载配置
    console.log('loadApiConfig - 开始加载配置');

    // 从 uTools 数据库读取所有预设配置
    const savedPresets = window.utools.db.get('translator_api_config');
    console.log('loadApiConfig - savedPresets:', savedPresets);

    if (savedPresets && savedPresets.data) {
      console.log('loadApiConfig - 已保存的配置:', savedPresets.data);
      // 直接替换整个 presets 对象
      Object.keys(savedPresets.data).forEach((key) => {
        if (presets.value[key]) {
          // 保留原有的结构，只更新值
          presets.value[key].endpoint = savedPresets.data[key].endpoint || presets.value[key].endpoint;
          presets.value[key].apiKey = savedPresets.data[key].apiKey || '';
          presets.value[key].model = savedPresets.data[key].model || presets.value[key].model;
        }
      });
      console.log('loadApiConfig - 加载后的 presets:', JSON.stringify(presets.value));
    }

    // 读取当前选中的预设
    const savedPreset = window.utools.db.get('translator_selected_preset');
    console.log('loadApiConfig - savedPreset:', savedPreset);

    if (savedPreset && savedPreset.data) {
      selectedPreset.value = savedPreset.data;
      console.log('loadApiConfig - 当前预设:', selectedPreset.value);
    } else if (!selectedPreset.value) {
      // 如果没有保存的预设且当前没有选中，默认选中第一个预设
      selectedPreset.value = 'qwen';
      console.log('loadApiConfig - 使用默认预设: qwen');
    }

    console.log('loadApiConfig - 最终配置:', {
      selectedPreset: selectedPreset.value,
      currentConfig: presets.value[selectedPreset.value]
    });

    // 使用 setTimeout 延迟重置标记，确保 DOM 更新和事件处理都已完成
    setTimeout(() => {
      isLoadingConfig = false;
      console.log('loadApiConfig - 加载完成');
    }, 100);
  } catch (e) {
    console.error('loadApiConfig - 加载失败:', e);
    isLoadingConfig = false;
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
    const response = await fetch(currentPresetConfig.value.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentPresetConfig.value.apiKey}`
      },
      body: JSON.stringify({
        model: currentPresetConfig.value.model,
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
  // 延迟加载配置，避免与 watch enterAction 冲突
  setTimeout(() => {
    loadApiConfig();
  }, 50);
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

<style scoped>
@import './index.css';
</style>
