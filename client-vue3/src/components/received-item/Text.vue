<template>
    <v-hover v-slot="{ isHovering, props: hoverProps }">
        <v-card v-bind="hoverProps" :elevation="isHovering ? 6 : 2" class="mb-2 transition-swing">
            <v-card-text>
                <div class="d-flex flex-row align-center">
                    <div class="flex-grow-1 mr-2" style="min-width: 0">
                        <!-- Info Line -->
                        <div class="text-caption text-grey mb-1" v-if="meta.timestamp && (globalState.showTimestamp || globalState.showDeviceInfo || globalState.showSenderIP)">
                            <template v-if="globalState.showTimestamp">
                                <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>{{ formatTimestamp(meta.timestamp) }}
                            </template>
                            <template v-if="globalState.showDeviceInfo && meta.senderDevice?.type">
                                <v-icon size="small" class="ml-2 mr-1">{{ deviceIcon(meta.senderDevice.type) }}</v-icon>{{ meta.senderDevice.os || meta.senderDevice.type }}
                            </template>
                            <template v-if="globalState.showSenderIP && meta.senderIP">
                                <v-icon size="small" class="ml-2 mr-1">mdi-ip-network-outline</v-icon>{{ meta.senderIP }}
                            </template>
                        </div>
                        <!-- Title -->
                        <div class="text-h6 text-truncate" @click="expand = !expand" style="cursor: pointer;">
                            {{ t('textMessage') }}<v-icon>{{ expand ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                        </div>
                        <!-- Preview -->
                        <div class="text-truncate" @click="expand = !expand" style="cursor: pointer;">{{ decodedContentPreview }}</div>
                    </div>
                    <!-- Buttons + ID -->
                    <div class="align-self-start text-no-wrap d-flex flex-column align-end">
                        <!-- ID显示在按钮上方 -->
                        <div v-if="meta.id" class="text-caption text-grey mb-1">
                            <v-icon size="small" class="mr-1">mdi-pound</v-icon>{{ meta.id }}
                        </div>
                        <!-- 按钮组 -->
                        <div>
                            <!-- Copy Text Button -->
                            <v-tooltip location="bottom">
                                <template v-slot:activator="{ props: tooltipProps }">
                                    <v-btn v-bind="tooltipProps" icon="mdi-content-copy" color="grey" @click="copyText" size="small"></v-btn>
                                </template>
                                <span>{{ t('copyText') }}</span>
                            </v-tooltip>

                            <!-- Copy Link Button -->
                            <v-tooltip location="bottom">
                                <template v-slot:activator="{ props: tooltipProps }">
                                    <v-btn v-bind="tooltipProps" icon="mdi-link-variant" color="grey" @click="copyLink" size="small"></v-btn>
                                </template>
                                <span>{{ t('copyLink') }}</span>
                            </v-tooltip>

                            <!-- Show QR Code Button -->
                            <v-tooltip location="bottom">
                                <template v-slot:activator="{ props: tooltipProps }">
                                    <v-btn v-bind="tooltipProps" icon="mdi-qrcode" color="grey" @click="qrDialogVisible = true" size="small"></v-btn>
                                </template>
                                <span>{{ t('showQrCode') }}</span>
                            </v-tooltip>

                            <!-- Delete Button -->
                            <v-tooltip location="bottom">
                                <template v-slot:activator="{ props: tooltipProps }">
                                    <v-btn v-bind="tooltipProps" icon="mdi-close" color="grey" @click="deleteItem" size="small"></v-btn>
                                </template>
                                <span>{{ t('delete') }}</span>
                            </v-tooltip>
                        </div>
                    </div>
                </div>
                <v-expand-transition>
                    <div v-show="expand">
                        <v-divider class="my-2"></v-divider>
                        <div ref="contentRef" style="white-space: pre-wrap; word-break: break-all;">{{ decodedContent }}</div>
                    </div>
                </v-expand-transition>
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

const expand = ref(false)
const qrDialogVisible = ref(false)
const contentRef = ref(null)

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

// Decode content for preview
const decodedContentPreview = computed(() => {
    return decodeHtmlEntities(props.meta.content || '')
})

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
const copyToClipboard = (textToCopy, successMessageKey = 'copySuccess', errorMessageKey = 'copyFailedGeneral') => {
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
    copyToClipboard(decodedContent.value, 'copySuccess')
}

const copyLink = () => {
    copyToClipboard(contentUrl.value, 'copySuccess')
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
</style>
