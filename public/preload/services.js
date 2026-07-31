// uTools 插件功能配置
// 说明：翻译输入通过 App.vue 的 window.utools.onPluginEnter() 获取，
// 此处仅需保留功能入口的空实现（uTools 要求 handler 存在）
window.exports = {
  'translator': {
    mode: 'none',
    args: {
      enter: () => { }
    }
  }
}
