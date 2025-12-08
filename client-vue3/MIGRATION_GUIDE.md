# Vue 2 到 Vue 3 迁移指南

本文档详细说明了云剪贴板项目从 Vue 2 迁移到 Vue 3 的所有变化。

## 目录
1. [项目配置变化](#项目配置变化)
2. [组件语法变化](#组件语法变化)
3. [API 变化](#api-变化)
4. [Vuetify 变化](#vuetify-变化)
5. [路由变化](#路由变化)
6. [国际化变化](#国际化变化)

## 项目配置变化

### 构建工具
**Vue 2 (Vue CLI)**
```json
{
  "scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build"
  }
}
```

**Vue 3 (Vite)**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

### 配置文件
**Vue 2**: `vue.config.js`
```javascript
module.exports = {
  transpileDependencies: ['vuetify']
}
```

**Vue 3**: `vite.config.js`
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [vue(), vuetify()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

## 组件语法变化

### 基本组件结构

**Vue 2 (Options API)**
```vue
<template>
  <div>
    <p>{{ message }}</p>
    <button @click="increment">Count: {{ count }}</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: 'Hello',
      count: 0
    }
  },
  computed: {
    doubleCount() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  mounted() {
    console.log('Component mounted')
  }
}
</script>
```

**Vue 3 (Composition API + script setup)**
```vue
<template>
  <div>
    <p>{{ message }}</p>
    <button @click="increment">Count: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const message = ref('Hello')
const count = ref(0)

const doubleCount = computed(() => count.value * 2)

const increment = () => {
  count.value++
}

onMounted(() => {
  console.log('Component mounted')
})
</script>
```

### 访问全局属性

**Vue 2**
```javascript
// 直接通过 this 访问
this.$http.get('/api')
this.$router.push('/')
this.$t('message')
```

**Vue 3**
```javascript
// 需要导入和使用 hooks
import { getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const instance = getCurrentInstance()
const $http = instance.proxy.$http
const router = useRouter()
const { t } = useI18n()

$http.get('/api')
router.push('/')
t('message')
```

### Props 和 Emits

**Vue 2**
```vue
<script>
export default {
  props: {
    title: String,
    count: Number
  },
  methods: {
    handleClick() {
      this.$emit('update', this.count + 1)
    }
  }
}
</script>
```

**Vue 3**
```vue
<script setup>
const props = defineProps({
  title: String,
  count: Number
})

const emit = defineEmits(['update'])

const handleClick = () => {
  emit('update', props.count + 1)
}
</script>
```

## API 变化

### 响应式数据

**Vue 2**
```javascript
data() {
  return {
    user: {
      name: 'John',
      age: 30
    },
    items: []
  }
}
```

**Vue 3**
```javascript
import { ref, reactive } from 'vue'

// 基本类型使用 ref
const name = ref('John')
const age = ref(30)

// 对象使用 reactive
const user = reactive({
  name: 'John',
  age: 30
})

// 数组可以使用 ref 或 reactive
const items = ref([])
// 或
const items = reactive([])
```

### 生命周期钩子

| Vue 2 | Vue 3 |
|-------|-------|
| `beforeCreate` | `setup()` |
| `created` | `setup()` |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed` | `onUnmounted` |

### 监听器

**Vue 2**
```javascript
watch: {
  count(newVal, oldVal) {
    console.log(`Count changed from ${oldVal} to ${newVal}`)
  },
  'user.name': {
    handler(newVal) {
      console.log('Name changed:', newVal)
    },
    deep: true
  }
}
```

**Vue 3**
```javascript
import { watch } from 'vue'

watch(count, (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`)
})

watch(() => user.name, (newVal) => {
  console.log('Name changed:', newVal)
}, { deep: true })
```

## Vuetify 变化

### 组件 API 变化

**Vue 2 (Vuetify 2)**
```vue
<v-list-item link>
  <v-list-item-action>
    <v-icon>mdi-home</v-icon>
  </v-list-item-action>
  <v-list-item-content>
    <v-list-item-title>Home</v-list-item-title>
  </v-list-item-content>
</v-list-item>

<v-btn text color="primary">Click</v-btn>
<v-card outlined>Content</v-card>
<v-textarea outlined dense></v-textarea>
```

**Vue 3 (Vuetify 3)**
```vue
<v-list-item>
  <template v-slot:prepend>
    <v-icon>mdi-home</v-icon>
  </template>
  <v-list-item-title>Home</v-list-item-title>
</v-list-item>

<v-btn variant="text" color="primary">Click</v-btn>
<v-card variant="outlined">Content</v-card>
<v-textarea variant="outlined" density="compact"></v-textarea>
```

### 主题配置

**Vue 2**
```javascript
new Vuetify({
  theme: {
    dark: false,
    themes: {
      light: {
        primary: '#1976D2'
      }
    }
  }
})
```

**Vue 3**
```javascript
import { createVuetify } from 'vuetify'

createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2'
        }
      }
    }
  }
})
```

### 访问主题

**Vue 2**
```javascript
this.$vuetify.theme.dark = true
this.$vuetify.theme.themes.light.primary = '#FF0000'
```

**Vue 3**
```javascript
import { useTheme } from 'vuetify'

const theme = useTheme()
theme.global.name.value = 'dark'
theme.themes.value.light.colors.primary = '#FF0000'
```

## 路由变化

### 路由配置

**Vue 2**
```javascript
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const router = new VueRouter({
  mode: 'hash',
  routes: [...]
})
```

**Vue 3**
```javascript
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [...]
})
```

### 组件内使用

**Vue 2**
```javascript
export default {
  methods: {
    goToHome() {
      this.$router.push('/')
    }
  },
  computed: {
    currentRoute() {
      return this.$route.path
    }
  }
}
```

**Vue 3**
```javascript
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const goToHome = () => {
  router.push('/')
}

const currentRoute = computed(() => route.path)
```

## 国际化变化

### 配置

**Vue 2**
```javascript
import VueI18n from 'vue-i18n'

Vue.use(VueI18n)

const i18n = new VueI18n({
  locale: 'zh',
  messages: {...}
})
```

**Vue 3**
```javascript
import { createI18n } from 'vue-i18n'

const i18n = createI18n({
  legacy: false,  // 使用 Composition API 模式
  locale: 'zh',
  messages: {...}
})
```

### 组件内使用

**Vue 2**
```vue
<template>
  <div>{{ $t('message') }}</div>
</template>

<script>
export default {
  methods: {
    changeLanguage() {
      this.$i18n.locale = 'en'
    }
  }
}
</script>
```

**Vue 3**
```vue
<template>
  <div>{{ t('message') }}</div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const changeLanguage = () => {
  locale.value = 'en'
}
</script>
```

## 全局状态管理

### Vue 2 方式（使用 root instance）

**main.js**
```javascript
new Vue({
  data() {
    return {
      globalData: {}
    }
  },
  render: h => h(App)
}).$mount('#app')
```

**组件中访问**
```javascript
this.$root.globalData
```

### Vue 3 方式（使用 provide/inject）

**main.js**
```javascript
import { reactive } from 'vue'

const globalState = reactive({
  data: {}
})

app.provide('globalState', globalState)
```

**组件中访问**
```javascript
import { inject } from 'vue'

const globalState = inject('globalState')
```

## 过滤器变化

### Vue 2
```vue
<template>
  <div>{{ fileSize | prettyFileSize }}</div>
</template>

<script>
export default {
  filters: {
    prettyFileSize(size) {
      return `${size} bytes`
    }
  }
}
</script>
```

### Vue 3
```vue
<template>
  <div>{{ prettyFileSize(fileSize) }}</div>
</template>

<script setup>
import { prettyFileSize } from '@/utils/filters'

const fileSize = ref(1024)
</script>
```

## 常见问题

### 1. `this` 未定义
**问题**: 在 `<script setup>` 中无法使用 `this`

**解决**: 使用 Composition API 的 hooks
```javascript
// ❌ 错误
this.$router.push('/')

// ✅ 正确
import { useRouter } from 'vue-router'
const router = useRouter()
router.push('/')
```

### 2. 响应式丢失
**问题**: 解构 reactive 对象导致响应式丢失

**解决**: 使用 `toRefs` 或直接访问
```javascript
// ❌ 错误
const { name } = reactive({ name: 'John' })

// ✅ 正确
import { toRefs } from 'vue'
const state = reactive({ name: 'John' })
const { name } = toRefs(state)
```

### 3. ref 访问值
**问题**: 忘记使用 `.value` 访问 ref 的值

**解决**: 在 JavaScript 中使用 `.value`，模板中自动解包
```javascript
const count = ref(0)

// ❌ 错误
console.log(count)  // Ref 对象

// ✅ 正确
console.log(count.value)  // 0
```

```vue
<template>
  <!-- 模板中自动解包，不需要 .value -->
  <div>{{ count }}</div>
</template>
```

## 总结

Vue 3 的主要优势：
- ✅ 更好的性能
- ✅ 更小的打包体积
- ✅ 更好的 TypeScript 支持
- ✅ Composition API 提供更好的代码组织
- ✅ 更灵活的组件逻辑复用

迁移建议：
1. 先熟悉 Composition API 的基本概念
2. 逐个组件迁移，不要一次性全部改动
3. 充分利用 Vue 3 的新特性
4. 保持代码风格一致
5. 添加适当的类型注解（如果使用 TypeScript）
