<template>
    <v-container>
        <v-card>
            <v-card-title>{{ t('deviceList') }}</v-card-title>
            <v-card-text>
                <v-list>
                    <v-list-item v-for="device in globalState.device" :key="device.id">
                        <v-list-item-title>{{ device.name || device.id }}</v-list-item-title>
                        <v-list-item-subtitle>{{ device.ip }}</v-list-item-subtitle>
                    </v-list-item>
                </v-list>
                <div v-if="globalState.device.length === 0" class="text-center text-grey py-4">
                    {{ t('noDevices') }}
                </div>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const globalState = inject('globalState')
</script>
