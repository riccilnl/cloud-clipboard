<template>
    <v-hover v-slot="{ isHovering, props: hoverProps }">
        <v-card v-bind="hoverProps" :elevation="isHovering ? 6 : 2" class="mb-2 transition-swing">
            <v-card-text>
                <!-- 第一行：编号+类型 和 操作按钮 -->
                <div class="d-flex justify-space-between align-center mb-2">
                    <!-- 左侧：编号 + 类型 -->
                    <div class="d-flex align-center">
                        <span class="text-caption text-grey mr-2">
                            #{{ meta.id }}
                        </span>
                        <v-chip size="small" color="primary" variant="tonal">
                            {{ t('textMessage') }}
                        </v-chip>
                    </div>
                    
                    <!-- 右侧：操作按钮（仅图标） -->
                    <div class="d-flex">
                        <!-- 复制文本 -->
                        <v-tooltip location="bottom">
                            <template v-slot:activator="{ props: tooltipProps }">
                                <v-btn 
                                    v-bind="tooltipProps" 
                                    icon="mdi-content-copy" 
                                    variant="text"
                                    size="small"
                                    @click="copyText"
                                ></v-btn>
                            </template>
                            <span>{{ t('copyText') }}</span>
                        </v-tooltip>
                        
                        <!-- 复制链接 -->
                        <v-tooltip location="bottom">
                            <template v-slot:activator="{ props: tooltipProps }">
                                <v-btn 
                                    v-bind="tooltipProps" 
                                    icon="mdi-link-variant" 
                                    variant="text"
                                    size="small"
                                    @click="copyLink"
                                ></v-btn>
                            </template>
                            <span>{{ t('copyLink') }}</span>
                        </v-tooltip>
                        
                        <!-- 显示二维码 -->
                        <v-tooltip location="bottom">
                            <template v-slot:activator="{ props: tooltipProps }">
                                <v-btn 
                                    v-bind="tooltipProps" 
                                    icon="mdi-qrcode" 
                                    variant="text"
                                    size="small"
                                    @click="qrDialogVisible = true"
                                ></v-btn>
                            </template>
                            <span>{{ t('showQrCode') }}</span>
                        </v-tooltip>
                        
                        <!-- 删除 -->
                        <v-tooltip location="bottom">
                            <template v-slot:activator="{ props: tooltipProps }">
                                <v-btn 
                                    v-bind="tooltipProps" 
                                    icon="mdi-delete-outline" 
                                    variant="text"
                                    size="small"
                                    color="error"
                                    @click="deleteItem"
                                ></v-btn>
                            </template>
                            <span>{{ t('delete') }}</span>
                        </v-tooltip>
                    </div>
                </div>
                
                <!-- 第二行：消息内容 -->
                <div 
                    @click="toggleExpand" 
                    style="cursor: pointer;"
                    :class="{ 'text-clamp-3': !expanded }"
                    class="message-content"
                >
                    {{ decodedContent }}
                </div>
                
                <!-- 展开提示 -->
                <div v-if="!expanded && isContentLong" class="text-caption text-grey mt-2">
                    {{ t('clickToExpand') }}
                </div>
                
                <!-- 元数据信息（可选显示） -->
                <div 
                    v-if="meta.timestamp && (globalState.showTimestamp || globalState.showDeviceInfo || globalState.showSenderIP)" 
                    class="text-caption text-grey mt-2"
                >
                    <template v-if="globalState.showTimestamp">
                        <v-icon size="x-small" class="mr-1">mdi-clock-outline</v-icon>{{ formatTimestamp(meta.timestamp) }}
                    </template>
                    <template v-if="globalState.showDeviceInfo && meta.senderDevice?.type">
                        <v-icon size="x-small" class="ml-2 mr-1">{{ deviceIcon(meta.senderDevice.type) }}</v-icon>{{ meta.senderDevice.os || meta.senderDevice.type }}
                    </template>
                    <template v-if="globalState.showSenderIP && meta.senderIP">
                        <v-icon size="x-small" class="ml-2 mr-1">mdi-ip-network-outline</v-icon>{{ meta.senderIP }}
                    </template>
                </div>
            </v-card-text>

            <!-- QR Code Dialog -->
            <v-dialog v-model="qrDialogVisible" max-width="250">
                <v-card>
                    <v-card-title class="text-h5 justify-center">{{ t('scanToAccess') }}</v-card-title>
                    <v-card-text class="text-center pa-4">
                        <div class="text-caption">QR Code (需要安装 qrcode.vue)</div>
                        <div class="text-caption mt-2" style="word-break: break-all;">{{ contentUrl }}</div>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="text" @click="qrDialogVisible = false">{{ t('close') }}</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-card>
    </v-hover>
</template>

<script setup>
import { ref, computed, inject, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatTimestamp } from '../../utils/filters'

const props = defineProps({
    meta: {
        type: Object,
        default: () => ({})
    }
})

const { t } = useI18n()
const globalState = inject('globalState')
const instance = getCurrentInstance()
const $http = instance.proxy.$http

const expanded = ref(false)
const qrDialogVisible = ref(false)

// Helper function to decode HTML entities
function decodeHtmlEntities(text) {
    const textArea = document.createElement('textarea')
    textArea.innerHTML = text
    return textArea.value
}

// Decode content for display
const decodedContent = computed(() => {
    return decodeHtmlEntities(props.meta.content || '')
})

// Check if content is long (more than 3 lines approximately)
const isContentLong = computed(() => {
    return decodedContent.value.length > 150 // 大约3行的字符数
})

// Toggle expand/collapse
const toggleExpand = () => {
    expanded.value = !expanded.value
}

// Content URL for QR code
const contentUrl = computed(() => {
    const protocol = window.location.protocol
    const host = window.location.host
    const prefix = globalState.config?.server?.prefix || ''
    const roomQuery = globalState.room ? `?room=${globalState.room}` : ''
    const id = props.meta?.id ?? ''
    return `${protocol}//${host}${prefix}/content/${id}${roomQuery}`
})

// Device icon helper
const deviceIcon = (type) => {
    const lowerType = type.toLowerCase()
    if (lowerType.includes('mobile') || lowerType.includes('phone') || 
        lowerType.includes('tablet') || lowerType.includes('ios') || 
        lowerType.includes('android')) {
        return 'mdi-cellphone'
    }
    return 'mdi-desktop-tower'
}

// Copy to clipboard helper
const copyToClipboard = (textToCopy) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                // 可以添加 toast 提示
            })
            .catch(err => {
                console.error('使用 navigator.clipboard 复制失败:', err)
            })
    } else {
        try {
            const textArea = document.createElement("textarea")
            textArea.value = textToCopy
            textArea.style.position = "absolute"
            textArea.style.left = "-9999px"
            document.body.appendChild(textArea)
            textArea.select()
            const successful = document.execCommand('copy')
            document.body.removeChild(textArea)
            if (!successful) {
                console.error('使用 document.execCommand 复制失败')
            }
        } catch (err) {
            console.error('复制时发生错误:', err)
        }
    }
}

const copyText = () => {
    copyToClipboard(decodedContent.value)
}

const copyLink = () => {
    copyToClipboard(contentUrl.value)
}

const deleteItem = () => {
    $http.delete(`revoke/${props.meta.id}`, {
        params: new URLSearchParams([['room', globalState.room]])
    }).then(() => {
        // 删除成功
    }).catch(error => {
        console.error('删除失败:', error)
    })
}
</script>

<style scoped>
.transition-swing {
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 限制文本显示3行 */
.text-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre-wrap;
    word-break: break-word;
}

.message-content {
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
