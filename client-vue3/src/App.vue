<template>
    <v-app>
        <v-app-bar color="primary" elevation="0" app>
            <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
            <v-app-bar-title @click="goHome" style="cursor: pointer;">
                {{ t('cloudClipboard') }}<span class="d-none d-sm-inline" v-if="globalState.room">（{{ t('room') }}：<abbr :title="t('copyRoomName')" style="cursor:pointer" @click.stop="copyRoomName(globalState.room)">{{globalState.room}}</abbr>）</span>
            </v-app-bar-title>
            <v-spacer></v-spacer>
            
            <!-- 房间列表按钮 -->
            <v-tooltip location="bottom" v-if="globalState.config && globalState.config.server && globalState.config.server.roomList">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="roomSheet = true; fetchRoomList();">
                        <v-badge :content="availableRooms.length" :model-value="availableRooms.length > 0" color="error">
                            <v-icon>mdi-view-grid</v-icon>
                        </v-badge>
                    </v-btn>
                </template>
                <span>{{ t('roomList') }} ({{ availableRooms.length }})</span>
            </v-tooltip>
            
            <v-tooltip location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="clearAllDialog = true">
                        <v-icon>mdi-notification-clear-all</v-icon>
                    </v-btn>
                </template>
                <span>{{ t('clearClipboard') }}</span>
            </v-tooltip>
            
            <v-tooltip location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="globalState.roomInput = globalState.room; globalState.roomDialog = true">
                        <v-icon>mdi-bulletin-board</v-icon>
                    </v-btn>
                </template>
                <span>{{ t('enterRoom') }}</span>
            </v-tooltip>
            
            <v-tooltip location="bottom">
                <template v-slot:activator="{ props }">
                    <v-btn icon v-bind="props" @click="if (!globalState.websocket && !globalState.websocketConnecting) {globalState.retry = 0; connect();}">
                        <v-icon v-if="globalState.websocket">mdi-lan-connect</v-icon>
                        <v-icon v-else-if="globalState.websocketConnecting">mdi-lan-pending</v-icon>
                        <v-icon v-else>mdi-lan-disconnect</v-icon>
                    </v-btn>
                </template>
                <span>{{ connectionStatusText }}</span>
            </v-tooltip>
        </v-app-bar>

        <v-navigation-drawer v-model="drawer" temporary color="primary">
                <v-list density="compact">
                    <v-list-item :href="`#/?room=${globalState.room}`">
                        <template v-slot:prepend>
                            <v-icon>mdi-content-paste</v-icon>
                        </template>
                        <v-list-item-title>{{ t('clipboard') }}</v-list-item-title>
                    </v-list-item>
                    
                    <v-list-item href="#/device">
                        <template v-slot:prepend>
                            <v-icon>mdi-devices</v-icon>
                        </template>
                        <v-list-item-title>{{ t('deviceList') }}</v-list-item-title>
                    </v-list-item>
                    
                    <v-menu location="end" :close-on-content-click="false">
                        <template v-slot:activator="{ props }">
                            <v-list-item v-bind="props">
                                <template v-slot:prepend>
                                    <v-icon>mdi-brightness-4</v-icon>
                                </template>
                                <v-list-item-title>{{ t('darkMode') }}</v-list-item-title>
                            </v-list-item>
                        </template>
                        <v-list>
                            <v-list-item @click="globalState.dark = 'time'">
                                <v-list-item-title>{{ t('switchByTime') }}</v-list-item-title>
                                <v-list-item-subtitle>{{ t('switchByTimeDesc') }}</v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item @click="globalState.dark = 'prefer'">
                                <v-list-item-title>{{ t('switchBySystem') }}</v-list-item-title>
                                <v-list-item-subtitle><code>prefers-color-scheme</code> {{ t('switchBySystemDesc') }}</v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item @click="globalState.dark = 'enable'">
                                <v-list-item-title>{{ t('keepEnabled') }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="globalState.dark = 'disable'">
                                <v-list-item-title>{{ t('keepDisabled') }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <v-list-item @click="colorDialog = true; drawer=false;">
                        <template v-slot:prepend>
                            <v-icon>mdi-palette</v-icon>
                        </template>
                        <v-list-item-title>{{ t('changeThemeColor') }}</v-list-item-title>
                    </v-list-item>

                    <v-divider></v-divider>
                    <v-list-subheader>{{ t('displaySettings') }}</v-list-subheader>

                    <v-list-item>
                        <template v-slot:prepend>
                            <v-icon>mdi-clock-outline</v-icon>
                        </template>
                        <v-list-item-title @click="globalState.showTimestamp = !globalState.showTimestamp" style="cursor: pointer;">
                            {{ t('showTimestamp') }}
                        </v-list-item-title>
                        <template v-slot:append>
                            <v-switch v-model="globalState.showTimestamp" color="white" hide-details></v-switch>
                        </template>
                    </v-list-item>

                    <v-list-item>
                        <template v-slot:prepend>
                            <v-icon>mdi-devices</v-icon>
                        </template>
                        <v-list-item-title @click="globalState.showDeviceInfo = !globalState.showDeviceInfo" style="cursor: pointer;">
                            {{ t('showDeviceInfo') }}
                        </v-list-item-title>
                        <template v-slot:append>
                            <v-switch v-model="globalState.showDeviceInfo" color="white" hide-details></v-switch>
                        </template>
                    </v-list-item>

                    <v-list-item>
                        <template v-slot:prepend>
                            <v-icon>mdi-ip-network-outline</v-icon>
                        </template>
                        <v-list-item-title @click="globalState.showSenderIP = !globalState.showSenderIP" style="cursor: pointer;">
                            {{ t('showSenderIP') }}
                        </v-list-item-title>
                        <template v-slot:append>
                            <v-switch v-model="globalState.showSenderIP" color="white" hide-details></v-switch>
                        </template>
                    </v-list-item>

                </v-list>
            </v-navigation-drawer>

        <v-main>
            <router-view v-slot="{ Component }">
                <keep-alive v-if="route.meta.keepAlive">
                    <component :is="Component" />
                </keep-alive>
                <component v-else :is="Component" />
            </router-view>
        </v-main>

        <v-dialog v-model="colorDialog" max-width="340">
            <v-card>
                <v-card-title>{{ t('selectThemeColor') }}</v-card-title>
                <v-card-text style="overflow: hidden; padding: 16px;">
                    <v-color-picker v-model="primaryColor" show-swatches hide-inputs></v-color-picker>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" variant="elevated" @click="colorDialog = false">{{ t('ok') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="globalState.authCodeDialog" persistent max-width="360">
            <v-card>
                <v-card-title>{{ t('authRequired') }}</v-card-title>
                <v-card-text>
                    <p>{{ t('authPrompt') }}</p>
                    <v-text-field 
                        v-model="globalState.authCode" 
                        :label="t('password')"
                        @keyup.enter="globalState.authCodeDialog = false; connect();"
                        autofocus
                    ></v-text-field>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" @click="globalState.authCodeDialog = false; connect();">{{ t('submit') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="globalState.roomDialog" persistent max-width="360">
            <v-card>
                <v-card-title>{{ t('clipboardRoom') }}</v-card-title>
                <v-card-text>
                    <p>{{ t('roomPrompt1') }}</p>
                    <p>{{ t('roomPrompt2') }}</p>
                    <v-text-field
                        v-model="globalState.roomInput"
                        :label="t('roomName')"
                        @keyup.enter="router.push({ path: '/', query: { room: globalState.roomInput }}); globalState.roomDialog = false;"
                        autofocus
                    >
                        <template v-slot:append>
                            <v-icon @click="generateRandomRoom">mdi-dice-multiple</v-icon>
                        </template>
                    </v-text-field>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="elevated" @click="globalState.roomDialog = false">{{ t('cancel') }}</v-btn>
                    <v-btn color="primary" variant="elevated" @click="router.push({ path: '/', query: { room: globalState.roomInput }}); globalState.roomDialog = false;">{{ t('enterRoom') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="clearAllDialog" max-width="360">
            <v-card>
                <v-card-title>{{ t('clearClipboardConfirmTitle') }}</v-card-title>
                <v-card-text>
                    <p>{{ t('clearClipboardConfirmText') }}</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn @click="clearAllDialog = false">{{ t('cancel') }}</v-btn>
                    <v-btn color="primary" @click="clearAllDialog = false; clearAll();">{{ t('ok') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 房间列表底部抽屉 -->
        <v-bottom-sheet v-model="roomSheet" scrollable max-width="800">
            <v-card>
                <v-card-title class="d-flex align-center">
                    <v-icon class="mr-2">mdi-view-grid</v-icon>
                    {{ t('roomList') }}
                    <v-chip class="ml-2" size="small" variant="outlined">{{ availableRooms.length }} {{ t('rooms') }}</v-chip>
                    <v-spacer></v-spacer>
                    <v-btn icon @click="roomSheet = false">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                
                <v-divider></v-divider>
                
                <v-card-text style="max-height: 60vh;">
                    <!-- 搜索框 -->
                    <v-text-field
                        v-model="roomSearch"
                        :placeholder="t('searchRooms')"
                        prepend-inner-icon="mdi-magnify"
                        variant="outlined"
                        density="compact"
                        clearable
                        class="mb-4"
                    ></v-text-field>
                    
                    <!-- 加载状态 -->
                    <div v-if="roomsLoading" class="text-center py-4">
                        <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        <div class="mt-2">{{ t('loadingRooms') }}</div>
                    </div>
                    
                    <!-- 空状态 -->
                    <div v-else-if="filteredRooms.length === 0" class="text-center py-8">
                        <v-icon size="64" color="grey-lighten-1">mdi-home-outline</v-icon>
                        <div class="mt-2 text-grey">{{ t('noRoomsFound') }}</div>
                    </div>
                    
                    <!-- 房间网格 -->
                    <v-row v-else>
                        <v-col
                            v-for="room in filteredRooms"
                            :key="room.name"
                            cols="12"
                            sm="6"
                            md="4"
                        >
                            <v-card
                                variant="outlined"
                                :color="globalState.room === room.name ? 'primary' : ''"
                                :theme="globalState.room === room.name ? 'dark' : undefined"
                                @click="switchRoom(room.name)"
                                style="cursor: pointer; transition: all 0.3s ease;"
                                :elevation="globalState.room === room.name ? 4 : 0"
                                hover
                            >
                                <v-card-text>
                                    <div class="d-flex justify-space-between align-center mb-3">
                                        <v-icon :color="globalState.room === room.name ? 'white' : 'primary'">
                                            {{ room.name === '' ? 'mdi-home-outline' : 'mdi-home' }}
                                        </v-icon>
                                        <v-chip
                                            size="x-small"
                                            :color="room.isActive ? 'success' : 'grey'"
                                        >
                                            {{ room.isActive ? t('active') : t('inactive') }}
                                        </v-chip>
                                    </div>
                                    
                                    <div class="text-subtitle-1 font-weight-bold mb-2" style="word-break: break-word;">
                                        {{ room.name || t('publicRoom') }}
                                    </div>
                                    
                                    <div class="text-caption mb-3" :class="globalState.room === room.name ? 'text-white' : 'text-grey'">
                                        {{ t('messages') }}: {{ room.messageCount }}<br>
                                        {{ t('lastActive') }}: {{ formatTime(room.lastActive) }}
                                    </div>
                                    
                                    <div class="d-flex justify-space-between align-center">
                                        <v-chip 
                                            size="x-small" 
                                            :variant="globalState.room === room.name ? 'flat' : 'outlined'"
                                            :color="globalState.room === room.name ? 'white' : 'primary'"
                                        >
                                            {{ room.deviceCount }} {{ t('devices') }}
                                        </v-chip>
                                        <v-btn
                                            size="x-small"
                                            icon
                                            @click.stop="toggleFavoriteRoom(room.name)"
                                            :color="globalState.room === room.name ? 'white' : 'grey'"
                                        >
                                            <v-icon size="small">
                                                {{ room.isFavorite ? 'mdi-heart' : 'mdi-heart-outline' }}
                                            </v-icon>
                                        </v-btn>
                                    </div>
                                </v-card-text>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </v-bottom-sheet>

    </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const theme = useTheme()

// 全局状态
const globalState = inject('globalState')

// 本地状态
const drawer = ref(false)
const colorDialog = ref(false)
const clearAllDialog = ref(false)
const primaryColor = ref('#1976D2')
const roomSheet = ref(false)
const roomSearch = ref('')
const availableRooms = ref([])
const roomsLoading = ref(false)

// 计算属性
const currentLanguageName = computed(() => {
    switch (locale.value) {
        case 'zh': return '简体中文'
        case 'zh-TW': return '繁體中文'
        case 'ja': return '日本語'
        case 'en':
        default: return 'English'
    }
})

const connectionStatusText = computed(() => {
    if (globalState.websocket) return t('connected')
    if (globalState.websocketConnecting) return t('connecting')
    return t('disconnected')
})

const filteredRooms = computed(() => {
    let rooms = availableRooms.value
    
    // 按搜索条件过滤
    if (roomSearch.value) {
        rooms = rooms.filter(room => 
            (room.name || t('publicRoom')).toLowerCase().includes(roomSearch.value.toLowerCase())
        )
    }
    
    // 按收藏状态排序
    return rooms.sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) {
            return b.isFavorite - a.isFavorite
        }
        return 0
    })
})

// 方法
const changeLocale = (newLocale) => {
    if (locale.value !== newLocale) {
        locale.value = newLocale
        localStorage.setItem('locale', newLocale)
    }
}

const goHome = () => {
    if (route.path !== '/') {
        router.push('/')
    } else if (route.query.room) {
        router.push('/')
    }
}

const copyRoomName = (roomName) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(roomName)
            .then(() => console.log('Copied'))
            .catch(err => console.error(err))
    }
}

const generateRandomRoom = () => {
    const names = ['reimu', 'marisa', 'rumia', 'cirno', 'meiling', 'patchouli', 'sakuya', 'remilia', 'flandre']
    globalState.roomInput = names[Math.floor(Math.random() * names.length)] + '-' + Math.random().toString(16).substring(2, 6)
}

const clearAll = async () => {
    try {
        await axios.delete('revoke/all', {
            params: { room: globalState.room },
        })
    } catch (error) {
        console.error(error)
    }
}

// 房间列表相关方法
const fetchRoomList = async () => {
    if (!globalState.config || 
        !globalState.config.server || 
        !globalState.config.server.roomList) {
        console.log('房间列表功能未启用')
        return
    }
    
    if (roomsLoading.value) {
        console.log('房间列表正在加载中')
        return
    }
    
    roomsLoading.value = true
    console.log('获取房间列表')
    
    try {
        const response = await axios.get('rooms')
        const favoriteRooms = getFavoriteRooms()
        availableRooms.value = response.data.rooms.map(room => ({
            ...room,
            isFavorite: favoriteRooms.includes(room.name)
        }))
        console.log(`房间列表更新成功，共 ${availableRooms.value.length} 个房间`)
    } catch (error) {
        console.error('Failed to fetch room list:', error)
    } finally {
        roomsLoading.value = false
    }
}

const switchRoom = (roomName) => {
    roomSheet.value = false
    if (roomName === '') {
        router.push('/')
    } else {
        router.push({ path: '/', query: { room: roomName } })
    }
}

const getFavoriteRooms = () => {
    try {
        return JSON.parse(localStorage.getItem('favoriteRooms') || '[]')
    } catch {
        return []
    }
}

const toggleFavoriteRoom = (roomName) => {
    const favorites = getFavoriteRooms()
    const index = favorites.indexOf(roomName)
    
    if (index > -1) {
        favorites.splice(index, 1)
        console.log(`已从收藏中移除: ${roomName}`)
    } else {
        favorites.push(roomName)
        console.log(`已添加到收藏: ${roomName}`)
    }
    
    localStorage.setItem('favoriteRooms', JSON.stringify(favorites))
    
    // 更新当前房间列表的收藏状态
    const room = availableRooms.value.find(r => r.name === roomName)
    if (room) {
        room.isFavorite = !room.isFavorite
    }
}

const formatTime = (timestamp) => {
    if (!timestamp || timestamp === 0) return t('never')
    
    const now = Math.floor(Date.now() / 1000)
    const messageTime = timestamp
    const diff = now - messageTime
    
    if (diff < 0) {
        return t('justNow')
    }
    
    if (diff < 60) {
        return t('justNow')
    } else if (diff < 3600) {
        return t('minutesAgo', { minutes: Math.floor(diff / 60) })
    } else if (diff < 86400) {
        return t('hoursAgo', { hours: Math.floor(diff / 3600) })
    } else {
        return t('daysAgo', { days: Math.floor(diff / 86400) })
    }
}

const connect = () => {
    globalState.websocketConnecting = true
    console.log('开始连接 WebSocket...')
    axios.get('server').then(response => {
        console.log('获取服务器配置成功:', response.data)
        if (globalState.authCode) localStorage.setItem('auth', globalState.authCode)
        return new Promise((resolve, reject) => {
            const wsUrl = new URL(response.data.server)
            wsUrl.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
            wsUrl.port = location.port
            if (response.data.auth) {
                if (globalState.authCode) {
                    wsUrl.searchParams.set('auth', globalState.authCode)
                } else {
                    globalState.authCodeDialog = true
                    reject(new Error('需要认证'))
                    return
                }
            }
            wsUrl.searchParams.set('room', globalState.room)
            console.log('WebSocket URL:', wsUrl.toString())
            const ws = new WebSocket(wsUrl)
            ws.onopen = () => {
                console.log('WebSocket 连接成功')
                resolve(ws)
            }
            ws.onerror = (error) => {
                console.error('WebSocket 连接错误:', error)
                reject(error)
            }
        })
    }).then((ws) => {
        globalState.websocket = ws
        globalState.websocketConnecting = false
        globalState.retry = 0
        globalState.received = []
        console.log('WebSocket 已连接，开始监听消息')
        
        // 心跳保持连接
        const heartbeatInterval = setInterval(() => { 
            if (ws.readyState === WebSocket.OPEN) {
                ws.send('')
            } else {
                clearInterval(heartbeatInterval)
            }
        }, 30000)
        
        ws.onclose = () => {
            console.log('WebSocket 连接关闭')
            clearInterval(heartbeatInterval)
            globalState.websocket = null
            globalState.websocketConnecting = false
            globalState.device = []
            if (globalState.retry < 3) {
                globalState.retry++
                console.log(`尝试重新连接 (${globalState.retry}/3)`)
                setTimeout(() => connect(), 3000)
            } else if (globalState.authCode) {
                globalState.authCodeDialog = true
            }
        }
        ws.onmessage = e => {
            try {
                const parsed = JSON.parse(e.data)
                console.log('收到 WebSocket 消息:', parsed)
                handleWebSocketEvent(parsed.event, parsed.data)
            } catch (error) {
                console.error('解析 WebSocket 消息失败:', error, e.data)
            }
        }
    }).catch(error => {
        console.error('连接失败:', error)
        globalState.websocketConnecting = false
        failure()
    })
}

const disconnect = () => {
    console.log('断开 WebSocket 连接')
    globalState.websocketConnecting = false
    if (globalState.websocket) {
        globalState.websocket.onclose = () => {}
        globalState.websocket.close()
        globalState.websocket = null
    }
    globalState.device = []
}

const failure = () => {
    console.log('连接失败处理')
    localStorage.removeItem('auth')
    globalState.websocket = null
    globalState.device = []
    if (globalState.retry++ < 3) {
        console.log(`重试连接 (${globalState.retry}/3)`)
        connect()
    }
}

const handleWebSocketEvent = (event, data) => {
    switch(event) {
        case 'receive':
            globalState.received.unshift(data)
            break
        case 'receiveMulti':
            globalState.received.unshift(...Array.from(data).reverse())
            break
        case 'revoke':
            const index = globalState.received.findIndex(e => e.id === data.id)
            if (index !== -1) {
                globalState.received.splice(index, 1)
            }
            break
        case 'clearAll':
            // 清空剪贴板
            globalState.received = []
            console.log('剪贴板已清空')
            break
        case 'config':
            globalState.config = data
            console.log(`%c Cloud Clipboard ${data.version} by Jonnyan404 %c https://github.com/Jonnyan404/cloud-clipboard-go `,
                'color:#fff;background-color:#1e88e5',
                'color:#fff;background-color:#64b5f6')
            break
        case 'connect':
            globalState.device.push(data)
            break
        case 'disconnect':
            const deviceIndex = globalState.device.findIndex(e => e.id === data.id)
            if (deviceIndex !== -1) {
                globalState.device.splice(deviceIndex, 1)
            }
            break
        case 'update':
            const updateIndex = globalState.received.findIndex(e => e.id === data.id)
            if (updateIndex !== -1) {
                globalState.received.splice(updateIndex, 1, { ...globalState.received[updateIndex], ...data })
            }
            break
        case 'forbidden':
            globalState.authCode = ''
            localStorage.removeItem('auth')
            break
    }
}

// 监听显示设置变化，保存到 localStorage
watch(() => globalState.showTimestamp, (newVal) => {
    localStorage.setItem('showTimestamp', newVal)
})

watch(() => globalState.showDeviceInfo, (newVal) => {
    localStorage.setItem('showDeviceInfo', newVal)
})

watch(() => globalState.showSenderIP, (newVal) => {
    localStorage.setItem('showSenderIP', newVal)
})

// 监听主题颜色变化
watch(primaryColor, (newVal) => {
    theme.themes.value.light.colors.primary = newVal
    theme.themes.value.dark.colors.primary = newVal
    localStorage.setItem('primaryColor', newVal)
})

// 更新主题的函数
const updateTheme = () => {
    const mode = globalState.dark
    
    if (mode === 'enable') {
        theme.global.name.value = 'dark'
    } else if (mode === 'disable') {
        theme.global.name.value = 'light'
    } else if (mode === 'time') {
        const hour = new Date().getHours()
        theme.global.name.value = (hour >= 19 || hour < 7) ? 'dark' : 'light'
    } else if (mode === 'prefer') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        theme.global.name.value = prefersDark ? 'dark' : 'light'
    }
}

// 监听深色模式变化
watch(() => globalState.dark, (newVal) => {
    localStorage.setItem('darkmode', newVal)
    updateTheme()
}, { immediate: true })

// 监听系统主题变化（当选择"根据系统设置"时）
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (globalState.dark === 'prefer') {
        updateTheme()
    }
})

// 监听时间变化（当选择"根据时间切换"时，每分钟检查一次）
setInterval(() => {
    if (globalState.dark === 'time') {
        updateTheme()
    }
}, 60000)



// 挂载时初始化
onMounted(() => {
    const savedColor = localStorage.getItem('primaryColor')
    if (savedColor) {
        primaryColor.value = savedColor
    }
    
    // 不在这里设置 globalState.dark，因为已经在初始化时设置了
    // 从 URL 获取 room 参数
    const initialRoom = route.query.room || ''
    globalState.room = initialRoom
    console.log('初始房间:', initialRoom)
    
    // 连接 WebSocket
    connect()
    
    // 设置定时器更新时间
    setInterval(() => {
        globalState.date = new Date()
    }, 1000)
    
    // iOS PWA 支持：监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // 页面变为可见时，检查连接状态
            console.log('页面恢复可见，检查连接状态')
            if (!globalState.websocket || globalState.websocket.readyState !== WebSocket.OPEN) {
                console.log('连接已断开，尝试重新连接')
                globalState.retry = 0
                connect()
            }
        }
    })
    
    // iOS PWA 支持：监听页面恢复事件
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            // 从 bfcache 恢复时重新连接
            console.log('从缓存恢复，重新连接')
            globalState.retry = 0
            connect()
        }
    })
    
    // iOS PWA 支持：监听在线/离线状态
    window.addEventListener('online', () => {
        console.log('网络恢复在线，尝试重新连接')
        if (!globalState.websocket || globalState.websocket.readyState !== WebSocket.OPEN) {
            globalState.retry = 0
            connect()
        }
    })
    
    window.addEventListener('offline', () => {
        console.log('网络离线')
    })
})

// 监听路由变化，当 room 参数改变时重新连接
watch(() => route.query.room, (newRoom) => {
    const targetRoom = newRoom || ''
    if (targetRoom !== globalState.room) {
        console.log(`房间切换: ${globalState.room} -> ${targetRoom}`)
        globalState.room = targetRoom
        disconnect()
        connect()
    }
})

// 提供 websocket 方法给子组件
provide('websocket', { connect, disconnect })
</script>

<style>
.v-navigation-drawer .v-navigation-drawer__border {
    pointer-events: none;
}

.v-navigation-drawer .v-list-item__spacer {
    width: 10px !important;
}

/* 隐藏滚动条 - 适用于 PWA */
* {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE 和 Edge */
}

*::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
}

html, body {
    overflow-x: hidden;
}
</style>
