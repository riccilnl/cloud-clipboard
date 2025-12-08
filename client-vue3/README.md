# Cloud Clipboard - Vue 3 版本

这是云剪贴板项目的 Vue 3 重构版本，保持了原有的所有功能和布局。

## 主要变化

### 技术栈升级
- **Vue 2 → Vue 3**: 使用 Composition API 和 `<script setup>` 语法
- **Vue CLI → Vite**: 更快的开发服务器和构建速度
- **Vuetify 2 → Vuetify 3**: 最新的 Material Design 组件库
- **Vue I18n 8 → Vue I18n 9**: 支持 Vue 3 的国际化
- **Vue Router 3 → Vue Router 4**: Vue 3 兼容的路由

### 项目结构
```
client-vue3/
├── public/              # 静态资源
├── src/
│   ├── components/      # 组件
│   │   ├── SendText.vue
│   │   ├── SendFile.vue
│   │   └── received-item/
│   │       ├── Text.vue
│   │       └── File.vue
│   ├── locales/         # 国际化文件
│   ├── plugins/         # 插件配置
│   │   ├── vuetify.js
│   │   └── i18n.js
│   ├── router/          # 路由配置
│   ├── utils/           # 工具函数
│   ├── views/           # 页面组件
│   │   ├── Home.vue
│   │   ├── Device.vue
│   │   └── About.vue
│   ├── App.vue          # 根组件
│   └── main.js          # 入口文件
├── index.html
├── package.json
└── vite.config.js
```

## 开发

### 安装依赖
```bash
cd client-vue3
npm install
```

### 启动开发服务器
```bash
npm run dev
```

开发服务器将在 http://localhost:8080 启动

### 构建生产版本
```bash
npm run build
```

构建后的文件将输出到 `../cloud-clip/lib/static` 目录，可以直接被 Go 后端使用。

## 功能特性

### 已实现的功能
- ✅ 文本发送和接收
- ✅ 文件发送和接收
- ✅ WebSocket 实时通信
- ✅ 多房间支持
- ✅ 设备列表
- ✅ 深色模式切换
- ✅ 多语言支持（中文简体、繁体、英文、日文）
- ✅ 主题颜色自定义
- ✅ 显示设置（时间戳、设备信息、发送者IP）
- ✅ 身份验证
- ✅ 响应式布局

### 全局状态管理
使用 Vue 3 的 `provide/inject` API 管理全局状态，包括：
- WebSocket 连接状态
- 接收的消息列表
- 设备列表
- 配置信息
- 用户设置

## 与 Vue 2 版本的对比

### 代码风格
- **Vue 2**: Options API (`data`, `methods`, `computed`, `watch`)
- **Vue 3**: Composition API (`ref`, `reactive`, `computed`, `watch`)

### 组件定义
```vue
<!-- Vue 2 -->
<script>
export default {
  data() {
    return { count: 0 }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>

<!-- Vue 3 -->
<script setup>
import { ref } from 'vue'
const count = ref(0)
const increment = () => {
  count.value++
}
</script>
```

### 性能提升
- 更小的打包体积
- 更快的渲染速度
- 更好的 TypeScript 支持
- Tree-shaking 优化

## 注意事项

1. **Vuetify 3 API 变化**: 一些组件的 props 和事件名称有所变化
2. **全局属性访问**: 使用 `getCurrentInstance()` 访问 `$http` 等全局属性
3. **路由**: 使用 `useRouter()` 和 `useRoute()` 替代 `this.$router` 和 `this.$route`
4. **国际化**: 使用 `useI18n()` 的 `t()` 函数替代 `this.$t()`

## 后续优化建议

1. 添加 TypeScript 支持
2. 使用 Pinia 替代 provide/inject 进行状态管理
3. 添加单元测试和 E2E 测试
4. 优化 WebSocket 重连逻辑
5. 添加更多的错误处理和用户反馈
6. 实现文件上传进度显示
7. 添加拖拽排序功能
8. 支持消息搜索和过滤

## 许可证

与原项目保持一致
