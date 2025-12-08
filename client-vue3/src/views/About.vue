<template>
    <v-container>
        <v-card>
            <v-card-title>{{ t('about') }}</v-card-title>
            <v-card-text>
                <h3>Cloud Clipboard</h3>
                <p>{{ t('version') }}: {{ globalState.config.version }}</p>
                <p>
                    <a href="https://github.com/Jonnyan404/cloud-clipboard-go" target="_blank">
                        GitHub Repository
                    </a>
                </p>
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
