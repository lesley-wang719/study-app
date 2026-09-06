/* ============================================================
   云同步层 v1.4.0 —— 双模式
   ① 外部云存储模式（Cloudflare Pages / GitHub Pages 等纯静态部署）：
      由 cloud-config.js 提供 window.CLOUD_SYNC = { binUrl, masterKey }
      数据存 JSONBin 等云端 JSON 仓库，多设备自动同步
   ② 自建后端模式（PythonAnywhere 等）：
      自动探测 api/db 接口，探测成功 → 启用
   两种模式都探测/配置失败 → 保持本地模式（局域网/单机不受影响）
   同步策略：整体快照 + 最后保存优先（last-write-wins）
   ============================================================ */

const SYNC = {
  enabled: false,
  pushTimer: null,
  pulling: false,
  lastPushedStr: '',
  key: localStorage.getItem(APP.dbKey + '_apikey') || ''
};

/* ---- 外部云存储配置检测（未配置/还是占位符 → 不启用） ---- */
let EXT = null;
(function () {
  const c = window.CLOUD_SYNC;
  if (c && c.binUrl && c.masterKey && !/替换|xxx|你的/i.test(c.binUrl) && !/替换|xxx|你的/i.test(c.masterKey)) {
    EXT = c;
  }
})();

function _syncAuthHeaders() {
  const h = {};
  if (SYNC.key) h['X-Access-Key'] = SYNC.key;
  return h;
}

function _askApiKey() {
  const k = prompt('请输入访问密钥\n（与服务器 wsgi 配置里 STUDY_ACCESS_KEY 一致，未设置密钥则留空点取消）');
  if (k !== null) {
    SYNC.key = k.trim();
    localStorage.setItem(APP.dbKey + '_apikey', SYNC.key);
  }
}

function _localTs() {
  return (DB.data && DB.data._sync && DB.data._sync.updatedAt) || 0;
}

/* ---- 远端读写适配：外部云存储 或 自建 /api/db ---- */
async function _remoteGet() {
  if (EXT) {
    const res = await fetch(EXT.binUrl + '/latest?_=' + Date.now(), {
      headers: { 'X-Master-Key': EXT.masterKey, 'X-Bin-Meta': 'false' }
    });
    if (res.status === 401 || res.status === 403) throw new Error('KEY');
    if (res.status === 404) return null;                 // Bin 还没有数据
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let rec = await res.json();
    if (rec && rec.record) rec = rec.record;             // 兼容带 metadata 的返回
    if (!rec || !rec._sync) return null;                 // 空库
    return { data: rec, updatedAt: rec._sync.updatedAt || 0 };
  }
  const res = await fetch('api/db?_=' + Date.now(), { headers: _syncAuthHeaders() });
  if (res.status === 401) { _askApiKey(); return _remoteGet(); }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const doc = await res.json();
  return doc && doc.data ? doc : null;
}

async function _remotePut(dataStr) {
  if (EXT) {
    const res = await fetch(EXT.binUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': EXT.masterKey },
      body: dataStr
    });
    if (res.status === 401 || res.status === 403) throw new Error('KEY');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return;
  }
  const res = await fetch('api/db', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, _syncAuthHeaders()),
    body: dataStr
  });
  if (res.status === 401) throw new Error('KEY');
}

/* ---- 包装 DB.save：记录时间戳 + 触发推送 ---- */
(function () {
  const _origSave = DB.save.bind(DB);
  DB.save = function () {
    try {
      if (!DB.data._sync) DB.data._sync = {};
      DB.data._sync.updatedAt = Date.now();
    } catch (e) { /* data 未初始化时忽略 */ }
    _origSave();
    if (SYNC.enabled) _schedulePush();
  };
})();

function _schedulePush() {
  clearTimeout(SYNC.pushTimer);
  SYNC.pushTimer = setTimeout(_pushNow, 2000);
}

async function _pushNow() {
  if (!SYNC.enabled) return;
  try {
    SYNC.lastPushedStr = JSON.stringify(DB.data);
    await _remotePut(SYNC.lastPushedStr);
  } catch (e) {
    if (e.message === 'KEY') {
      if (!EXT) _askApiKey();
      else toast('⚠️ 云存储密钥不对，请检查 cloud-config.js', 3000);
      return;
    }
    setTimeout(_pushNow, 15000);   // 离线：稍后重试
  }
}

/* ---- 拉取远端数据，远端更新时覆盖本地并刷新界面 ---- */
async function _pullLoop(silent) {
  if (!SYNC.enabled || SYNC.pulling) return;
  SYNC.pulling = true;
  try {
    const doc = await _remoteGet();
    if (!doc || !doc.data) return;
    if ((doc.updatedAt || 0) <= _localTs()) return;      // 远端不比本地新
    const remoteStr = JSON.stringify(doc.data);
    const localStr = JSON.stringify(DB.data);
    if (remoteStr === localStr) return;                   // 内容相同
    const modal = document.getElementById('modal');
    const modalOpen = modal && !modal.classList.contains('hidden');
    DB.data = doc.data;
    try { localStorage.setItem(APP.dbKey, JSON.stringify(DB.data)); } catch (e) {}
    if (modalOpen) {
      toast('☁️ 收到其他设备的新数据，关闭弹窗后自动刷新', 2500);
    } else {
      route();   // 用新数据重绘当前页面
      if (!silent) toast('☁️ 已同步最新数据', 1500);
    }
  } catch (e) { /* 网络异常，下次再试 */ }
  finally { SYNC.pulling = false; }
}

/* ---- 启动 ---- */
async function syncInit() {
  try {
    if (EXT) {
      /* 外部云存储：无需探测，直接启用 */
      SYNC.enabled = true;
      const doc = await _remoteGet();
      if (doc && doc.data) {
        if ((doc.updatedAt || 0) > _localTs()) {
          DB.data = doc.data;                       // 云端数据较新 → 采用
          try { localStorage.setItem(APP.dbKey, JSON.stringify(DB.data)); } catch (e) {}
        } else {
          _schedulePush();                          // 本地较新 → 推上云端
        }
      } else {
        _schedulePush();                            // 云端为空 → 首次上传本地数据
      }
      _syncStarted();
      return;
    }
    /* 自建后端：探测 api/db */
    const res = await fetch('api/db?_=' + Date.now(), { headers: _syncAuthHeaders() });
    if (res.status === 401) { _askApiKey(); return syncInit(); }
    if (!res.ok) { console.log('[Sync] 未检测到云端接口，保持本地模式'); return; }
    const doc = await res.json();
    SYNC.enabled = true;
    if (doc && doc.data) {
      if ((doc.updatedAt || 0) > _localTs()) {
        DB.data = doc.data;                       // 云端数据较新 → 采用
        try { localStorage.setItem(APP.dbKey, JSON.stringify(DB.data)); } catch (e) {}
      } else {
        _schedulePush();                          // 本地较新 → 推上云端
      }
    } else {
      _schedulePush();                            // 云端为空 → 首次上传本地数据
    }
    _syncStarted();
  } catch (e) {
    console.log('[Sync] 云端探测失败，本地模式：', e.message);
  }
}

function _syncStarted() {
  route();                                      // 重新渲染
  toast('☁️ 已连接云端，多设备数据同步中', 2000);
  // 外部云存储有免费额度限制 → 3分钟轮询；自建后端无限制 → 30秒
  setInterval(_pullLoop, EXT ? 180000 : 30000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) _pullLoop(true);
  });
  console.log('[Sync] 云端同步已开启');
}

/* app.js 的 DOMContentLoaded 已完成本地渲染，这里在其后执行 */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(syncInit, 100);
});
