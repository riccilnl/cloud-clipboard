import { createApp, reactive } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import i18n from './plugins/i18n'
import axios from 'axios'
import { prettyFileSize, percentage, formatTimestamp } from './utils/filters'

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
    authCode: localStorage.getItem('auth') || '',
    authCodeDialog: false,
    room: 'default',
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
