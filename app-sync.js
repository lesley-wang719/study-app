/* ============================================================
   云同步层 v1.6.0 —— 双模式 + 按条目合并
   ① 外部云存储模式（GitHub Pages / Cloudflare Pages 等纯静态部署）：
      云端配置来源（按优先级）：
        a) 应用内配置：DB.data._syncConfig（妈妈后台 → 系统设置 → 多设备同步 填写）
        b) cloud-config.js 的 window.CLOUD_SYNC = { binUrl, masterKey }
      数据存 JSONBin 等云端 JSON 仓库，多设备自动同步
   ② 自建后端模式（PythonAnywhere / 局域网服务器）：
      自动探测 api/db 接口，探测成功 → 启用
   ③ 两种模式都未配置/连接失败 → 保持本地模式（单机不受影响）
   同步策略（v1.6 起）：
     每个顶层数据键带独立时间戳（_sync.keys），拉取/推送都按"键"合并，
     妈妈保存的计划配置不会被孩子设备上传的旧快照覆盖；
     兼容旧版"整体快照"数据（无 _sync.keys → 自动按整体比较并升级）
   对外接口（供 app.js / 妈妈后台 UI 使用）：
     SYNC.info()       → { connected, state, mode, lastSyncAt, lastError, syncInterval }
     SYNC.cloudHint()  → { level:'ok'|'warn'|'err', text }  给界面显示的状态文案
     SYNC.syncNow()    → 手动"立即同步"（先拉后推）
     SYNC.setCloud(binIdOrUrl, masterKey, accessKey) → 应用内配置并重连
     SYNC.restart()    → 用当前配置重新连接
     SYNC.clearCloud() → 清除应用内配置，退回本地模式
   ============================================================ */

const SYNC = {
  enabled: false,
  state: 'off',          // 'off' | 'on' | 'keyerror' | 'error'
  mode: 'local',         // 'local' | 'jsonbin' | 'api'
  pushTimer: null,
  pulling: false,
  lastPushedStr: '',
  lastSyncAt: 0,
  lastError: '',
  base: null,            // 最近一次同步后的顶层键快照（判断本机改动）
  _intv: null,
  _vis: null,
  key: localStorage.getItem(APP.dbKey + '_apikey') || ''
};

/* ---- 云端配置检测 ---- */
let EXT = null;          // 已通过校验的 jsonbin 配置
(function () {
  EXT = _pickConfig();
})();

function _normBin(u) { return String(u || '').trim().replace(/\/+$/, ''); }
function _binUrlFromId(id) {
  const s = String(id || '').trim();
  if (!s) return '';
  const m = s.match(/api\.jsonbin\.io\/v3\/b\/([A-Za-z0-9_-]+)/);
  return 'https://api.jsonbin.io/v3/b/' + (m ? m[1] : s);
}
function _cfgValid(c) {
  if (!c) return false;
  const u = _normBin(c.binUrl || '');
  const keyOk = !!((c.masterKey || '').trim() || (c.accessKey || '').trim());
  if (!u || !keyOk) return false;
  if (!/^https:\/\/api\.jsonbin\.io\/v3\/b\/[A-Za-z0-9_-]{6,}$/.test(u)) return false;
  if (/替换|xxx|你的|请填|example|测试值/i.test((c.binUrl || '') + ' ' + (c.masterKey || '') + ' ' + (c.accessKey || ''))) return false;
  return true;
}
function _pickConfig() {
  // 1) 应用内配置（妈妈后台填写，存本机）优先
  try {
    const ovr = DB.data && DB.data._syncConfig;
    if (_cfgValid(ovr)) return { binUrl: _normBin(ovr.binUrl), masterKey: (ovr.masterKey || '').trim(), accessKey: (ovr.accessKey || '').trim() };
  } catch (e) {}
  // 2) cloud-config.js（部署时全局统一配置）
  const c = window.CLOUD_SYNC;
  if (_cfgValid(c)) return { binUrl: _normBin(c.binUrl), masterKey: (c.masterKey || '').trim(), accessKey: (c.accessKey || '').trim() };
  return null;
}

function _syncAuthHeaders() {
  const h = {};
  if (EXT) {
    if (EXT.masterKey) h['X-Master-Key'] = EXT.masterKey;
    if (EXT.accessKey) h['X-Access-Key'] = EXT.accessKey;
  }
  if (SYNC.key) h['X-Access-Key'] = SYNC.key;
  return h;
}

function _askApiKey() {
  const k = prompt('请输入访问密钥\n（与服务器配置的访问密钥一致，未设置密钥则留空）');
  if (k !== null) {
    SYNC.key = k.trim();
    localStorage.setItem(APP.dbKey + '_apikey', SYNC.key);
  }
}

function _localTs() {
  return (DB.data && DB.data._sync && DB.data._sync.updatedAt) || 0;
}

/* ---- 照片过大保护：推送失败时把图片内容替换为占位符再推 ---- */
const PHOTO_MARK = '__LPHOTO__';

function _stripPhotos(src) {
  const out = Array.isArray(src) ? [] : {};
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (typeof v === 'string' && v.indexOf('data:image') === 0) out[k] = PHOTO_MARK;
    else if (v && typeof v === 'object') out[k] = _stripPhotos(v);
    else out[k] = v;
  }
  return out;
}

/* 拉取远端时：占位符位置若本机有真实照片则用本地的（照片留本机、结构同步） */
function _rehydrate(remote, local) {
  if (remote === PHOTO_MARK) {
    return (typeof local === 'string' && local.indexOf('data:image') === 0) ? local : '';
  }
  if (remote && typeof remote === 'object') {
    const l = (local && typeof local === 'object') ? local : {};
    if (Array.isArray(remote)) {
      const out = [];
      for (let i = 0; i < remote.length; i++) out.push(_rehydrate(remote[i], l[i]));
      return out;
    }
    const out = {};
    for (const k of Object.keys(remote)) out[k] = _rehydrate(remote[k], l[k]);
    return out;
  }
  return remote;
}

/* ---- 远端读写适配：外部云存储 或 自建 /api/db ---- */
async function _remoteGet() {
  if (EXT) {
    const res = await fetch(EXT.binUrl + '/latest?_=' + Date.now(), {
      headers: Object.assign({ 'X-Bin-Meta': 'false' }, _syncAuthHeaders())
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
      headers: Object.assign({ 'Content-Type': 'application/json' }, _syncAuthHeaders()),
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

/* ============================================================
   按条目合并引擎
   ============================================================ */
const META_KEYS = ['_sync', '_syncConfig'];

function _dataKeys(doc) { return Object.keys(doc || {}).filter(k => !META_KEYS.includes(k)); }
function _clone(v) { return v === null || typeof v !== 'object' ? v : JSON.parse(JSON.stringify(v)); }
function _syncOf(doc) { return (doc && doc._sync) || null; }
function _upd(doc) { const s = _syncOf(doc); return (s && s.updatedAt) || 0; }
function _kmap(doc) { const s = _syncOf(doc); return (s && s.keys) || null; }
function _keyTs(k, doc) { const m = _kmap(doc); return (m && m[k]) || 0; }

/* 本机数据快照（顶层键 → 内容字符串） */
function _snapshot(doc) {
  const m = {};
  for (const k of _dataKeys(doc)) m[k] = JSON.stringify(doc[k]);
  return m;
}

/* 找出自上次同步以来真正改动过的键 → 生成时间戳推进表 */
function _dirtyBump(local) {
  const bump = {};
  if (!SYNC.base) {
    for (const k of _dataKeys(local)) bump[k] = Date.now();
    return bump;
  }
  const cur = _snapshot(local);
  for (const k in cur) {
    if (SYNC.base[k] === undefined || SYNC.base[k] !== cur[k]) bump[k] = Date.now();
  }
  return bump;
}

/* 逐键合并两份文档（时间戳大者胜；同刻冲突保留本机，下轮自动收敛） */
function _mergeDocs(local, remote, bump) {
  const all = new Set([..._dataKeys(local), ..._dataKeys(remote)]);
  const out = {}, outKeys = {};
  let changed = false;
  for (const k of all) {
    const hasL = Object.prototype.hasOwnProperty.call(local, k);
    const hasR = Object.prototype.hasOwnProperty.call(remote, k);
    if (!hasL) { out[k] = _clone(remote[k]); outKeys[k] = _keyTs(k, remote) || _upd(remote); changed = true; continue; }
    if (!hasR) { out[k] = _clone(local[k]); outKeys[k] = _keyTs(k, local) || _upd(local); continue; }
    let lt = _keyTs(k, local) || _upd(local);
    let rt = _keyTs(k, remote) || _upd(remote);
    if (bump && bump[k]) lt = Math.max(lt, bump[k]);
    let v, ts;
    const lStr = JSON.stringify(local[k]);
    const rStr = JSON.stringify(remote[k]);
    if (lt > rt) { v = local[k]; ts = lt; }
    else if (rt > lt) { v = remote[k]; ts = rt; }
    else if (lStr === rStr) { v = local[k]; ts = lt; }
    else { v = local[k]; ts = lt; }   // 同一毫秒两处都改了：保留本机，下轮再收敛
    out[k] = v;
    if (ts) outKeys[k] = Math.max(ts, outKeys[k] || 0);
    if (JSON.stringify(v) !== lStr) changed = true;
  }
  return { doc: out, keys: outKeys, changed };
}

function _syncMerge(local, remote, outKeys) {
  const s = { updatedAt: Math.max(_upd(local), _upd(remote), Date.now()) };
  s.keys = outKeys || {};
  const lp = _syncOf(local), rp = _syncOf(remote);
  if ((lp && lp.photosOmitted) || (rp && rp.photosOmitted)) s.photosOmitted = true;
  return s;
}

/* 构造"本机全量 + 升级/刷新版本表"的可推送文档（去掉内部配置键） */
function _sealForPut(local, bump) {
  const doc = _clone(local);
  delete doc._syncConfig;
  const s = doc._sync = Object.assign({}, _syncOf(local) || {});
  s.updatedAt = Math.max(_upd(local), Date.now());
  s.keys = Object.assign({}, _kmap(local) || {});
  if (!_kmap(local)) {                 // 旧格式升级：为所有键补时间戳
    for (const k of _dataKeys(local)) s.keys[k] = s.updatedAt;
  }
  for (const k in (bump || {})) s.keys[k] = Math.max(s.keys[k] || 0, bump[k]);
  return doc;
}

function _persistLocalSync(keys) {
  try {
    const s = DB.data._sync = Object.assign({}, _syncOf(DB.data) || {});
    s.keys = Object.assign({}, _kmap(DB.data) || {}, keys || {});
    localStorage.setItem(APP.dbKey, JSON.stringify(DB.data));
  } catch (e) {}
}

function _setCloudResult() {
  SYNC.lastSyncAt = Date.now();
  SYNC.state = 'on';
  SYNC.lastError = '';
}

/* 首页页脚：显示当前是“云端多端同步”还是“仅本机” */
function _updateFooter() {
  try {
    if (!document.getElementById) return;
    const el = document.getElementById('homeFooterNote');
    if (!el) return;
    if (SYNC.enabled && SYNC.state === 'on') el.textContent = 'v1.6 · ✅ 云端已连接，全家数据自动同步';
    else if (SYNC.state === 'keyerror') el.textContent = 'v1.6 · ⚠️ 云端密钥有误，请在「系统设置→多设备同步」修改';
    else if (SYNC.enabled) el.textContent = 'v1.6 · ☁️ 正在连接云端…';
    else el.textContent = 'v1.6 · 数据保存在本机（妈妈后台可开启多设备同步）';
  } catch (e) {}
}

/* 应用远端数据到本机（含逐键合并）；返回是否有变化 */
function _applyRemoteDoc(rd, silent) {
  const local = DB.data;
  const rk = _kmap(rd), lk = _kmap(local);
  const modal = document.getElementById('modal');
  const modalOpen = modal && !modal.classList.contains('hidden');
  let merged;
  if (lk && rk) {
    const m = _mergeDocs(local, rd, null);
    if (!m.changed) return false;
    merged = m.doc;
    merged._sync = _syncMerge(local, rd, m.keys);
  } else {
    // 旧格式：整体比较，远端新才采用
    if ((_upd(rd) || 0) <= _upd(local)) return false;
    merged = _clone(rd);
  }
  DB.data = _rehydrate(merged, local);
  try { localStorage.setItem(APP.dbKey, JSON.stringify(DB.data)); } catch (e) {}
  SYNC.base = _snapshot(DB.data);
  _setCloudResult();
  /* 智能刷新：绝不在用户正在编辑/进行流程时整页重建 */
  const cleanHash = (location.hash || '').replace(/^#\/?/, '');
  const momPage = cleanHash.indexOf('mother/') === 0;
  const planEditing = momPage && cleanHash.indexOf('/plans/') > 0 && !!_planDraft;
  const flowBusy = !!APP.flowActive || !!APP.recTimer;   // 孩子正在录音/做任务
  if (modalOpen) {
    toast('☁️ 收到其他设备的新数据，关闭弹窗后自动刷新', 2500);
  } else if (planEditing) {
    // 妈妈正在改计划（有未保存草稿）：只合并数据，不重建页面，避免丢焦点/被打断
    if (!silent) toast('☁️ 已收到新数据，不影响当前编辑，保存时会一并带上', 2000);
  } else if (flowBusy) {
    if (!silent) toast('☁️ 已收到其他设备的新数据', 1600);
  } else if (momPage && silent) {
    // 妈妈在后台浏览（非编辑）：自动轮询只静默合并，绝不打断翻看/滚动；切页或手动同步时自然刷新
  } else {
    route();
    if (!silent) toast('☁️ 已同步最新数据', 1500);
  }
  return true;
}

/* ============================================================
   推送
   ============================================================ */
async function _pushNow() {
  if (!SYNC.enabled) return;
  try {
    const outcome = await _pushCore();
    if (outcome === 'pushed') SYNC.lastPushedStr = JSON.stringify(DB.data);
  } catch (e) {
    if (e && e.message === 'KEY') { _handleKeyError(); return; }
    // 数据可能过大（照片太多）→ 去掉照片内容再推一次（照片保留在各设备本地）
    try {
      const stripped = _stripPhotos(DB.data);
      delete stripped._syncConfig;
      if (!stripped._sync) stripped._sync = {};
      stripped._sync.photosOmitted = true;
      await _remotePut(JSON.stringify(stripped));
      console.log('[Sync] 照片过大，本次已同步文字数据（照片保留本机）');
    } catch (e2) { setTimeout(_pushNow, 15000); }   // 离线：稍后重试
  }
}

async function _pushCore() {
  const local = DB.data;
  const bump = _dirtyBump(local);
  let remote = null;
  try { remote = await _remoteGet(); }
  catch (e) { if (e && e.message === 'KEY') throw new Error('KEY'); throw e; }

  if (!remote || !remote.data) {
    // 云端为空 → 首次上传本机数据
    const doc = _sealForPut(local, bump);
    await _remotePut(JSON.stringify(doc));
    SYNC.base = _snapshot(local);
    _setCloudResult();
    return 'pushed';
  }

  const rd = remote.data;
  const lk = _kmap(local), rk = _kmap(rd);
  if (lk && rk) {
    // 双方都是新版（有版本表）→ 逐键合并后推送
    const m = _mergeDocs(local, rd, bump);
    if (!m.changed) return 'noop';          // 云端已含本机最新内容
    const doc = m.doc;
    delete doc._syncConfig;
    doc._sync = _syncMerge(local, rd, m.keys);
    await _remotePut(JSON.stringify(doc));
    _persistLocalSync(m.keys);
    SYNC.base = _snapshot(local);
    _setCloudResult();
    return 'pushed';
  }

  // 混合/旧格式：整体快照比较
  if ((remote.updatedAt || 0) > _upd(local)) {
    // 远端比本机新且无法逐键合并 → 采用远端，不覆盖
    _applyRemoteDoc(rd, true);
    SYNC.base = _snapshot(DB.data);
    return 'adopted';
  }
  const doc = _sealForPut(local, bump);
  await _remotePut(JSON.stringify(doc));
  SYNC.base = _snapshot(local);
  _setCloudResult();
  return 'pushed';
}

/* ============================================================
   拉取
   ============================================================ */
async function _pullLoop(silent) {
  if (!SYNC.enabled || SYNC.pulling) return;
  SYNC.pulling = true;
  try {
    const doc = await _remoteGet();
    if (doc && doc.data) _applyRemoteDoc(doc.data, !!silent);
  } catch (e) {
    if (e && e.message === 'KEY' && !EXT) _askApiKey();
    if (e && e.message === 'KEY' && EXT) { SYNC.state = 'keyerror'; SYNC.lastError = 'KEY'; }
    /* 网络异常等：下次再试 */
  } finally { SYNC.pulling = false; }
}

/* ============================================================
   密钥错误处理 / 启动
   ============================================================ */
function _handleKeyError() {
  const fromDb = !!(DB.data && DB.data._syncConfig && _cfgValid(DB.data._syncConfig));
  SYNC.enabled = false;
  SYNC.state = 'keyerror';
  SYNC.lastError = 'KEY';
  _updateFooter();
  toast(fromDb
    ? '⚠️ 云端密钥有误，已暂停同步。请到 妈妈后台 → 系统设置 → 多设备同步 里修改。'
    : '⚠️ 云端密钥不对，请检查站点配置（cloud-config.js）后刷新页面。', 4500);
}

async function syncInit() {
  try {
    EXT = _pickConfig();
    if (EXT) {
      SYNC.enabled = true;
      SYNC.mode = 'jsonbin';
      await _converge();
      if (SYNC.enabled && SYNC.state !== 'keyerror') _syncStarted();
      return;
    }
    /* 自建后端：探测 api/db */
    const res = await fetch('api/db?_=' + Date.now(), { headers: _syncAuthHeaders() });
    if (res.status === 401) { _askApiKey(); return syncInit(); }
    if (!res.ok) {
      SYNC.state = 'off'; SYNC.mode = 'local'; SYNC.lastError = 'NO_CLOUD';
      console.log('[Sync] 未检测到云端接口，保持本地模式');
      _updateFooter();
      return;
    }
    const doc = await res.json();
    SYNC.enabled = true;
    SYNC.mode = 'api';
    if (doc && doc.data) {
      const changed = _applyRemoteDoc(doc.data, true);
      if (!changed) _schedulePush();
    } else {
      _schedulePush();
    }
    _syncStarted();
  } catch (e) {
    SYNC.state = 'off'; SYNC.mode = 'local'; SYNC.lastError = (e && e.message) || 'ERR';
    console.log('[Sync] 云端探测失败，本地模式：', e && e.message);
    _updateFooter();
  }
}

async function _converge() {
  let doc = null;
  try { doc = await _remoteGet(); }
  catch (e) {
    if (e && e.message === 'KEY') { _handleKeyError(); return; }
    SYNC.state = 'error'; SYNC.lastError = (e && e.message) || 'ERR';
    return;   // 暂时连不上 → 本地先用，轮询会自动恢复
  }
  if (doc && doc.data) {
    const changed = _applyRemoteDoc(doc.data, true);
    if (!changed) await _pushNow();
  } else {
    await _pushNow();   // 云端为空 → 首次上传
  }
}

function _syncStarted() {
  if (SYNC._intv) clearInterval(SYNC._intv);
  if (SYNC._vis) document.removeEventListener('visibilitychange', SYNC._vis);
  _updateFooter();
  if (typeof route === 'function') route();               // 用最新数据重绘
  toast('☁️ 已连接云端，多设备数据同步中', 2000);
  // 外部云存储有免费额度限制 → 3分钟轮询；自建后端无限制 → 30秒
  SYNC._intv = setInterval(() => _pullLoop(true), EXT ? 180000 : 30000);
  SYNC._vis = () => { if (!document.hidden) _pullLoop(true); };
  document.addEventListener('visibilitychange', SYNC._vis);
  console.log('[Sync] 云端同步已开启', SYNC.mode);
}

/* ============================================================
   对外接口（妈妈后台 UI / 计划保存用）
   ============================================================ */
SYNC.info = function () {
  const connected = !!(SYNC.enabled && SYNC.state === 'on');
  return { connected, state: SYNC.state, mode: SYNC.mode, lastSyncAt: SYNC.lastSyncAt, lastError: SYNC.lastError, syncInterval: EXT ? 180000 : 30000 };
};

SYNC.cloudHint = function () {
  const hasCfg = _cfgValid((DB.data && DB.data._syncConfig) || window.CLOUD_SYNC);
  if (SYNC.enabled && SYNC.state === 'on') {
    return { level: 'ok', text: '已连接云端：保存后全家设备约 3 分钟内自动更新' };
  }
  if (SYNC.state === 'keyerror') {
    return { level: 'err', text: '云端密钥有误，同步已暂停，请到「系统设置 → 多设备同步」修改' };
  }
  if (SYNC.state === 'error') {
    return { level: 'err', text: '云端连接失败（' + SYNC.lastError + '），可点下方「立即同步」重试' };
  }
  if (SYNC.mode !== 'local') {
    return { level: 'warn', text: '正在连接云端…' };
  }
  if (hasCfg) {
    return { level: 'err', text: '已检测到云端配置但连接失败，请检查网络后在「系统设置」点“立即同步”' };
  }
  return { level: 'warn', text: '未连接云端：现在保存的设置只在本机生效，其他设备看不到。请先开启“多设备同步”。' };
};

SYNC.syncNow = async function () {
  if (!SYNC.enabled) return { ok: false, msg: '云端未连接', state: SYNC.state };
  try {
    await _pullLoop(true);
    await _pushNow();
    const ok = SYNC.state === 'on';
    return { ok, msg: ok ? 'ok' : SYNC.lastError || '同步失败', state: SYNC.state, at: SYNC.lastSyncAt };
  } catch (e) {
    return { ok: false, msg: (e && e.message) || '网络异常', state: SYNC.state };
  }
};

/* 应用内填写云端配置：binIdOrUrl 支持 纯BinID 或 jsonbin 完整地址 */
SYNC.setCloud = async function (binIdOrUrl, masterKey, accessKey) {
  const cfg = { binUrl: _binUrlFromId(binIdOrUrl), masterKey: String(masterKey || '').trim(), accessKey: String(accessKey || '').trim() };
  if (!_cfgValid(cfg)) return { ok: false, msg: 'Bin ID 或密钥格式不正确，请检查复制的内容' };
  try {
    if (!DB.data) return { ok: false, msg: '数据未初始化' };
    if (!DB.data._syncConfig) DB.data._syncConfig = {};
    DB.data._syncConfig.binUrl = cfg.binUrl;
    DB.data._syncConfig.masterKey = cfg.masterKey;
    DB.data._syncConfig.accessKey = cfg.accessKey;
    localStorage.setItem(APP.dbKey, JSON.stringify(DB.data));   // 直接持久化，不触发推送
  } catch (e) {
    return { ok: false, msg: '保存失败：' + e.message };
  }
  return SYNC.restart(cfg);
};

SYNC.restart = async function (cfg) {
  if (SYNC._intv) clearInterval(SYNC._intv);
  if (SYNC._vis) document.removeEventListener('visibilitychange', SYNC._vis);
  SYNC.enabled = false;
  SYNC.base = null;
  EXT = cfg || _pickConfig();
  if (!EXT) {
    SYNC.mode = 'local'; SYNC.state = 'off'; SYNC.lastError = '';
    _updateFooter();
    return { ok: false, msg: '未检测到有效云端配置', state: SYNC.state };
  }
  SYNC.mode = 'jsonbin';
  SYNC.enabled = true;
  SYNC.state = 'error';
  await _converge();
  if (SYNC.enabled && SYNC.state !== 'keyerror') _syncStarted();
  return { ok: SYNC.enabled && SYNC.state === 'on', state: SYNC.state, msg: SYNC.state === 'on' ? 'ok' : (SYNC.lastError || '连接失败') };
};

SYNC.clearCloud = async function () {
  try {
    if (DB.data) { delete DB.data._syncConfig; localStorage.setItem(APP.dbKey, JSON.stringify(DB.data)); }
  } catch (e) {}
  return SYNC.restart(null);
};

/* 推送刚保存的关键数据（妈妈保存计划后立即执行，减少等待） */
SYNC.pushNow = async function () {
  if (!SYNC.enabled) return { ok: false, msg: '云端未连接', state: SYNC.state };
  await _pushNow();
  return { ok: SYNC.state === 'on', state: SYNC.state, msg: SYNC.state === 'on' ? 'ok' : SYNC.lastError || '' };
};

/* app.js 的 DOMContentLoaded 已完成本地渲染，这里在其后执行 */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(syncInit, 100);
});
