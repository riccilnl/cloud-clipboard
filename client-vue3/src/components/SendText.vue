<template>
    <div>
        <div class="text-h6 text-primary mb-4">{{ t('sendText') }}</div>
        <v-textarea
            ref="textarea"
            variant="solo-filled"
            density="compact"
            rows="6"
            :counter="globalState.config?.text?.limit || 0"
            :placeholder="t('enterTextToSend')"
            v-model="globalState.send.text"
        ></v-textarea>
        <div class="text-right">
            <v-btn
                color="primary"
                :disabled="!globalState.send.text || !globalState.websocket || (globalState.config?.text?.limit && globalState.send.text.length > globalState.config.text.limit)"
                @click="send"
            >{{ t('send') }}</v-btn>
        </div>
    </div>
</template>

<script setup>
import { ref, inject, onMounted, nextTick, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const globalState = inject('globalState')
const instance = getCurrentInstance()
const $http = instance.proxy.$http

const emit = defineEmits(['success'])

const textarea = ref(null)

const send = () => {
    $http.post(
        'text',
        globalState.send.text,
        {
            params: new URLSearchParams([['room', globalState.room]]),
            headers: {
                'Content-Type': 'text/plain',
            },
        },
    ).then(response => {
        console.log('Send success')
        globalState.send.text = ''
        // 使用 nextTick 确保 DOM 更新后再聚焦
        nextTick(() => {
            setTimeout(() => {
                textarea.value?.focus()
            }, 100)
        })
        // 触发成功事件
        emit('success')
    }).catch(error => {
        console.error('Send failed', error)
    })
}

onMounted(() => {
    textarea.value?.focus()
})

// 暴露 focus 方法供父组件调用
defineExpose({
    focus: () => textarea.value?.focus()
})
</script>
