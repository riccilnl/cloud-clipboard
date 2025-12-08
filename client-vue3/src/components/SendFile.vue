<template>
    <div>
        <div class="text-h6 text-primary mb-4">{{ t('sendFile') }}</div>
        <v-card
            variant="outlined"
            class="pa-3 mb-6 d-flex flex-row align-center"
            @dragenter.prevent
            @dragover.prevent
            @dragleave.prevent
            @drop.prevent="handleDrop"
        >
            <template v-if="globalState.send.files.length">
                <div class="flex-grow-1 mr-2" style="min-width: 0">
                    <div class="text-truncate">
                        {{globalState.send.files[0].name}} 
                        {{globalState.send.files.length > 1 ? `等 ${globalState.send.files.length} 个文件` : ''}}
                    </div>
                    <div class="text-caption">{{fileSize}}</div>
                </div>
                <v-btn icon color="grey" @click="globalState.send.files = []">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </template>
            <template v-else>
                <v-btn
                    variant="text"
                    color="primary"
                    size="large"
                    class="d-block mx-auto"
                    @click="selectFile"
                >
                    <div>
                        {{ t('selectFileToSend') }}
                        <br>
                        <small class="text-grey">{{ t('fileSizeLimit', { limit: '100MB' }) }}</small>
                    </div>
                </v-btn>
                <input
                    ref="fileInput"
                    type="file"
                    multiple
                    style="display: none"
                    @change="handleFileSelect"
                />
            </template>
        </v-card>
        <div class="text-right" v-if="globalState.send.files.length">
            <v-btn
                color="primary"
                :disabled="!globalState.websocket"
                @click="send"
            >{{ t('send') }}</v-btn>
        </div>
    </div>
</template>

<script setup>
import { ref, inject, computed, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { prettyFileSize } from '../utils/filters'

const { t } = useI18n()
const globalState = inject('globalState')
const instance = getCurrentInstance()
const $http = instance.proxy.$http

const emit = defineEmits(['success'])

const fileInput = ref(null)

const fileSize = computed(() => {
    const total = globalState.send.files.reduce((sum, file) => sum + file.size, 0)
    return prettyFileSize(total)
})

const selectFile = () => {
    fileInput.value?.click()
}

const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    globalState.send.files = files
}

const handleDrop = (event) => {
    const files = Array.from(event.dataTransfer.files)
    globalState.send.files = files
}

const send = async () => {
    for (const file of globalState.send.files) {
        const formData = new FormData()
        formData.append('file', file)
        
        try {
            await $http.post('file', formData, {
                params: { room: globalState.room },
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
        } catch (error) {
            console.error('File upload failed', error)
        }
    }
    globalState.send.files = []
    // 触发成功事件
    emit('success')
}

// 暴露 focus 方法供父组件调用
defineExpose({
    focus: () => fileInput.value?.focus()
})
</script>
