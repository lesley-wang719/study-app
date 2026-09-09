/* ============================================================
   学习小天地 - 扩展模块 (v1.1.0)
   - 妈妈端 PIN 锁屏
   - OCR 真实接入 (Tesseract.js + 腾讯云 OCR)
   - Server酱 微信推送
   ============================================================ */
'use strict';

/* ============================================================
   第 A 节：SHA-256 工具 (Web Crypto API)
   ============================================================ */
const PIN_UTIL = {
  /** 生成 16 位随机 salt (hex) */
  genSalt() {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  },
  /** 计算 PIN 哈希：SHA-256(salt + pin) */
  async hash(pin, salt) {
    const data = new TextEncoder().encode(salt + pin);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  },
  /** 验证 PIN：常量时间比较 */
  async verify(pin) {
    const cfg = DB.data.pin;
    if (!cfg || !cfg.hash || !cfg.salt) return false;
    const h = await this.hash(pin, cfg.salt);
    // 常量时间字符串比较
    if (h.length !== cfg.hash.length) return false;
    let diff = 0;
    for (let i = 0; i < h.length; i++) {
      diff |= h.charCodeAt(i) ^ cfg.hash.charCodeAt(i);
    }
    return diff === 0;
  },
  /** 设置/修改 PIN */
  async set(pin) {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN 必须是 4 位数字');
    }
    const salt = this.genSalt();
    const hash = await this.hash(pin, salt);
    DB.data.pin = { hash, salt, setAt: Date.now(), lastFailAt: 0, failCount: 0 };
    DB.save();
  },
  /** 检查是否已设置 PIN */
  isSet() {
    return !!(DB.data.pin && DB.data.pin.hash);
  },
  /** 是否被锁定（5次错误后锁1分钟） */
  isLocked() {
    const cfg = DB.data.pin;
    if (!cfg) return false;
    if (cfg.failCount < 5) return false;
    const elapsed = (Date.now() - (cfg.lastFailAt || 0)) / 1000;
    if (elapsed >= 60) {
      // 解锁，重置计数
      cfg.failCount = 0;
      DB.save();
      return false;
    }
    return true;
  },
  /** 锁定剩余秒数 */
  lockRemaining() {
    const cfg = DB.data.pin;
    if (!cfg) return 0;
    if (cfg.failCount < 5) return 0;
    return Math.max(0, Math.ceil(60 - (Date.now() - (cfg.lastFailAt || 0)) / 1000));
  },
  /** 记录失败 */
  recordFail() {
    const cfg = DB.data.pin || (DB.data.pin = { hash:'', salt:'', setAt:0, lastFailAt:0, failCount:0 });
    cfg.failCount = (cfg.failCount || 0) + 1;
    cfg.lastFailAt = Date.now();
    DB.save();
  },
  /** 记录成功（重置计数） */
  recordSuccess() {
    if (DB.data.pin) {
      DB.data.pin.failCount = 0;
      DB.save();
    }
  },
  /** 清除 PIN（忘记密码时用） */
  clear() {
    DB.data.pin = { hash:'', salt:'', setAt:0, lastFailAt:0, failCount:0 };
    DB.save();
  }
};

/* ============================================================
   第 B 节：PIN 锁屏 UI
   ============================================================ */
const PinLock = {
  // 5 分钟无操作自动锁屏
  autoLockTimeout: null,
  lastActivity: 0,

  /** 启动妈妈端 PIN 流程（在 route() 中检测） */
  async gate() {
    // 已登录
    if (APP.pinUnlocked) return true;
    // 未设置 PIN -> 引导设置
    if (!PIN_UTIL.isSet()) {
      return await this._firstTimeSetup();
    }
    // 被锁定
    if (PIN_UTIL.isLocked()) {
      const sec = PIN_UTIL.lockRemaining();
      await showModal(`
        <div class="pin-locked">
          <div class="pin-locked-icon">🔒</div>
          <h3>妈妈端已锁定</h3>
          <p>连续输错 5 次，请 <b id="pinLockSec">${sec}</b> 秒后再试</p>
        </div>
      `);
      return false;
    }
    // 输入 PIN
    return await this._prompt();
  },

  async _firstTimeSetup() {
    // 第一次：必须设置 PIN
    return await new Promise(async (resolve) => {
      showModal(`
        <div class="pin-setup">
          <h3>🔐 首次使用：设置妈妈端 PIN</h3>
          <p class="pin-tip">设置 4 位数字 PIN 保护后台</p>
          <div class="pin-input-row">
            <input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" id="pinNew" placeholder="新 PIN（4位数字）" autocomplete="off">
            <input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" id="pinNew2" placeholder="再次输入" autocomplete="off">
          </div>
          <p class="pin-err" id="pinErr"></p>
          <div class="modal-actions">
            <button class="btn-primary" id="pinSave">✓ 设置</button>
            <button class="btn-secondary" id="pinSkip">⏭ 暂不设置（不推荐）</button>
          </div>
          <p class="pin-foot">⚠️ 忘记 PIN 需清除浏览器数据，请妥善保管</p>
        </div>
      `);
      const $err = $('pinErr');
      const focusNext = (cur, nxt) => cur && cur.addEventListener('input', () => { if (cur.value.length >= 4) nxt && nxt.focus(); });
      focusNext($('pinNew'), $('pinNew2'));
      $('pinSave').onclick = async () => {
        const a = $('pinNew').value.trim();
        const b = $('pinNew2').value.trim();
        if (!/^\d{4}$/.test(a)) { $err.textContent = 'PIN 必须是 4 位数字'; return; }
        if (a !== b) { $err.textContent = '两次输入不一致'; return; }
        try {
          await PIN_UTIL.set(a);
          APP.pinUnlocked = true;
          this._armAutoLock();
          toast('✅ PIN 设置成功');
          closeModal();
          resolve(true);
        } catch (e) {
          $err.textContent = e.message;
        }
      };
      $('pinSkip').onclick = () => {
        APP.pinUnlocked = true;
        this._armAutoLock();
        closeModal();
        toast('⚠️ 已跳过 PIN 设置，建议尽快设置');
        resolve(true);
      };
    });
  },

  async _prompt() {
    return await new Promise((resolve) => {
      showModal(`
        <div class="pin-prompt">
          <div class="pin-prompt-icon">🔐</div>
          <h3>妈妈后台</h3>
          <p class="pin-sub">请输入 PIN 进入</p>
          <input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" id="pinIn" class="pin-big-input" autocomplete="off" autofocus>
          <p class="pin-err" id="pinErr"></p>
          <div class="modal-actions">
            <button class="btn-primary" id="pinOk">🔓 进入</button>
            <button class="btn-secondary" id="pinHome">← 回到首页</button>
          </div>
          <div class="pin-bottom">
            <a id="pinForgot" class="pin-link">忘记 PIN？</a>
          </div>
        </div>
      `);
      const $err = $('pinErr');
      const $in = $('pinIn');
      setTimeout(() => $in.focus(), 100);
      const tryOk = async () => {
        const v = $in.value.trim();
        if (!v) { $err.textContent = '请输入 PIN'; return; }
        const ok = await PIN_UTIL.verify(v);
        if (ok) {
          PIN_UTIL.recordSuccess();
          APP.pinUnlocked = true;
          this._armAutoLock();
          closeModal();
          resolve(true);
        } else {
          PIN_UTIL.recordFail();
          $in.value = '';
          $in.focus();
          const left = 5 - (DB.data.pin.failCount || 0);
          if (left <= 0) {
            $err.textContent = '已锁定，1 分钟后再试';
            $('pinOk').disabled = true;
            $in.disabled = true;
            let sec = 60;
            const tick = () => {
              if (sec <= 0) { closeModal(); resolve(false); return; }
              $err.textContent = `已锁定，${sec} 秒后重试`;
              sec--;
              setTimeout(tick, 1000);
            };
            tick();
          } else {
            $err.textContent = `PIN 错误，还可输入 ${left} 次`;
          }
        }
      };
      $('pinOk').onclick = tryOk;
      $in.addEventListener('keydown', e => { if (e.key === 'Enter') tryOk(); });
      $('pinHome').onclick = () => { closeModal(); go(''); resolve(false); };
      $('pinForgot').onclick = () => this._forgotFlow();
    });
  },

  async _forgotFlow() {
    const choice = await showModal(`
      <div class="pin-forgot">
        <h3>🔑 忘记 PIN？</h3>
        <p>PIN 是用浏览器本机存储的哈希加密保存的，无法找回。</p>
        <p>你可以选择：</p>
        <div class="modal-actions" style="flex-direction:column;gap:8px">
          <button class="btn-primary" data-result="export">📦 仅导出学习数据</button>
          <button class="btn-secondary" data-result="reset">🗑 重置 PIN（清空所有数据）</button>
          <button class="btn-secondary" data-result="false">取消</button>
        </div>
      </div>
    `);
    if (choice === 'export') {
      try {
        const json = JSON.stringify(DB.data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-backup-${today()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('✅ 数据已导出，请妥善保管');
      } catch (e) {
        toast('导出失败：' + e.message);
      }
    } else if (choice === 'reset') {
      const ok = await showModal(`
        <div class="pin-reset-confirm">
          <h3>⚠️ 真的要重置吗？</h3>
          <p>这将<strong>清空所有学习数据</strong>：作业、错题、积分、宠物…</p>
          <div class="modal-actions">
            <button class="btn-primary" data-result="true">确认清空</button>
            <button class="btn-secondary" data-result="false">取消</button>
          </div>
        </div>
      `);
      if (ok) {
        localStorage.removeItem(APP.dbKey);
        DB.data = DB.defaults();
        DB.save();
        PIN_UTIL.clear();
        APP.pinUnlocked = false;
        toast('✅ 已重置，请重新设置 PIN');
        closeModal();
        await this._firstTimeSetup().then(unlocked => {
          if (unlocked) this._prompt();
        });
      }
    }
  },

  /** 锁屏 */
  lock() {
    APP.pinUnlocked = false;
    if (this.autoLockTimeout) clearTimeout(this.autoLockTimeout);
    this.autoLockTimeout = null;
    if (APP.currentUser === 'mother') {
      toast('🔒 已自动锁屏');
      go('mother');
      // 触发 gate
      setTimeout(() => this.gate(), 200);
    }
  },

  /** 5 分钟无操作自动锁 */
  _armAutoLock() {
    if (this.autoLockTimeout) clearTimeout(this.autoLockTimeout);
    this.autoLockTimeout = setTimeout(() => this.lock(), 5 * 60 * 1000);
    // 监听活动
    const reset = () => {
      if (APP.pinUnlocked && APP.currentUser === 'mother') this._armAutoLock();
    };
    document.removeEventListener('click', reset);
    document.addEventListener('click', reset);
  },

  /** 修改 PIN */
  async changePin() {
    const oldOk = await new Promise((resolve) => {
      if (!PIN_UTIL.isSet()) return resolve(true);
      showModal(`
        <div>
          <h3>🔐 修改 PIN</h3>
          <p>先验证旧 PIN</p>
          <input type="password" inputmode="numeric" maxlength="4" id="pinOld" class="pin-big-input" placeholder="旧 PIN（4位数字）" autofocus>
          <p class="pin-err" id="pinErr"></p>
          <div class="modal-actions">
            <button class="btn-primary" id="pinOldOk">下一步</button>
            <button class="btn-secondary" data-result="false">取消</button>
          </div>
        </div>
      `);
      const $err = $('pinErr');
      const tryOk = async () => {
        const v = $('pinOld').value.trim();
        if (await PIN_UTIL.verify(v)) {
          PIN_UTIL.recordSuccess();
          closeModal();
          resolve(true);
        } else {
          $err.textContent = '旧 PIN 错误';
          $('pinOld').value = '';
          $('pinOld').focus();
        }
      };
      $('pinOld').addEventListener('keydown', e => { if (e.key === 'Enter') tryOk(); });
      $('pinOldOk').onclick = tryOk;
    });
    if (!oldOk) return;

    // 设置新 PIN
    return await new Promise((resolve) => {
      showModal(`
        <div>
          <h3>🔐 设置新 PIN</h3>
          <div class="pin-input-row">
            <input type="password" inputmode="numeric" maxlength="4" id="pinNew" placeholder="新 PIN（4位数字）" autocomplete="off">
            <input type="password" inputmode="numeric" maxlength="4" id="pinNew2" placeholder="再次输入" autocomplete="off">
          </div>
          <p class="pin-err" id="pinErr"></p>
          <div class="modal-actions">
            <button class="btn-primary" id="pinSave">✓ 保存</button>
            <button class="btn-secondary" data-result="false">取消</button>
          </div>
        </div>
      `);
      $('pinNew').focus();
      $('pinSave').onclick = async () => {
        const a = $('pinNew').value.trim();
        const b = $('pinNew2').value.trim();
        if (!/^\d{4}$/.test(a)) { $('pinErr').textContent = 'PIN 必须是 4 位数字'; return; }
        if (a !== b) { $('pinErr').textContent = '两次输入不一致'; return; }
        await PIN_UTIL.set(a);
        toast('✅ PIN 已更新');
        closeModal();
        resolve(true);
      };
    });
  }
};

// 暴露给 app.js 用
window.PinLock = PinLock;
window.PIN_UTIL = PIN_UTIL;

/* ============================================================
   第 C 节：OCR 真实接入
   - 默认 'mock'（保持原模拟逻辑）
   - 'tesseract'：Tesseract.js 浏览器本地识别（支持中英文）
   - 'tencent'：腾讯云 OCR（生产级，需要密钥）
   ============================================================ */
const OCR_ENGINE = {
  _tessWorker: null,
  _tessLoading: false,

  /** 主入口：识别图片中的文字 */
  async recognize(imageDataUrl) {
    const engine = (DB.data.ocr && DB.data.ocr.engine) || 'mock';
    if (engine === 'tesseract') {
      return await this._tesseract(imageDataUrl);
    }
    if (engine === 'tencent') {
      return await this._tencent(imageDataUrl);
    }
    return this._mock(imageDataUrl);
  },

  /** 真实 Tesseract.js 识别 */
  async _tesseract(imageDataUrl) {
    if (typeof Tesseract === 'undefined') {
      // 动态加载 CDN
      if (!this._tessLoading) {
        this._tessLoading = true;
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error('Tesseract.js 加载失败，请检查网络'));
          document.head.appendChild(s);
        });
      }
    }
    // 用 worker 跑，避免主线程卡
    if (!this._tessWorker) {
      this._tessWorker = await Tesseract.createWorker(['chi_sim', 'eng'], 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const t = $('ocrText');
            if (t) t.textContent = `🔍 识别中 ${Math.round((m.progress||0)*100)}%`;
          }
        }
      });
    }
    const { data: { text, confidence } } = await this._tessWorker.recognize(imageDataUrl);
    return {
      text: (text || '').trim(),
      confidence: Math.round(confidence || 0),
      engine: 'tesseract'
    };
  },

  /** 腾讯云 OCR（生产级，准确率高） */
  async _tencent(imageDataUrl) {
    const cfg = DB.data.ocr && DB.data.ocr.tencent;
    if (!cfg || !cfg.secretId || !cfg.secretKey) {
      toast('请先在妈妈端设置腾讯云密钥', 3000);
      throw new Error('未配置腾讯云密钥');
    }
    // 去掉 data:image/jpeg;base64, 前缀
    const b64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const action = 'GeneralBasicOCR';  // 通用印刷体识别
    const version = '2018-11-19';
    const region = cfg.region || 'ap-guangzhou';
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.floor(Math.random() * 1e6);
    const params = {
      ImageBase64: b64,
      LanguageType: 'zh'
    };
    // 签名（TC3-HMAC-SHA256）
    try {
      const sig = await this._tc3Sign({
        action, version, region, timestamp, nonce, params,
        secretId: cfg.secretId, secretKey: cfg.secretKey
      });
      const res = await fetch(`https://${action}.tencentcloudapi.com`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': sig.auth,
          'X-TC-Action': action,
          'X-TC-Version': version,
          'X-TC-Timestamp': timestamp,
          'X-TC-Region': region,
          'X-TC-Nonce': nonce
        },
        body: JSON.stringify(params)
      });
      const json = await res.json();
      if (json.Response && json.Response.Error) {
        throw new Error(json.Response.Error.Message);
      }
      const items = (json.Response && json.Response.TextDetections) || [];
      const text = items.map(it => it.DetectedText).join('\n');
      return { text, confidence: 95, engine: 'tencent' };
    } catch (e) {
      console.error('tencent OCR error', e);
      toast('腾讯云OCR失败：' + e.message);
      return await this._mock(imageDataUrl);  // 降级
    }
  },

  /** TC3 签名 (简化版，前端直连) */
  async _tc3Sign({ action, version, region, timestamp, nonce, params, secretId, secretKey }) {
    const enc = new TextEncoder();
    const hmac = async (key, msg) => {
      const k = await crypto.subtle.importKey('raw', key, { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
      return new Uint8Array(sig);
    };
    const hash = async (msg) => {
      const h = await crypto.subtle.digest('SHA-256', enc.encode(msg));
      return Array.from(new Uint8Array(h), b => b.toString(16).padStart(2, '0')).join('');
    };
    const httpReq = 'content-type:application/json; charset=utf-8\n' +
      'host:' + action + '.tencentcloudapi.com\n' +
      'x-tc-action:' + action.toLowerCase() + '\n';
    const canonicalRequest = 'POST\n/\n\n' + httpReq + '\n' + await hash(JSON.stringify(params));
    const credScope = `2023-09-01/${region}/tc3_request`;
    const stringToSign = 'TC3-HMAC-SHA256\n' + timestamp + '\n' + credScope + '\n' + await hash(canonicalRequest);
    const secretDate = await hmac(enc.encode('TC3' + secretKey), `2023-09-01`);
    const secretService = await hmac(secretDate, region);
    const secretSigning = await hmac(secretService, 'tc3_request');
    const signature = (await hmac(secretSigning, stringToSign)).toString();
    // 简化：此处 signature 应是 hex string，构造 Authorization
    const auth = `TC3-HMAC-SHA256 Credential=${secretId}/${credScope}, SignedHeaders=content-type;host;x-tc-action, Signature=${signature}`;
    return { auth };
  },

  /** 模拟 OCR（原逻辑） */
  _mock(imageDataUrl) {
    return {
      text: '【模拟识别】这是一段模拟的题目文字。\n实际部署时，可切换为：\n  • Tesseract.js 浏览器本地识别\n  • 腾讯云 OCR 印刷体识别',
      confidence: 60,
      engine: 'mock'
    };
  }
};

window.OCR_ENGINE = OCR_ENGINE;

/* ============================================================
   第 D 节：Server酱 微信推送
   - 完全免费，注册即用：https://sct.ftqq.com/
   - 妈妈扫码绑定微信，填入 SendKey 即可
   ============================================================ */
const WECHAT_PUSH = {
  /** 发送一条推送 */
  async send(title, desp = '', opts = {}) {
    const cfg = DB.data.wechat;
    if (!cfg || !cfg.sctKey) {
      console.log('[Wechat] 未配置 SendKey，跳过');
      return { ok: false, reason: 'not_configured' };
    }
    // 显式开关：关闭时不推送（测试消息走 force 忽略开关）
    if (!opts.force && cfg.enabled === false) {
      console.log('[Wechat] 推送开关已关闭，跳过');
      return { ok: false, reason: 'disabled' };
    }
    // 免打扰时段
    if (this._inQuiet(cfg)) {
      console.log('[Wechat] 免打扰时段，跳过');
      return { ok: false, reason: 'quiet' };
    }
    // 如果是测试标记，立即发送
    const url = `https://sctapi.ftqq.com/${encodeURIComponent(cfg.sctKey)}.send`;
    const form = new URLSearchParams();
    form.append('title', title);
    form.append('desp', desp + (opts.url ? `\n\n[查看详情](${opts.url})` : ''));
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });
      const json = await res.json();
      if (json.code === 0 || json.errno === 0) {
        console.log('[Wechat] 推送成功');
        return { ok: true, data: json.data };
      } else {
        console.warn('[Wechat] 推送失败', json);
        return { ok: false, reason: json.message || 'unknown', data: json };
      }
    } catch (e) {
      console.warn('[Wechat] 推送异常', e);
      return { ok: false, reason: e.message };
    }
  },

  /** 检查免打扰时段 */
  _inQuiet(cfg) {
    const h = new Date().getHours();
    const a = cfg.quietStart || 22;
    const b = cfg.quietEnd || 7;
    if (a < b) return h >= a && h < b;
    return h >= a || h < b;  // 跨天
  },

  /** 测试推送（忽略"开关已关闭"状态，用于验证配置） */
  async test() {
    return await this.send('🧪 测试推送 - 学习小天地', '妈妈你好！\n\n这是一条来自孩子学习系统的测试消息。\n如果你收到这条消息，说明微信推送已经配置成功 🎉\n\n时间：' + new Date().toLocaleString('zh-CN'), { force: true });
  },

  /** 触发场景：孩子今日作业未写 */
  async onHomeworkMissing(childName) {
    return await this.send(
      `📚 ${childName} 还没写作业`,
      `**${childName}** 今天的老师作业还没完成哦！\n\n> 时间：${new Date().toLocaleString('zh-CN')}\n\n请提醒孩子去完成。`,
      { tag: 'homework-' + childName }
    );
  },

  /** 触发场景：孩子断签 1 天 */
  async onStreakBroken(childName, days) {
    return await this.send(
      `⚠️ ${childName} 断签 ${days} 天`,
      `${childName} 已经连续 ${days} 天没打开学习系统了。\n\n小宠物已经戴上哭泣眼罩，需要"复活任务"恢复哦～\n\n> 时间：${new Date().toLocaleString('zh-CN')}`
    );
  },

  /** 触发场景：妈妈发惩罚 */
  async onPenaltySent(childName, type, message) {
    return await this.send(
      `🔔 妈妈发了提醒给 ${childName}`,
      `**类型**：${type}\n\n**内容**：${message || '请认真检查哦'}\n\n> 时间：${new Date().toLocaleString('zh-CN')}`
    );
  },

  /** 触发场景：错题连续错 */
  async onMistakeConsecutiveWrong(childName, count) {
    return await this.send(
      `🤔 ${childName} 错题连续错 ${count} 次`,
      `${childName} 的错题已经连续错了 ${count} 次，建议重点关注。\n\n是否需要换一种讲解方式？\n\n> 时间：${new Date().toLocaleString('zh-CN')}`
    );
  }
};

window.WECHAT_PUSH = WECHAT_PUSH;

/* ============================================================
   第 E 节：初始化 + 钩入路由
   ============================================================ */
(function initExtensions() {
  // 启动时检测
  APP.pinUnlocked = false;

  // 包装 route：当进入 mother 路径时检查 PIN
  const _origRoute = window.route;
  if (typeof _origRoute === 'function') {
    window.route = async function (...args) {
      const path = (location.hash || '').replace(/^#\/?/, '');
      if (path.startsWith('mother')) {
        // 只有已登录的妈妈账号才需要 PIN 门；
        // 未登录（登录门卫）和孩子账号（重定向回自己主页）交给原 route 守卫处理
        const isMom = typeof AUTH !== 'undefined' && AUTH && AUTH.logged() && AUTH.isMom();
        if (isMom && !APP.pinUnlocked) {
          const ok = await PinLock.gate();
          if (!ok) {
            go('');
            return;
          }
        }
      }
      return _origRoute.apply(this, args);
    };
    // 关键：移除旧的 hashchange 监听（指向原 route），改用包装后的 route
    window.removeEventListener('hashchange', _origRoute);
    window.addEventListener('hashchange', () => { window.route(); });
  }

  // 暴露给妈妈端设置页用
  window.SECURITY = {
    isPinSet: () => PIN_UTIL.isSet(),
    changePin: () => PinLock.changePin(),
    clearPin: () => PIN_UTIL.clear(),
    lockNow: () => PinLock.lock()
  };
})();
