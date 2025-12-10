/**
 * Vue3 PWA 连接管理器适配层
 * 用于桥接原有的 pwa-connection-manager.js 和 Vue3 应用
 */

// 全局变量，用于暴露给 PWA 管理器
window.$root = null;
window.$globalState = null;

/**
 * 创建 Vue3 适配器
 * @param {Object} vueApp - Vue 应用实例
 * @param {Object} globalState - 全局状态
 * @param {Function} connectFn - 连接函数
 */
export function createPWAAdapter(vueApp, globalState, connectFn) {
  // 保存引用供 PWA 管理器使用
  window.$root = vueApp;
  window.$globalState = globalState;
  
  // 提供 connect 方法给 PWA 管理器
  if (typeof connectFn === 'function') {
    window.$root.connect = connectFn;
  }
  
  // 创建强制更新方法（模拟 Vue2 的 $forceUpdate）
  window.$root.$forceUpdate = () => {
    // 在 Vue3 中，我们可以通过触发一个无用的响应式操作来强制更新
    // 或者简单地触发路由更新
    if (vueApp._instance && vueApp._.instance.proxy) {
      // 触发一个无用的响应式更新
      vueApp._instance.proxy.$forceUpdate && vueApp._instance.proxy.$forceUpdate();
    }
  };
  
  console.log('[PWA-Adapter] Vue3 适配器已初始化');
  
  // 提供获取 WebSocket 实例的方法
  window.$root.getWebSocket = () => {
    return globalState.websocket;
  };
  
  // 提供设置连接状态的方法
  window.$root.setConnectionState = (connected, connecting = false) => {
    globalState.connected = connected;
    globalState.websocketConnecting = connecting;
  };
  
  // 提供重置重试计数的方法
  window.$root.resetRetry = () => {
    globalState.retry = 0;
  };
}

/**
 * 启动 PWA 管理器
 * 这个函数会在 DOM 加载完成后被调用
 */
export function initPWAManager() {
  // 如果 PWA 管理器已经存在，先销毁
  if (window.pwaManager) {
    window.pwaManager.destroy();
    window.pwaManager = null;
  }
  
  // 等待 Vue 实例初始化完成
  const initPWA = () => {
    if (window.$root && window.$root.connect) {
      console.log('[PWA-Adapter] 开始初始化 PWA 管理器');
      
      // 手动触发 PWA 管理器的初始化
      if (typeof window.initializePWAManager === 'function') {
        window.initializePWAManager();
      } else {
        console.warn('[PWA-Adapter] PWA 管理器初始化函数未找到');
      }
    } else {
      // 延迟重试
      setTimeout(initPWA, 500);
    }
  };
  
  // 延迟 1 秒开始初始化（给 Vue 更多时间初始化）
  setTimeout(initPWA, 1000);
}

/**
 * 手动重连函数
 * 供外部调用
 */
export function triggerPWAReconnect() {
  if (window.pwaManager && window.$root && window.$root.connect) {
    console.log('[PWA-Adapter] 手动触发重连');
    window.$root.resetRetry();
    window.$root.setConnectionState(false, false);
    window.$root.connect();
  }
}

/**
 * 关闭 PWA 功能
 */
export function turnOffPWA() {
  if (window.turnOffPWA) {
    window.turnOffPWA();
  }
}

/**
 * 获取 PWA 调试信息
 */
export function getPWADebugInfo() {
  if (window.PWADebug) {
    return {
      enabled: window.PWADebug.enabled,
      history: window.PWADebug.getConnectionHistory()
    };
  }
  return null;
}