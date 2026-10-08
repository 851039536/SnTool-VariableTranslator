<script setup>
import { onMounted, ref } from 'vue';
import VariableTranslator from './VariableTranslator/index.vue';

const route = ref('');
const enterAction = ref({});
const isDarkTheme = ref(false);

function initTheme() {
  // 清理已废弃的生态偏好（该功能已移除，避免残留垃圾键）
  localStorage.removeItem('translator_context');
  // 从本地存储读取主题设置
  const savedTheme = localStorage.getItem('translator_theme');
  if (savedTheme) {
    isDarkTheme.value = savedTheme === 'dark';
  } else {
    // 默认跟随系统偏好
    isDarkTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  applyTheme();
}

function applyTheme() {
  const htmlElement = document.documentElement;
  if (isDarkTheme.value) {
    htmlElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('translator_theme', 'dark');
  } else {
    htmlElement.setAttribute('data-theme', 'light');
    localStorage.setItem('translator_theme', 'light');
  }
}

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value;
  applyTheme();
}

onMounted(() => {
  initTheme();
  window.utools.onPluginEnter((action) => {
    route.value = action.code;
    enterAction.value = action;
  });
  window.utools.onPluginOut((isKill) => {
    route.value = '';
  });
});
</script>

<template>

  <template v-if="route === 'translator'">
    <VariableTranslator :enterAction="enterAction" :isDarkTheme="isDarkTheme" @toggle-theme="toggleTheme">
    </VariableTranslator>
  </template>


</template>
