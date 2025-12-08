<template>
    <v-card class="mb-3">
        <v-card-text>
            <div class="d-flex align-center">
                <v-icon class="mr-3">mdi-file</v-icon>
                <div class="flex-grow-1">
                    <div>{{ meta.name }}</div>
                    <div class="text-caption text-grey">{{ prettyFileSize(meta.size) }}</div>
                </div>
            </div>
            <div class="text-caption text-grey mt-2" v-if="globalState.showTimestamp">
                {{ formatTimestamp(meta.timestamp) }}
            </div>
        </v-card-text>
        <v-card-actions>
            <v-btn size="small" @click="download">{{ t('download') }}</v-btn>
            <v-btn size="small" color="error" @click="revoke">{{ t('revoke') }}</v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup>
import { inject, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { prettyFileSize, formatTimestamp } from '../../utils/filters'

const props = defineProps({
    meta: Object
})

const { t } = useI18n()
const globalState = inject('globalState')
const instance = getCurrentInstance()
const $http = instance.proxy.$http

const download = () => {
    window.open(`/file/${props.meta.cache}`, '_blank')
}

const revoke = async () => {
    try {
        await $http.delete(`revoke/${props.meta.id}`, {
            params: { room: globalState.room }
        })
        await $http.delete(`file/${props.meta.cache}`)
    } catch (error) {
        console.error('Revoke failed', error)
    }
}
</script>
