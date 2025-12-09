<template>
    <div>
        <v-container>
            <v-row>
                <v-col cols="12" md="4" class="d-none d-md-block">
                    <send-text ref="sendTextDesktop"></send-text>
                    <v-divider class="my-4"></v-divider>
                    <send-file ref="sendFileDesktop"></send-file>
                    <v-divider class="my-4"></v-divider>
                    <!-- 页面二维码 -->
                    <v-card variant="outlined" class="mt-4 pa-4 text-center">
                        <v-card-subtitle class="text-center">{{ t('scanToAccessPage') }}</v-card-subtitle>
                        <qrcode-vue :value="currentPageUrl" :size="150" level="H" />
                        <div class="text-caption mt-2" style="word-break: break-all;">{{ currentPageUrl }}</div>
                    </v-card>
                </v-col>

                <v-col cols="12" md="8">
                    <v-fade-transition group>
                        <component
                            v-for="item in globalState.received"
                            :key="item.id"
                            :is="item.type === 'text' ? ReceivedText : ReceivedFile"
                            :meta="item"
                        />
                    </v-fade-transition>
                    <div class="text-center text-caption text-grey py-2">
                        {{ globalState.received.length ? t('alreadyAtBottom') : t('emptyHere') }}
                    </div>
                </v-col>
            </v-row>
        </v-container>

        <!-- 移动端悬浮按钮 -->
        <Teleport to="body">
            <div style="position: fixed; bottom: 16px; right: 16px; z-index: 1000;" class="d-md-none">
                <v-speed-dial
                    v-model="fab"
                    transition="scale-transition"
                >
            <template v-slot:activator="{ props: activatorProps }">
                <v-btn
                    v-bind="activatorProps"
                    color="primary"
                    icon
                    size="large"
                >
                    <v-icon v-if="fab">mdi-close</v-icon>
                    <v-icon v-else>mdi-plus</v-icon>
                </v-btn>
            </template>

            <!-- 显示二维码按钮 -->
            <v-btn
                icon
                color="indigo"
                @click="pageQrDialogVisible = true"
            >
                <v-icon>mdi-qrcode</v-icon>
                <v-tooltip activator="parent" location="start">{{ t('showQrCode') }}</v-tooltip>
            </v-btn>

            <!-- 发送文件按钮 -->
            <v-btn
                icon
                color="green"
                @click="openDialog('file')"
            >
                <v-icon>mdi-file-document-outline</v-icon>
                <v-tooltip activator="parent" location="start">{{ t('sendFile') }}</v-tooltip>
            </v-btn>

            <!-- 发送文本按钮 -->
            <v-btn
                icon
                color="red"
                @click="openDialog('text')"
            >
                <v-icon>mdi-text</v-icon>
                <v-tooltip activator="parent" location="start">{{ t('sendText') }}</v-tooltip>
            </v-btn>
            </v-speed-dial>
            </div>
        </Teleport>

        <!-- 移动端全屏对话框 -->
        <v-dialog
            v-model="dialog"
            fullscreen
            transition="dialog-bottom-transition"
            scrollable
        >
            <v-card>
                <v-toolbar color="primary" dark>
                    <v-btn icon @click="closeDialog">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                    <v-toolbar-title v-if="mode === 'text'">{{ t('sendText') }}</v-toolbar-title>
                    <v-toolbar-title v-if="mode === 'file'">{{ t('sendFile') }}</v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn icon @click="reconnect">
                        <v-icon v-if="globalState.websocket">mdi-lan-connect</v-icon>
                        <v-icon v-else-if="globalState.websocketConnecting">mdi-lan-pending</v-icon>
                        <v-icon v-else>mdi-lan-disconnect</v-icon>
                        <v-tooltip activator="parent" location="bottom">
                            <span>{{ connectionStatusText }}</span>
                        </v-tooltip>
                    </v-btn>
                </v-toolbar>
                <v-card-text class="px-4">
                    <div class="my-4">
                        <send-text 
                            ref="sendTextDialog" 
                            v-if="mode === 'text'"
                            @success="handleSendSuccess"
                        ></send-text>
                        <send-file 
                            ref="sendFileDialog" 
                            v-if="mode === 'file'"
                            @success="handleSendSuccess"
                        ></send-file>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- 页面二维码对话框 -->
        <v-dialog v-model="pageQrDialogVisible" max-width="250">
            <v-card>
                <v-card-title class="text-center">{{ t('scanToAccessPage') }}</v-card-title>
                <v-card-text class="text-center pa-4">
                    <qrcode-vue :value="currentPageUrl" :size="200" level="H" />
                    <div class="text-caption mt-2" style="word-break: break-all;">{{ currentPageUrl }}</div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" variant="text" @click="pageQrDialogVisible = false">{{ t('close') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { ref, inject, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import QrcodeVue from 'qrcode.vue'
import SendText from '../components/SendText.vue'
import SendFile from '../components/SendFile.vue'
import ReceivedText from '../components/received-item/Text.vue'
import ReceivedFile from '../components/received-item/File.vue'

const { t } = useI18n()
const route = useRoute()
const globalState = inject('globalState')
const { connect } = inject('websocket')

// 数据
const fab = ref(false)
const dialog = ref(false)
const mode = ref(null)
const pageQrDialogVisible = ref(false)

// refs
const sendTextDialog = ref(null)
const sendFileDialog = ref(null)

// 计算属性
const currentPageUrl = computed(() => {
    return window.location.href
})

const connectionStatusText = computed(() => {
    if (!globalState) return t('disconnected')
    if (globalState.websocket) return t('connected')
    if (globalState.websocketConnecting) return t('connecting')
    return t('disconnected')
})

// 方法
const reconnect = () => {
    if (!globalState) return
    if (!globalState.websocket && !globalState.websocketConnecting) {
        globalState.retry = 0
        connect()
    }
}

const openDialog = (type) => {
    mode.value = type
    dialog.value = true
    nextTick(() => {
        setTimeout(() => {
            if (type === 'text' && sendTextDialog.value) {
                sendTextDialog.value.focus?.()
            } else if (type === 'file' && sendFileDialog.value) {
                sendFileDialog.value.focus?.()
            }
        }, 300)
    })
}

const closeDialog = () => {
    dialog.value = false
}

// 处理发送成功
const handleSendSuccess = () => {
    console.log('发送成功，关闭对话框')
    closeDialog()
}

const handlePopState = (event) => {
    if (dialog.value && (!event.state || !event.state.dialogOpen)) {
        closeDialog()
    }
}

// 监听对话框状态
watch(dialog, (newval, oldval) => {
    if (newval && !oldval) {
        history.pushState({ dialogOpen: true }, null)
        window.addEventListener('popstate', handlePopState)
    } else if (!newval && oldval) {
        window.removeEventListener('popstate', handlePopState)
        if (history.state && history.state.dialogOpen) {
            history.back()
        }
    }
})

// 监听接收消息，自动滚动
watch(() => globalState.received, () => {
    nextTick(() => {
        const scrollThreshold = 200
        if (document.documentElement.scrollHeight - window.innerHeight - window.scrollY < scrollThreshold) {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
        }
    })
}, { deep: true })

// 清理
onBeforeUnmount(() => {
    window.removeEventListener('popstate', handlePopState)
})
</script>
