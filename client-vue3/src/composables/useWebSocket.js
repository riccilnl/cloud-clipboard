import { ref, watch, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

export function useWebSocket() {
  const router = useRouter()
  const { t } = useI18n()
  const instance = getCurrentInstance()
  const $http = instance.proxy.$http
  
  // 安全的 localStorage 访问
  const safeGetItem = (key, defaultValue = null) => {
    try {
      return localStorage.getItem(key) || defaultValue
    } catch (error) {
      console.warn('localStorage access denied:', error)
      return defaultValue
    }
  }
  
  const safeSetItem = (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.warn('localStorage access denied:', error)
    }
  }
  
  const websocket = ref(null)
  const websocketConnecting = ref(false)
  const authCode = ref(safeGetItem('auth', ''))
  const authCodeDialog = ref(false)
  const room = ref(router.currentRoute.value.query.room || '')
  const roomInput = ref('')
  const roomDialog = ref(false)
  const retry = ref(0)
  const date = ref(new Date())
  
  const config = ref({
    version: '',
    text: { limit: 0 },
    file: { expire: 0, chunk: 0, limit: 0 },
    server: { roomList: false }
  })
  
  const send = ref({ text: '', files: [] })
  const received = ref([])
  const device = ref([])
  
  const showTimestamp = ref(safeGetItem('showTimestamp') !== null 
    ? safeGetItem('showTimestamp') === 'true' 
    : true)
  const showDeviceInfo = ref(safeGetItem('showDeviceInfo') !== null 
    ? safeGetItem('showDeviceInfo') === 'true' 
    : false)
  const showSenderIP = ref(safeGetItem('showSenderIP') !== null 
    ? safeGetItem('showSenderIP') === 'true' 
    : false)
  
  const event = {
    receive: (data) => {
      received.value.unshift(data)
    },
    receiveMulti: (data) => {
      received.value.unshift(...Array.from(data).reverse())
    },
    revoke: (data) => {
      const index = received.value.findIndex(e => e.id === data.id)
      if (index !== -1) {
        received.value.splice(index, 1)
      }
    },
    config: (data) => {
      config.value = data
      console.log(
        `%c Cloud Clipboard ${data.version} by Jonnyan404 %c https://github.com/Jonnyan404/cloud-clipboard-go `,
        'color:#fff;background-color:#1e88e5',
        'color:#fff;background-color:#64b5f6'
      )
    },
    connect: (data) => {
      device.value.push(data)
    },
    disconnect: (data) => {
      const index = device.value.findIndex(e => e.id === data.id)
      if (index !== -1) {
        device.value.splice(index, 1)
      }
    },
    update: (data) => {
      const index = received.value.findIndex(e => e.id === data.id)
      if (index !== -1) {
        received.value.splice(index, 1, { ...received.value[index], ...data })
      }
    },
    forbidden: () => {
      authCode.value = ''
      localStorage.removeItem('auth')
    },
  }
  
  const connect = () => {
    websocketConnecting.value = true
    // Toast will be handled by component
    $http.get('server').then(response => {
      if (authCode.value) localStorage.setItem('auth', authCode.value)
      return new Promise((resolve, reject) => {
        const wsUrl = new URL(response.data.server)
        wsUrl.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl.port = location.port
        if (response.data.auth) {
          if (authCode.value) {
            wsUrl.searchParams.set('auth', authCode.value)
          } else {
            authCodeDialog.value = true
            return
          }
        }
        wsUrl.searchParams.set('room', room.value)
        const ws = new WebSocket(wsUrl)
        ws.onopen = () => resolve(ws)
        ws.onerror = reject
      })
    }).then((ws) => {
      websocket.value = ws
      websocketConnecting.value = false
      retry.value = 0
      received.value = []
      setInterval(() => { ws.send('') }, 30000)
      ws.onclose = () => {
        websocket.value = null
        websocketConnecting.value = false
        device.value.splice(0)
        if (retry.value < 3) {
          retry.value++
          setTimeout(() => connect(), 3000)
        } else if (authCode.value) {
          authCodeDialog.value = true
        }
      }
      ws.onmessage = e => {
        try {
          const parsed = JSON.parse(e.data)
          console.log('收到 WebSocket 消息:', parsed)
          const handler = event[parsed.event]
          if (handler) {
            console.log('调用事件处理器:', parsed.event, parsed.data)
            handler(parsed.data)
          } else {
            console.warn('未找到事件处理器:', parsed.event)
          }
        } catch (error) {
          console.error('解析 WebSocket 消息失败:', error, e.data)
        }
      }
    }).catch(error => {
      websocketConnecting.value = false
      failure()
    })
  }
  
  const disconnect = () => {
    websocketConnecting.value = false
    if (websocket.value) {
      websocket.value.onclose = () => {}
      websocket.value.close()
      websocket.value = null
    }
    device.value = []
  }
  
  const failure = () => {
    localStorage.removeItem('auth')
    websocket.value = null
    device.value = []
    if (retry.value++ < 3) {
      connect()
    }
  }
  
  watch(room, () => {
    disconnect()
    connect()
  })
  
  watch(showTimestamp, (newVal) => {
    localStorage.setItem('showTimestamp', newVal)
  })
  
  watch(showDeviceInfo, (newVal) => {
    localStorage.setItem('showDeviceInfo', newVal)
  })
  
  watch(showSenderIP, (newVal) => {
    localStorage.setItem('showSenderIP', newVal)
  })
  
  return {
    websocket,
    websocketConnecting,
    authCode,
    authCodeDialog,
    room,
    roomInput,
    roomDialog,
    retry,
    date,
    config,
    send,
    received,
    device,
    showTimestamp,
    showDeviceInfo,
    showSenderIP,
    connect,
    disconnect,
  }
}
