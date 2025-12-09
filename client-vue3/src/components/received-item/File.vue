<template>
    <v-hover v-slot="{ isHovering, props: hoverProps }">
        <v-card v-bind="hoverProps" :elevation="isHovering ? 6 : 2" class="mb-2 transition-swing">
            <v-card-text>
                <!-- Info Line -->
                <div class="text-caption text-grey mb-1" v-if="meta.timestamp && (globalState.showTimestamp || globalState.showDeviceInfo || globalState.showSenderIP)">
                    <template v-if="globalState.showTimestamp">
                        <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>{{ formatTimestamp(meta.timestamp) }}
                    </template>
                    <template v-if="globalState.showDeviceInfo && meta.senderDevice && meta.senderDevice.type">
                        <v-icon size="small" class="ml-2 mr-1">{{ deviceIcon(meta.senderDevice.type) }}</v-icon>{{ meta.senderDevice.os || meta.senderDevice.type }}
                    </template>
                    <template v-if="globalState.showSenderIP && meta.senderIP">
                        <v-icon size="small" class="ml-2 mr-1">mdi-ip-network-outline</v-icon>{{ meta.senderIP }}
                    </template>
                </div>

                <!-- Row for Thumbnail, Title, Size/Expire, Buttons -->
                <div class="d-flex flex-row align-center">
                    <v-img
                        v-if="meta.thumbnail && (!isPreviewableVideo && !isPreviewableAudio)"
                        :src="meta.thumbnail"
                        class="mr-3 flex-grow-0 d-none d-md-block"
                        width="40"
                        height="40"
                        style="border-radius: 3px"
                    ></v-img>
                    <!-- 为音频文件添加专门的图标 -->
                    <v-icon
                        v-else-if="isPreviewableAudio"
                        class="mr-3 flex-grow-0 d-none d-md-block"
                        size="40"
                        color="grey"
                    >mdi-music-note</v-icon>
                    <!-- 为视频文件添加专门的图标 -->
                    <v-icon
                        v-else-if="isPreviewableVideo"
                        class="mr-3 flex-grow-0 d-none d-md-block"
                        size="40"
                        color="grey"
                    >mdi-movie</v-icon>
                    <!-- ... -->
                    <div class="flex-grow-1 mr-2" style="min-width: 0">
                        <!-- Title -->
                        <div
                            class="text-h6 text-truncate"
                            :style="{'text-decoration': expired ? 'line-through' : ''}"
                            :title="meta.name"
                        >{{ meta.name }}</div>
                        <!-- Original Info Line (Size/Expire) -->
                        <div class="text-caption">
                            {{ prettyFileSize(meta.size) }}
                            <template v-if="$vuetify.display.smAndDown"><br></template>
                            <template v-else>|</template>
                            {{ expired ? t('expiredAt', { time: formatTimestamp(meta.expire) }) : t('willExpireAt', { time: formatTimestamp(meta.expire) }) }}
                        </div>
                    </div>

                    <!-- Buttons + ID -->
                    <div class="align-self-start text-no-wrap d-flex flex-column align-end">
                        <!-- ID显示在按钮上方 -->
                        <div v-if="meta.id" class="text-caption text-grey mb-1">
                            <v-icon size="small" class="mr-1">mdi-pound</v-icon>{{ meta.id }}
                        </div>
                        <!-- 按钮组 -->
                        <div class="align-self-center text-no-wrap">
                            <!-- Download Button -->
                            <v-tooltip location="bottom">
                                <template v-slot:activator="{ props: tooltipProps }">
                                    <v-btn
                                        v-bind="tooltipProps"
                                        icon
                                        color="grey"
                                        :href="expired ? null : fileUrl"
                                        :download="expired ? null : meta.name"
                                        :disabled="expired"
                                        size="small"
                                    >
                                        <v-icon>{{ expired ? 'mdi-download-off' : 'mdi-download' }}</v-icon>
                                    </v-btn>
                                </template>
                                <span>{{ expired ? t('expired') : t('download') }}</span>
                            </v-tooltip>

                            <!-- Preview Button -->
                            <template v-if="meta.thumbnail || isPreviewableVideo || isPreviewableAudio">
                                <v-progress-circular
                                    v-if="loadingPreview"
                                    indeterminate
                                    color="grey"
                                    size="small"
                                >{{ percentage(loadedPreview / (meta.size || 1), 0) }}</v-progress-circular>
                                <v-tooltip location="bottom" v-else>
                                    <template v-slot:activator="{ props: tooltipProps }">
                                        <v-btn v-bind="tooltipProps" icon color="grey" @click="!expired && previewFile()" size="small">
                                            <v-icon>{{ (isPreviewableVideo || isPreviewableAudio) ? 'mdi-movie-search-outline' : 'mdi-image-search-outline' }}</v-icon>
                                        </v-btn>
                                    </template>
                                    <span>{{ t('preview') }}</span>
                                </v-tooltip>
                            </template>

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
                                    <v-btn v-bind="tooltipProps" icon="mdi-close" color="grey" @click="deleteItem" :disabled="loadingPreview" size="small"></v-btn>
                                </template>
                                <span>{{ t('delete') }}</span>
                            </v-tooltip>
                        </div>
                    </div>
                </div>
                <v-expand-transition v-if="meta.thumbnail || isPreviewableVideo || isPreviewableAudio">
                    <div v-show="expand">
                        <v-divider class="my-2"></v-divider>
                        <video
                            v-if="isPreviewableVideo"
                            :src="srcPreview"
                            style="max-height:480px;max-width:100%;"
                            class="rounded d-block mx-auto"
                            controls
                            preload="metadata"
                        ></video>
                        <audio
                            v-else-if="isPreviewableAudio"
                            :src="srcPreview"
                            style="width:100%"
                            class="rounded d-block mx-auto"
                            controls
                            preload="metadata"
                        ></audio>
                        <img
                            v-else
                            :src="srcPreview"
                            style="max-height:480px;max-width:100%;"
                            class="rounded d-block mx-auto"
                        >
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
import { formatTimestamp, prettyFileSize, percentage } from '../../utils/filters'

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

const loadingPreview = ref(false)
const loadedPreview = ref(0)
const expand = ref(false)
const srcPreview = ref(null)
const qrDialogVisible = ref(false)

// Computed properties
const expired = computed(() => {
    return globalState.date.getTime() / 1000 > props.meta.expire
})

const isPreviewableVideo = computed(() => {
    return props.meta.name.match(/\.(mp4|webm|ogv)$/gi)
})

const isPreviewableAudio = computed(() => {
    return props.meta.name.match(/\.(mp3|wav|ogg|opus|m4a|flac)$/gi)
})

const contentUrl = computed(() => {
    const protocol = window.location.protocol
    const host = window.location.host
    const prefix = globalState.config?.server?.prefix || ''
    const roomQuery = globalState.room ? `?room=${globalState.room}` : ''
    const id = props.meta?.id ?? ''
    return `${protocol}//${host}${prefix}/content/${id}${roomQuery}`
})

const fileUrl = computed(() => {
    const protocol = window.location.protocol
    const host = window.location.host
    const prefix = globalState.config?.server?.prefix || ''
    const cache = props.meta?.cache || ''
    const encodedFilename = encodeURIComponent(props.meta?.name || 'file')
    return `${protocol}//${host}${prefix}/file/${cache}/${encodedFilename}`
})

// Methods
const deviceIcon = (type) => {
    const lowerType = type?.toLowerCase() || ''
    if (lowerType.includes('mobile') || lowerType.includes('phone') || 
        lowerType.includes('tablet') || lowerType.includes('ios') || 
        lowerType.includes('android')) {
        return 'mdi-cellphone'
    }
    return 'mdi-desktop-tower'
}

const previewFile = () => {
    if (expand.value) {
        expand.value = false
        return
    } else if (srcPreview.value) {
        expand.value = true
        return
    }
    expand.value = true
    if (isPreviewableVideo.value || isPreviewableAudio.value) {
        srcPreview.value = `file/${props.meta.cache}/${encodeURIComponent(props.meta.name)}`
    } else {
        loadingPreview.value = true
        loadedPreview.value = 0
        $http.get(`file/${props.meta.cache}/${encodeURIComponent(props.meta.name)}`, {
            responseType: 'arraybuffer',
            onDownloadProgress: e => { loadedPreview.value = e.loaded },
        }).then(response => {
            srcPreview.value = URL.createObjectURL(new Blob([response.data]))
        }).catch(error => {
            console.error('文件预览失败:', error)
            expand.value = false
        }).finally(() => {
            loadingPreview.value = false
        })
    }
}

const copyLink = () => {
    copyToClipboard(contentUrl.value, 'copySuccess')
}

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

const deleteItem = () => {
    $http.delete(`revoke/${props.meta.id}`, {
        params: new URLSearchParams([['room', globalState.room]]),
    }).then(() => {
        if (!expired.value && props.meta.cache) {
            $http.delete(`file/${props.meta.cache}`).then(() => {
                // 删除成功
            }).catch(error => {
                console.error("删除物理文件失败:", error)
            })
        }
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
