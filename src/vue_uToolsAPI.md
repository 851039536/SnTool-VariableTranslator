---
trigger: always_on
alwaysApply: true
---


# Vue + uTools API 插件开发规范

## 项目结构
project/
├── public/
│   ├── logo.png          # 插件图标
│   └── preload.js        # uTools预加载脚本
├── src/
│   ├── components/       # Vue组件
│   ├── views/           # 页面视图
│   ├── App.vue          # 根组件
│   └── main.js          # 入口文件
├── plugin.json          # uTools插件配置
└── vue.config.js        # Vue配置文件

## plugin.json 配置

{
  "name": "插件名称",
  "version": "1.0.0",
  "description": "插件描述",
  "main": "index.html",
  "logo": "logo.png",
  "platform": ["win32", "darwin", "linux"],
  "features": [
    {
      "code": "feature_code",
      "explain": "功能说明",
      "cmds": ["关键词1", "关键词2"]
    }
  ]
}

## preload.js 预加载脚本

window.utools = window.utools || {}

window.exports = {
  "feature_code": {
    mode: "none",
    args: {
      enter: (action, callbackSetList) => {
        // 进入插件时的回调
        window.utools.hideMainWindow()
        // 传递数据到Vue
        window.utools.payload = action.payload
      }
    }
  }
}

// 数据库操作
window.utoolsDb = {
  put: (doc) => window.utools.db.put(doc),
  get: (id) => window.utools.db.get(id),
  remove: (id) => window.utools.db.remove(id),
  allDocs: () => window.utools.db.allDocs()
}

## Vue 组件中使用 uTools API

### 1. 基础API使用

export default {
  mounted() {
    // 获取进入参数
    const payload = window.utools.payload
    
    // 隐藏主窗口
    window.utools.hideMainWindow()
    
    // 显示主窗口
    window.utools.showMainWindow()
    
    // 退出插件
    window.utools.outPlugin()
    
    // 设置子输入框
    window.utools.setSubInput(({ text }) => {
      console.log('用户输入:', text)
    }, '请输入...')
    
    // 移除子输入框
    window.utools.removeSubInput()
  }
}

### 2. 数据库操作

export default {
  data() {
    return {
      items: []
    }
  },
  methods: {
    // 保存数据
    saveData(data) {
      const doc = {
        _id: Date.now().toString(),
        data: data
      }
      window.utools.db.put(doc)
    },
    
    // 获取数据
    getData(id) {
      return window.utools.db.get(id)
    },
    
    // 获取所有数据
    getAllData() {
      const result = window.utools.db.allDocs()
      this.items = result.map(item => item.data)
    },
    
    // 删除数据
    removeData(id) {
      window.utools.db.remove(id)
    }
  }
}

### 3. 剪贴板操作

export default {
  methods: {
    // 读取剪贴板文本
    readClipboard() {
      const text = window.utools.copyText()
      return text
    },
    
    // 读取剪贴板图片
    readClipboardImage() {
      const img = window.utools.copyImage()
      return img
    },
    
    // 写入剪贴板
    writeClipboard(text) {
      window.utools.copyText(text)
      window.utools.showNotification('已复制到剪贴板')
    }
  }
}

### 4. 文件操作

export default {
  methods: {
    // 显示文件选择器
    async selectFile() {
      const files = await window.utools.showOpenDialog({
        title: '选择文件',
        defaultPath: window.utools.getPath('desktop'),
        buttonLabel: '选择',
        filters: [
          { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
        ],
        properties: ['openFile', 'multiSelections']
      })
      return files
    },
    
    // 显示保存对话框
    async saveFile() {
      const path = await window.utools.showSaveDialog({
        title: '保存文件',
        defaultPath: window.utools.getPath('desktop'),
        buttonLabel: '保存'
      })
      return path
    },
    
    // 读取文件
    readFile(path) {
      const fs = window.require('fs')
      return fs.readFileSync(path, 'utf-8')
    },
    
    // 写入文件
    writeFile(path, content) {
      const fs = window.require('fs')
      fs.writeFileSync(path, content, 'utf-8')
    }
  }
}

### 5. 系统通知

export default {
  methods: {
    showNotification(message) {
      window.utools.showNotification(message)
    },
    
    showNotificationWithClick(message, callback) {
      window.utools.showNotification(message, callback)
    }
  }
}

## vue.config.js 配置

module.exports = {
  publicPath: './',
  outputDir: 'dist',
  productionSourceMap: false,
  
  configureWebpack: {
    // 外部化 electron 模块
    externals: {
      electron: 'require("electron")'
    }
  },
  
  // 开发服务器配置
  devServer: {
    port: 8080,
    open: false
  }
}

## 打包发布

1. 构建项目
npm run build

2. 将以下文件放入插件目录:
   - dist/ 文件夹内容
   - plugin.json
   - public/logo.png
   - public/preload.js

3. 使用 uTools 开发者工具打包

## 最佳实践

1. **性能优化**
   - 避免在主线程执行耗时操作
   - 使用虚拟滚动处理大量数据
   - 合理使用 Vue 的计算属性和监听器

2. **用户体验**
   - 提供加载状态反馈
   - 合理使用通知提示
   - 支持键盘快捷键操作

3. **数据管理**
   - 使用 uTools 数据库存储持久化数据
   - 定期清理无用数据
   - 做好数据备份

4. **错误处理**
   - 使用 try-catch 捕获异常
   - 提供友好的错误提示
   - 记录错误日志便于调试

5. **安全性**
   - 验证用户输入
   - 避免执行不可信的代码
   - 敏感数据加密存储
