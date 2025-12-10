/**
 * 🚀 iOS PWA WebSocket 连接管理器 V9 最小锁版
 * 目标：只保留「改数据 + 一帧重排」路径，其余全部砍掉，避免 iOS 冻结干扰。
 * 用法：直接覆盖旧文件，无需改任何业务代码。
 */

/* ====== 全局锁 & 常量 ====== */
let isInitializing = false;
const MAX_WAIT = 10_000;
const start = performance.now();

/* ====== PWAConnectionManager ====== */
class PWAConnectionManager {
  constructor(reconnectCallback) {
    this.isOnline = navigator.onLine;
    this.lastVisibilityState = document.visibilityState;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.isPWA = false;
    this.isDestroyed = false;
    this.reconnectCallback = reconnectCallback;

    // 事件绑定
    this.boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.boundHandleOnlineStatusChange = this.handleOnlineStatusChange.bind(this);
    this.boundHandleFocus = this.handleFocus.bind(this);
    this.boundHandleBlur = this.handleBlur.bind(this);
    this.boundHandleAppInstalled = this.handleAppInstalled.bind(this);
    this.boundHandlePWAResume = this.handlePWAResume.bind(this);
    this.boundHandlePageHide = this.handlePageHide.bind(this);

    // 去抖重连
    this.debouncedAttemptRecovery = this.debounce(
      this.attemptConnectionRecovery.bind(this),
      150
    );
  }

  /* ------- 静态工具 ------- */
  static getWebSocketStateText(state) {
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  static async isPWAMode() {
    try {
      await new Promise(resolve => setTimeout(resolve, 10));
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      return isIOS && isStandalone;
    } catch (e) {
      console.error('[PWA] isPWAMode 异常', e);
      return false;
    }
  }

  /* ------- 成员工具 ------- */
  debounce(func, wait) {
    const debounced = function(...args) {
      clearTimeout(debounced.timeout);
      debounced.timeout = setTimeout(() => {
        debounced.timeout = null;
        func(...args);
      }, wait);
    };
    debounced.clear = () => {
      clearTimeout(debounced.timeout);
      debounced.timeout = null;
    };
    debounced.timeout = null;
    return debounced;
  }

  async init() {
    if (typeof this.reconnectCallback !== 'function') {
      throw new Error('缺少重连回调');
    }
    if (localStorage.getItem('pwa-off') === '1') {
      console.log('[PWA] 被手动关闭，跳过初始化');
      return;
    }

    this.isPWA = await PWAConnectionManager.isPWAMode();
    console.log('[PWA] 初始化', { isIOS: this.isIOS, isPWA: this.isPWA });

    this.bindEvents();

    // 冷启动可见性检查（PWA 检测完成后）
    this.checkInitialVisibilityState();

    // 50 ms 微延时给 Vue 挂载
    if (this.isIOS && this.isPWA) {
      setTimeout(() => this.debouncedAttemptRecovery('Init_ForceCheck'), 50);
    }

    if (this.isIOS && this.isPWA && !localStorage.getItem('pwa-debug')) {
      localStorage.setItem('pwa-debug', 'true');
      console.log('[PWA] 自动开启调试模式');
    }

    // 只保留「监听 WebSocket → 立即改数据 + 一帧重排」
    this.listenToWebSocketState();
  }

  bindEvents() {
    document.addEventListener('visibilitychange', this.boundHandleVisibilityChange);
    window.addEventListener('online', this.boundHandleOnlineStatusChange);
    window.addEventListener('offline', this.boundHandleOnlineStatusChange);
    window.addEventListener('focus', this.boundHandleFocus);
    window.addEventListener('blur', this.boundHandleBlur);
    window.addEventListener('appinstalled', this.boundHandleAppInstalled);
    window.addEventListener('pwa-resume', this.boundHandlePWAResume);
    window.addEventListener('pagehide', this.boundHandlePageHide);
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.visibilityTimer) {
      clearTimeout(this.visibilityTimer);
      this.visibilityTimer = null;
    }
    this.debouncedAttemptRecovery.clear();

    document.removeEventListener('visibilitychange', this.boundHandleVisibilityChange);
    window.removeEventListener('online', this.boundHandleOnlineStatusChange);
    window.removeEventListener('offline', this.boundHandleOnlineStatusChange);
    window.removeEventListener('focus', this.boundHandleFocus);
    window.removeEventListener('blur', this.boundHandleBlur);
    window.removeEventListener('appinstalled', this.boundHandleAppInstalled);
    window.removeEventListener('pwa-resume', this.boundHandlePWAResume);
    window.removeEventListener('pagehide', this.boundHandlePageHide);

    console.log('[PWA] 已销毁');
  }

  attemptConnectionRecovery(source = '未知') {
    if (this.isDestroyed || !this.isIOS || !this.isPWA) return;
    console.log(`[PWA] 去抖重连 [来源: ${source}]`);
    try {
      this.reconnectCallback();
    } catch (e) {
      console.error('[PWA] 重连回调执行失败', e);
    }
  }

  /* ------- 事件处理器 ------- */
  handleVisibilityChange() {
    const curr = document.visibilityState;
    if (this.lastVisibilityState === 'hidden' && curr === 'visible') {
      this.handlePageResume('VisibilityChange');
    }
    this.lastVisibilityState = curr;
  }

  checkInitialVisibilityState() {
    const currentState = document.visibilityState;
    const isInPWAEnvironment = this.isIOS && this.isPWA;
    if (currentState === 'visible' && isInPWAEnvironment) {
      this.handlePageResume('InitialVisible');
    }
    this.lastVisibilityState = currentState;
  }

  handleFocus() {
    if (this.isIOS && this.isPWA) this.debouncedAttemptRecovery('Focus');
  }

  handleBlur() {
    /* 仅日志，不重连 */
  }

  handlePageHide() {
    console.log('[PWA] pagehide → 进入后台，不触发重连');
  }

  handleOnlineStatusChange() {
    const curr = navigator.onLine;
    if (!this.isOnline && curr && this.isIOS && this.isPWA) {
      this.debouncedAttemptRecovery('NetworkOnline');
    }
    this.isOnline = curr;
  }

  handleAppInstalled() {
    this.isPWA = true;
  }

  handlePWAResume(event) {
    this.debouncedAttemptRecovery('CustomEvent:pwa-resume');
  }

  handlePageResume(source) {
    if (!this.isIOS || !this.isPWA) return;

    window.dispatchEvent(new CustomEvent('pwa-resume', {
      detail: { isIOS: this.isIOS, isPWA: this.isPWA, timestamp: Date.now(), source, needForceReload: true }
    }));

    this.debouncedAttemptRecovery('PageResume');
  }

  /* ====== 最小路径：只留「改数据 + 一帧重排」 ====== */
  listenToWebSocketState() {
    const check = () => {
      if (!window.$root?.websocket) { setTimeout(check, 500); return; }
      const ws = window.$root.websocket;

      ws.addEventListener('open', () => {
        // ① 立即改 Vue 数据
        window.$root.connected = true;
        window.$root.websocketConnecting = false;
        window.$root.$forceUpdate?.();

        // ② 一帧重排（物理唤醒）
        requestAnimationFrame(() => {
          document.body.style.display = 'none';
          document.body.offsetHeight;
          document.body.style.display = '';
          console.log('[PWA] 数据+重排完成');
        });
      });

      ws.addEventListener('close', () => {
        window.$root.connected = false;
        window.$root.$forceUpdate?.();
        console.log('[PWA] 断开完成');
      });
    };
    check();
  }
}

/* ====== 调试工具（精简版） ====== */
class PWADebug {
  constructor() {
    this.enabled = localStorage.getItem('pwa-debug') === 'true';
    this.connectionHistory = [];
    this.maxHistory = 100;
    this.init();
  }
  init() {
    window.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.enabled = !this.enabled;
        console.log('[PWA-DEBUG]', this.enabled ? '已启用' : '已禁用');
      }
    });
  }
  log(...args) { if (this.enabled) console.log('[PWA-DEBUG]', ...args); }
  error(...args) { if (this.enabled) console.error('[PWA-DEBUG]', ...args); }
  logConnection(event, data) {
    this.connectionHistory.push({ timestamp: Date.now(), event, data });
    if (this.connectionHistory.length > this.maxHistory) this.connectionHistory.shift();
  }
  getConnectionHistory() { return this.connectionHistory.slice(-20); }
}

/* ====== 启动逻辑（精简版） ====== */
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('pwa-off') === '1') {
    console.log('[PWA] 手动关闭，跳过初始化');
    return;
  }

  const debug = new PWADebug();
  window.PWADebug = debug;

  window.addEventListener('pwa-resume', e => {
    debug.log('PWA恢复事件', e.detail);
    debug.logConnection('PWA_RESUME', e.detail);
  });
  window.addEventListener('online', () => debug.logConnection('NETWORK_ONLINE', {}));
  window.addEventListener('offline', () => debug.logConnection('NETWORK_OFFLINE', {}));

  console.log('[PWA] 系统已启动');

  window.getPWAManager = () => window.pwaManager;

  function initializePWAManager() {
    if (performance.now() - start > MAX_WAIT) {
      console.warn('[PWA] 等待 Vue 超时，放弃初始化');
      return;
    }
    if (isInitializing) return;
    if (window.pwaManager) {
      window.pwaManager.destroy();
      window.pwaManager = null;
    }
    if (!window.$root?.connect) {
      setTimeout(initializePWAManager, 500);
      return;
    }

    isInitializing = true;
    (async () => {
      try {
        const mgr = new PWAConnectionManager(() => {
          if (!window.$root?.connect) return;
          window.$root.retry = 0;
          window.$root.websocketConnecting = false;
          window.$root.connected = false;
          window.$root.connect();
        });
        await mgr.init();
        window.pwaManager = mgr;
        console.log('[PWA] 初始化完成');
      } catch (e) {
        console.error('[PWA] 初始化失败', e);
      } finally {
        isInitializing = false;
      }
    })();
  }

  setTimeout(initializePWAManager, 1000);
});

/* ====== 运行时逃生接口 ====== */
window.turnOffPWA = () => {
  localStorage.setItem('pwa-off', '1');
  window.pwaManager?.destroy();
  window.pwaManager = null;
  console.log('[PWA] 已手动关闭并销毁实例');
};

/* ====== 页面卸载兜底 ====== */
window.addEventListener('beforeunload', () => window.pwaManager?.destroy());