import { createApp, reactive } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import i18n from './plugins/i18n'
import axios from 'axios'
import { prettyFileSize, percentage, formatTimestamp } from './utils/filters'
import { createPWAAdapter, initPWAManager } from './utils/pwa-adapter'

const app = createApp(App)

// 创建全局响应式状态
const globalState = reactive({
    date: new Date(),
    dark: localStorage.getItem('darkmode') || 'prefer',
    config: {
        version: '',
        text: { limit: 0 },
        file: { expire: 0, chunk: 0, limit: 0 },
        server: { roomList: false }
    },
    send: { text: '', files: [] },
    received: [],
    device: [],
    showTimestamp: localStorage.getItem('showTimestamp') !== null 
        ? localStorage.getItem('showTimestamp') === 'true' 
        : true,
    showDeviceInfo: localStorage.getItem('showDeviceInfo') !== null 
        ? localStorage.getItem('showDeviceInfo') === 'true' 
        : false,
    showSenderIP: localStorage.getItem('showSenderIP') !== null 
        ? localStorage.getItem('showSenderIP') === 'true' 
        : false,
    websocket: null,
    websocketConnecting: false,
    connected: false, // PWA: 连接状态
    authCode: localStorage.getItem('auth') || '',
    authCodeDialog: false,
    room: '',
    roomInput: '',
    roomDialog: false,
    retry: 0
})

// 全局属性
app.config.globalProperties.$http = axios
app.config.globalProperties.$filters = {
    prettyFileSize,
    percentage,
    formatTimestamp
}

// 提供全局状态
app.provide('globalState', globalState)

// axios 拦截器
axios.interceptors.request.use(config => {
    if (globalState.authCode) {
        config.headers.Authorization = `Bearer ${globalState.authCode}`
    }
    return config
})

// 使用插件
app.use(router)
app.use(vuetify)
app.use(i18n)

// 挂载应用
app.mount('#app')

// PWA 集成：在应用挂载后初始化 PWA 管理器
if (typeof window !== 'undefined') {
    // 等待 Vue 实例完全挂载
    setTimeout(() => {
        console.log('[PWA] 开始初始化 PWA 管理器...')
        
        // 创建 $root 对象供 PWA 管理器使用
        window.$root = {
            websocket: globalState.websocket,
            websocketConnecting: globalState.websocketConnecting,
            connected: globalState.connected,
            retry: globalState.retry,
            connect: () => {
                // connect 函数将在这里被设置
                console.log('[PWA] $root.connect 被调用')
            }
        }
        
        // 初始化 PWA 适配器
        createPWAAdapter(window.$root, globalState, null)
        
        // 初始化 PWA 管理器
        initPWAManager()
        
        console.log('[PWA] PWA 管理器初始化完成')
    }, 2000) // 延迟 2 秒确保 Vue 完全挂载
}