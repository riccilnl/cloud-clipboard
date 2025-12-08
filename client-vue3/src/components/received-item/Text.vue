<template>
    <v-card class="mb-3">
        <v-card-text>
            <div class="text-pre-wrap">{{ meta.text }}</div>
            <div class="text-caption text-grey mt-2" v-if="globalState.showTimestamp">
                {{ formatTimestamp(meta.timestamp) }}
            </div>
        </v-card-text>
        <v-card-actions>
            <v-btn size="small" @click="copyText">{{ t('copy') }}</v-btn>
            <v-btn size="small" color="error" @click="revoke">{{ t('revoke') }}</v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup>
import { inject, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatTimestamp } from '../../utils/filters'

const props = defineProps({
    meta: Object
})

const { t } = useI18n()
const globalState = inject('globalState')
const instance = getCurrentInstance()
const $http = instance.proxy.$http

const copyText = () => {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(props.meta.text)
    }
}

const revoke = async () => {
    try {
        await $http.delete(`revoke/${props.meta.id}`, {
            params: { room: globalState.room }
        })
    } catch (error) {
        console.error('Revoke failed', error)
    }
}
</script>

<style scoped>
.text-pre-wrap {
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
