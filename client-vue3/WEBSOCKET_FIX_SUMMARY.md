# WebSocket 连接问题修复总结

## 发现的主要问题

### 1. **缺少 `disconnect` 函数**
- **问题**: Vue3 的 App.vue 中调用了 `disconnect()` 但没有定义
- **影响**: 切换房间时无法正确断开旧连接
- **修复**: 添加了完整的 `disconnect()` 和 `failure()` 函数

### 2. **Room 初始化错误**
- **Vue2**: `room: this.$router.currentRoute.query.room || ''` (空字符串表示公共房间)
- **Vue3 (错误)**: `room: 'default'` 
- **影响**: 连接到错误的房间,导致无法正常通信
- **修复**: 改为 `room: ''` 并在 App.vue mounted 时从 route.query 获取

### 3. **WebSocket URL 构建问题**
- **问题**: 没有正确处理认证失败的情况,Promise 没有 reject
- **修复**: 在需要认证但没有 authCode 时正确 reject Promise

### 4. **心跳机制问题**
- **Vue2**: 使用 `setInterval` 但没有清理
- **Vue3 (原来)**: 同样的问题
- **修复**: 保存 interval ID 并在连接关闭时清理

### 5. **日志不足**
- **问题**: 连接失败时没有足够的调试信息
- **修复**: 添加了详细的 console.log 用于调试

## 已修复的代码

### client-vue3/src/main.js
```javascript
room: '',  // 改为空字符串,表示公共房间
```

### client-vue3/src/App.vue

#### 1. 完整的 connect 函数(带日志和错误处理)
```javascript
const connect = () => {
    globalState.websocketConnecting = true
    console.log('开始连接 WebSocket...')
    axios.get('server').then(response => {
        console.log('获取服务器配置成功:', response.data)
        // ... 完整实现见代码
    })
}
```

#### 2. 添加 disconnect 函数
```javascript
const disconnect = () => {
    console.log('断开 WebSocket 连接')
    globalState.websocketConnecting = false
    if (globalState.websocket) {
        globalState.websocket.onclose = () => {}
        globalState.websocket.close()
        globalState.websocket = null
    }
    globalState.device = []
}
```

#### 3. 添加 failure 函数
```javascript
const failure = () => {
    console.log('连接失败处理')
    localStorage.removeItem('auth')
    globalState.websocket = null
    globalState.device = []
    if (globalState.retry++ < 3) {
        console.log(`重试连接 (${globalState.retry}/3)`)
        connect()
    }
}
```

#### 4. 修复房间初始化
```javascript
onMounted(() => {
    // 从 URL 获取 room 参数
    const initialRoom = route.query.room || ''
    globalState.room = initialRoom
    console.log('初始房间:', initialRoom)
    
    // 连接 WebSocket
    connect()
    // ...
})
```

#### 5. 修复房间切换逻辑
```javascript
watch(() => route.query.room, (newRoom, oldRoom) => {
    const newRoomValue = newRoom || ''
    const oldRoomValue = oldRoom || ''
    if (newRoomValue !== oldRoomValue) {
        console.log(`房间切换: ${oldRoomValue} -> ${newRoomValue}`)
        globalState.room = newRoomValue
        disconnect()
        connect()
    }
})
```

#### 6. 提供 disconnect 给子组件
```javascript
provide('websocket', { connect, disconnect })
```

## 测试步骤

1. **测试公共房间连接**
   - 访问 `/#/` (无 room 参数)
   - 检查控制台: 应该看到 "初始房间: " (空字符串)
   - 检查控制台: 应该看到 "WebSocket 连接成功"

2. **测试指定房间连接**
   - 访问 `/#/?room=test123`
   - 检查控制台: 应该看到 "初始房间: test123"
   - 检查 WebSocket URL: 应该包含 `?room=test123`

3. **测试房间切换**
   - 从公共房间切换到 test123
   - 检查控制台: 应该看到 "房间切换: -> test123"
   - 应该看到 "断开 WebSocket 连接" 和 "开始连接 WebSocket..."

4. **测试重连机制**
   - 断开网络
   - 检查控制台: 应该看到重试日志 (最多3次)
   - 恢复网络
   - 应该自动重连

## 与 Vue2 版本的对比

| 功能 | Vue2 | Vue3 (修复后) |
|------|------|---------------|
| Room 初始化 | `this.$router.currentRoute.query.room \|\| ''` | `route.query.room \|\| ''` |
| WebSocket 管理 | Mixin | Composition API (inject/provide) |
| 状态管理 | `$root` | `reactive` + `inject` |
| 事件处理 | Mixin 中的 event 对象 | App.vue 中的 handleWebSocketEvent |
| 连接/断开 | Mixin 方法 | App.vue 中的函数 + provide |

## 调试建议

如果仍然无法连接,检查:

1. **浏览器控制台**
   - 查找 "开始连接 WebSocket..." 日志
   - 查找 "WebSocket URL:" 日志,确认 URL 正确
   - 查找任何错误信息

2. **网络面板**
   - 检查 WebSocket 连接请求
   - 查看连接状态码
   - 检查是否有 CORS 或认证错误

3. **后端日志**
   - 确认后端收到连接请求
   - 检查 room 参数是否正确传递
   - 查看是否有认证或权限问题

## 后续优化建议

1. **错误提示**: 添加用户友好的错误提示(Toast/Snackbar)
2. **连接状态指示**: 在 UI 上更明显地显示连接状态
3. **自动重连优化**: 使用指数退避算法
4. **心跳优化**: 根据服务器响应动态调整心跳间隔
5. **离线支持**: 添加离线消息队列,网络恢复后自动发送
