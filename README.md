中文变量名翻译助手

一个功能强大的 uTools 插件，将中文转换为符合编程规范的英文变量名。支持多种命名规范（鼠峰、蛇形、帕斯卡），四种编程场景（变量、方法、常量、类名），并提供英文发音谐音辅助记忆。

功能特性

▪ 多类型命名转换：支持变量命名、方法命名、常量命名、类名命名四种编程场景
▪ 多种命名风格：每种类型都生成 camelCase、snake_case、PascalCase 三种命名风格
▪ 发音谐音辅助：提供英文发音的中文谐音（带拼音），帮助记忆和学习
▪ Web Speech API：支持直接点击播放英文发音
▪ 多 API 支持：预置 OpenAI、通义千问、DeepSeek、智谱 GLM、Moonshot Kimi 等 API 配置
▪ 亮暗主题切换：根据系统偏好自动适配或手动切换主题
▪ 快捷键支持：Ctrl+Enter 立即翻译，Ctrl+K 快速清空
▪ 剪贴板集成：一键复制任意命名方案到剪贴板
▪ 自动翻译：输入后自动延迟翻译，或手动触发
▪ 数据持久化：使用 uTools 数据库存储 API 配置，下次启动自动加载

安装方式

1. 从 uTools 应用商店搜索 "变量翻译" 或 "中文翻译" 安装

2. 或手动安装：
   将 dist 文件夹、plugin.json、logo.png 和 public/preload/services.js 文件
   复制到 uTools 插件目录（通常为 ~/.config/uTools/plugins 或类似路径）

快速开始

1. 打开 uTools（按 Alt+Space 或配置的快捷键）
2. 搜索 "变量翻译" 或直接输入中文
3. 系统会自动显示翻译结果
4. 点击 📋 按钮复制任意命名方案
5. 或点击 🔊 按钮听英文发音

详细使用指南

▸ 初始化 API 配置

第一次使用需要配置 AI 接口：

1. 点击右上角 ⚙️ 图标打开 API 配置面板
2. 选择预设方案（OpenAI、通义千问 等）
3. 输入对应的 API 端点（endpoint）和 API Key
4. 选择模型名称（如 gpt-3.5-turbo、qwen-turbo 等）
5. 点击 "保存配置" 按钮
6. 配置会自动保存到本地，下次启动自动加载

预设 API 配置：

    ▪ 通义千问
      端点：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
      模型：qwen-turbo 或 qwen-plus 等

    ▪ DeepSeek
      端点：https://api.deepseek.com/v1/chat/completions
      模型：deepseek-chat

    ▪ 智谱 GLM
      端点：https://open.bigmodel.cn/api/paas/v4/chat/completions
      模型：glm-4-flash

    ▪ Moonshot Kimi
      端点：https://api.moonshot.cn/v1/chat/completions
      模型：moonshot-v1-8k

▸ 输入中文进行翻译

在输入框中输入中文（支持多行，以分号或换行分隔）：

    例如：
    用户名称
    获取用户信息;输入完成后将自动翻译...
    系统设置, 配置文件

输入后会自动延迟 1.5 秒翻译。如需立即翻译，按 Ctrl+Enter。

▸ 查看翻译结果

翻译结果会展示四种命名类型：

    变量命名（Variable）
      使用场景：普通变量、属性名
      特点：名词或名词短语
      示例：camelCase、snake_case、PascalCase

    方法命名（Method）
      使用场景：函数名、方法名
      特点：通常以动词开头
      示例：getCamelCase、get_snake_case、GetPascalCase

    常量命名（Constant）
      使用场景：全局常量、枚举值
      特点：全大写，以下划线分隔
      示例：CAMEL_CASE、SNAKE_CASE、CONSTANT

    类名命名（Class）
      使用场景：类名、组件名
      特点：首字母大写的 PascalCase
      示例：PascalClass、pascal_class、PascalClass

▸ 选择和复制命名

每个命名方案展示三种风格：

    ▪ camelCase（鼠峰）：首字母小写，如 userName、getUserName
    ▪ snake_case（蛇形）：全小写，下划线分隔，如 user_name、get_user_name
    ▪ PascalCase（帕斯卡）：首字母大写，如 UserName、GetUserName

点击 📋 按钮复制对应的命名方案到剪贴板，按钮会变为 ✓ 表示复制成功。

▸ 发音谐音和读音

如果翻译结果包含 "🎧 谐音" 部分：

    ▪ 点击 📋 复制谐音（如 "康萨欧(kāng sà ōu)"）到剪贴板
    ▪ 点击 🔊 播放英文发音（需要浏览器支持 Web Speech API）

谐音采用国际音标和拼音结合，便于学习和记忆。

▸ 键盘快捷键

在输入框中使用以下快捷键：

    Ctrl+Enter（或 Cmd+Enter）：立即翻译（无需等待自动延迟）
    Ctrl+K（或 Cmd+K）：清空输入框和结果
    Esc：关闭 API 配置面板

▸ 主题切换

点击右上角 ☀️/🌙 按钮切换亮色/暗色主题：

    ☀️：当前为暗色主题，点击切换到亮色
    🌙：当前为亮色主题，点击切换到暗色

主题设置会自动保存，下次启动保持上次选择。

▸ uTools 集成用法

作为 uTools 插件，有多种使用方式：

    1. 搜索框输入方式（推荐）：
       打开 uTools，输入中文名词，插件会自动识别并展示翻译结果

    2. 命令触发方式：
       输入以下任一关键词：
       ▪ 变量翻译
       ▪ 翻译
       ▪ 中文翻译
       ▪ 命名助手
       ▪ translator

    3. 剪贴板悬停（over）模式：
       将中文复制到剪贴板后，使用 over 命令或在搜索框中悬停，
       插件会自动翻译剪贴板内容

高级配置

▸ 自定义 API 配置

如果使用非预设的 AI 服务，或需要使用本地部署的模型：

    1. 点击 ⚙️ 打开配置面板
    2. 在 "选择预设" 下拉框中保持为 "自定义"
    3. 手动输入以下信息：
       ▪ API 端点：必须兼容 OpenAI 的 /v1/chat/completions 格式
       ▪ API Key：对应 API 服务的认证密钥
       ▪ 模型名称：具体模型名（如 gpt-3.5-turbo）
    4. 点击 "保存配置"

支持的 API 兼容格式：
▪ OpenAI 兼容的任何服务（LM Studio、Ollama、Vllm 等本地部署方案）
▪ Azure OpenAI
▪ 其他 OpenAI 兼容的代理和网关

▸ 配置文件位置

API 配置存储在 uTools 本地数据库中，位置为：

Windows：
C:\Users\{YourUsername}\AppData\Roaming\uTools\data\db

macOS：
~/Library/Application Support/uTools/data/db

Linux：
~/.config/uTools/data/db

常见问题（FAQ）

问：如何获取 API Key？
答：
▪ OpenAI：访问 https://platform.openai.com/account/api-keys
▪ 通义千问：访问 https://dashscope.console.aliyun.com/ 获取
▪ DeepSeek：访问 https://platform.deepseek.com 获取
▪ 智谱 GLM：访问 https://open.bigmodel.cn 获取
▪ Kimi：访问 https://console.moonshot.cn 获取

问："⚠️ 请先配置 API" 是什么意思？
答：您还没有配置 AI 接口信息。请点击 ⚙️ 按钮，按照指引配置 API 端点和密钥。

问：翻译很慢或总是失败？
答：

1. 检查网络连接是否正常
2. 确认 API Key 和端点配置是否正确
3. 检查 API 余额是否充足（对于付费服务）
4. 查看浏览器控制台（F12）是否有错误信息
5. 尝试更换 API 服务商

问：为什么看不到 "🎧 谐音" 部分？
答：当 AI 模型返回的结果中没有包含谐音信息时，该部分不会显示。这取决于 AI 模型的输出质量。

问：Web Speech API 读音不准确？
答：Web Speech API 的发音取决于操作系统和浏览器的语音合成引擎质量。某些浏览器可能不支持此功能。

问：如何导出或备份配置？
答：配置自动保存在 uTools 数据库中。如需备份，请复贝上述配置文件位置的数据库文件。

问：支持离线使用吗？
答：需要网络连接来调用 AI 接口。本地 AI 部署方案（如 LM Studio、Ollama）也需要搭建本地服务。

开发相关

▸ 本地开发

克隆项目并安装依赖：

    npm install

启动开发服务器（自动热更新）：

    npm run dev

构建生产版本：

    npm run build

▸ 项目结构

SnTool-VariableTranslator/
├── public/
│ ├── preload/
│ │ ├── package.json # 预加载脚本依赖
│ │ └── services.js # uTools API 服务
│ └── plugin.json # 插件配置文件
├── src/
│ ├── VariableTranslator/
│ │ └── index.vue # 主组件
│ ├── App.vue # 根组件
│ ├── main.css # 样式文件
│ └── main.js # 入口文件
├── index.html # HTML 模板
├── vite.config.js # Vite 配置
└── package.json # 项目依赖

▸ 技术栈

▪ Vue 3：前端框架
▪ Vite：构建工具
▪ uTools API：插件能力
▪ Web Speech API：发音功能
▪ Crypto-JS：加密功能
▪ Highlight.js：代码高亮
▪ UnoCSS：原子化 CSS

▸ 贡献指南

欢迎提交 Issue 和 Pull Request！

如发现 bug 或有功能建议，请提交 GitHub Issue。

许可证

MIT License

反馈和支持

如有任何问题或建议，欢迎通过以下方式反馈：

▪ GitHub Issues
▪ uTools 插件评论区
▪ Email：通过 uTools 联系方式

祝您使用愉快！🎉
