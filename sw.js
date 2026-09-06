/* ============================================
   学习小天地 - Service Worker
   实现离线缓存 + 后台同步 + 推送接收
   ============================================ */

const CACHE_VERSION = 'study-app-v1.4.0';
const STATIC_CACHE = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';

// 核心静态资源（必须缓存，否则离线完全不可用）
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 可选静态资源（缓存失败不影响使用）
const OPTIONAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

// ============ 安装：预缓存 ============
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching core assets');
      // 核心资源用 add() 一次失败整体失败
      return cache.addAll(CORE_ASSETS).catch(err => {
        console.warn('[SW] Some core assets failed to cache:', err);
        // 即使失败也继续，让可选资源能加载
        return Promise.all(
          CORE_ASSETS.map(url => cache.add(url).catch(e => console.warn('skip', url)))
        );
      });
    }).then(() => {
      // 强制立即激活新SW
      return self.skipWaiting();
    })
  );
});

// ============ 激活：清理旧缓存 ============
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      // 立即接管所有客户端
      return self.clients.claim();
    })
  );
});

// ============ fetch 拦截：缓存优先 / 网络回退 ============
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只处理 GET 请求
  if (req.method !== 'GET') return;

  // 云同步接口不缓存，永远走网络
  if (url.pathname.startsWith('/api/')) return;

  // 外部云存储（JSONBin 等）不缓存、不拦截，永远走网络
  if (/jsonbin\.io$/.test(url.hostname)) return;

  // 不处理浏览器扩展、chrome-extension 等
  if (!url.protocol.startsWith('http')) return;

  // 策略：缓存优先(离线可用)，网络回退(更新缓存)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // 命中缓存，后台异步更新
        const fetchPromise = fetch(req).then((networkRes) => {
          // 只缓存成功的响应
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(req, clone);
            });
          }
          return networkRes;
        }).catch(() => cached);
        return cached;
      }

      // 未命中缓存，走网络并缓存
      return fetch(req).then((networkRes) => {
        // 只缓存同源 + 成功的 GET 响应
        if (networkRes && networkRes.status === 200 && req.method === 'GET') {
          const clone = networkRes.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(req, clone);
          });
        }
        return networkRes;
      }).catch(() => {
        // 网络也失败，且是文档请求，返回离线兜底页
        if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
          return caches.match('./index.html');
        }
        // 其他资源彻底失败
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// ============ 接收主线程消息 ============
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => event.source.postMessage({ type: 'CACHE_CLEARED' }))
    );
  }
  if (data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
});

// ============ 推送接收（预留微信推送后端接口） ============
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: '学习提醒', body: event.data.text() };
  }
  const title = payload.title || '学习小天地';
  const options = {
    body: payload.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: payload.tag || 'study-reminder',
    data: payload.data || {},
    actions: payload.actions || [
      { action: 'open', title: '查看' },
      { action: 'close', title: '知道了' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ============ 通知点击 ============
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        for (const c of list) {
          if (c.url.includes(self.registration.scope)) {
            c.focus();
            return;
          }
        }
        return clients.openWindow(url);
      })
  );
});
