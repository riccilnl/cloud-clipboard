import { ref, watch, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

export function useWebSocket() {
  const router = useRouter()
  const { t } = useI18n()
  const instance = getCurrentInstance()
  const $http = instance.proxy.$http
  
  const websocket = ref(null)
  const websocketConnecting = ref(false)
  const authCode = ref(localStorage.getItem('auth') || '')
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
  
  const showTimestamp = ref(localStorage.getItem('showTimestamp') !== null 
    ? localStorage.getItem('showTimestamp') === 'true' 
    : true)
  const showDeviceInfo = ref(localStorage.getItem('showDeviceInfo') !== null 
    ? localStorage.getItem('showDeviceInfo') === 'true' 
    : false)
  const showSenderIP = ref(localStorage.getItem('showSenderIP') !== null 
    ? localStorage.getItem('showSenderIP') === 'true' 
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
          (event[parsed.event] || (() => {}))(parsed.data)
        } catch {}
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
