/* ============================================================
   账号系统 v1.5
   - 每人独立账号密码，登录后各看各的页面
   - 妈妈为总账号：可看所有人数据 + 后台 + 增加孩子账号
   - 账号存在 DB.data.accounts，随云端同步到所有设备
   - 初始密码 1234，登录成功后自动升级为 SHA-256 哈希存储
   ============================================================ */

const AUTH = {
  sessKey: 'study_session_v1',

  logged() {
    const id = localStorage.getItem(this.sessKey);
    return !!(id && DB.data.accounts && DB.data.accounts.find(a => a.id === id));
  },
  current() {
    const id = localStorage.getItem(this.sessKey);
    return (DB.data.accounts || []).find(a => a.id === id) || null;
  },
  isMom() { const a = this.current(); return !!a && a.role === 'mom'; },
  ownChildId() { const a = this.current(); return a && a.role === 'child' ? a.childId : null; },

  goHome() {
    const a = this.current();
    if (a && a.role === 'mom') go('mother/home');
    else if (a && a.childId) go('child/' + a.childId);
    else this.showLogin();
  },

  /* 验证密码（passPlain 首次登录自动升级为哈希） */
  async verifyAcc(acc, pass) {
    if (!pass) return false;
    if (acc.passHash) {
      const h = await PIN_UTIL.hash(pass, acc.salt || '');
      return h === acc.passHash;
    }
    if ((acc.passPlain || '') === pass) {
      try {
        acc.salt = PIN_UTIL.genSalt();
        acc.passHash = await PIN_UTIL.hash(pass, acc.salt);
        delete acc.passPlain;
        DB.save();
      } catch (e) { /* 升级失败不影响登录 */ }
      return true;
    }
    return false;
  },

  async login(acc, pass) {
    const ok = await this.verifyAcc(acc, pass);
    if (!ok) return false;
    localStorage.setItem(this.sessKey, acc.id);
    this.hideLogin();
    try {
      if (acc.role === 'mom') { location.hash = 'mother/home'; }
      else if (acc.childId) { location.hash = 'child/' + acc.childId; }
    } catch (e) {}
    route();
    toast(`👋 欢迎，${acc.name}！`);
    return true;
  },

  logout() {
    if (!confirm('退出登录吗？')) return;
    localStorage.removeItem(this.sessKey);
    APP.currentUser = null;
    location.hash = '';
    route();
    toast('已退出登录');
  },

  /* ---- 登录页（全屏层） ---- */
  showLogin() {
    let layer = document.getElementById('loginLayer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'loginLayer';
      layer.className = 'login-layer';
      document.body.appendChild(layer);
    }
    const accs = DB.data.accounts || [];
    const kids = accs.filter(a => a.role === 'child');
    const mom = accs.find(a => a.role === 'mom');
    layer.innerHTML = `
      <div class="home-deco deco-1">☁️</div>
      <div class="home-deco deco-2">⭐</div>
      <div class="home-deco deco-3">🌈</div>
      <div class="login-box">
        <div class="login-logo">🌟</div>
        <h1 class="login-title">学习小天地</h1>
        <p class="login-sub">请选择账号登录</p>
        <div class="login-cards">
          ${kids.map(a => {
            const p = PROFILES[a.childId] || {};
            return `<div class="login-card" data-acc="${a.id}">
              <div class="login-avatar">${p.avatar || '🧑'}</div>
              <div class="login-name">${a.name || a.username}</div>
              <div class="login-grade">${p.grade || '孩子'}</div>
            </div>`;
          }).join('')}
          ${mom ? `<div class="login-card login-card-mom" data-acc="${mom.id}">
            <div class="login-avatar">👩‍🦰</div>
            <div class="login-name">${mom.name || '妈妈'}</div>
            <div class="login-grade">总账号</div>
          </div>` : ''}
        </div>
        <details class="login-manual">
          <summary>账号密码登录</summary>
          <input id="loginUser" class="text-input" placeholder="用户名" autocomplete="off">
          <input id="loginPass" class="text-input" type="password" placeholder="密码">
          <button class="btn-finish" id="loginBtn" style="background:linear-gradient(135deg,#FF8FB1,#FF4F8B);">登 录</button>
        </details>
        <p class="login-hint">初始密码 1234 · 妈妈后台「账户」里可修改</p>
      </div>
    `;
    layer.querySelectorAll('.login-card').forEach(card => {
      card.onclick = () => {
        const acc = accs.find(a => a.id === card.dataset.acc);
        if (acc) AUTH._askPass(acc);
      };
    });
    layer.querySelector('#loginBtn').onclick = async () => {
      const u = layer.querySelector('#loginUser').value.trim();
      const p = layer.querySelector('#loginPass').value;
      const acc = accs.find(a => a.username === u);
      if (!acc) return toast('账号不存在');
      if (!await AUTH.login(acc, p)) toast('密码不对，再试试');
    };
  },

  _askPass(acc) {
    showModal(`
      <h3>🔐 ${acc.name || acc.username} 的密码</h3>
      <input id="accPass" class="text-input" type="password" placeholder="请输入密码（初始 1234）" autocomplete="off">
      <div class="modal-actions">
        <button class="btn-primary" data-result="ok">登 录</button>
        <button class="btn-secondary" data-result="cancel">取消</button>
      </div>
    `).then(async (r) => {
      if (r !== 'ok') return;
      const v = $('#accPass') ? $('#accPass').value : '';
      if (!await AUTH.login(acc, v)) toast('密码不对，再试试');
    });
  },

  hideLogin() { const l = document.getElementById('loginLayer'); if (l) l.remove(); }
};
window.AUTH = AUTH;

/* ============================================================
   妈妈后台「账户」Tab
   ============================================================ */

/* 新孩子主题色盘（按顺序取未用的） */
const KID_PALETTES = [
  { color:'#9B59B6', colorSoft:'#F4ECF7', colorDeep:'#6C3483' },
  { color:'#27AE60', colorSoft:'#E9F7EF', colorDeep:'#186A3B' },
  { color:'#E67E22', colorSoft:'#FDF2E9', colorDeep:'#9C640C' },
  { color:'#16A085', colorSoft:'#E8F8F5', colorDeep:'#0E6655' },
  { color:'#C0392B', colorSoft:'#FDEDEC', colorDeep:'#7B241C' }
];

function renderMomAccounts(body) {
  const accs = DB.data.accounts || [];
  body.innerHTML = `
    <div class="section-card">
      <div class="section-title">👪 家庭账号</div>
      ${accs.map(a => {
        const p = a.role === 'child' ? (PROFILES[a.childId] || {}) : {};
        return `<div class="list-card">
          <div class="list-icon">${a.role === 'mom' ? '👩‍🦰' : (p.avatar || '🧑')}</div>
          <div class="list-body">
            <div class="list-title">${a.name}（${a.username}）</div>
            <div class="list-sub">${a.role === 'mom' ? '总账号 · 可看全部' : (p.grade || '孩子')}</div>
          </div>
          <button class="btn-secondary btn-mini" data-resetpw="${a.id}">改密码</button>
        </div>`;
      }).join('')}
    </div>

    <div class="section-card">
      <div class="section-title">➕ 添加孩子账号</div>
      <p class="small muted">创建后即多出一个孩子的完整学习平台（独立作业/错题/计划/积分/宠物，可用自己的手机登录）</p>
      <input id="newKidName" class="text-input" placeholder="孩子名字（如 Lily）" style="margin-bottom:8px;">
      <input id="newKidGrade" class="text-input" placeholder="年级（如 五年级）" style="margin-bottom:8px;">
      <select id="newKidGender" class="text-input" style="margin-bottom:8px;">
        <option value="girl">女孩（粉色主题）</option>
        <option value="boy">男孩（蓝色主题）</option>
      </select>
      <input id="newKidUser" class="text-input" placeholder="登录用户名（英文或数字）" style="margin-bottom:8px;">
      <input id="newKidPass" class="text-input" type="password" placeholder="登录密码（至少4位）" style="margin-bottom:8px;">
      <button class="btn-finish" id="newKidBtn" style="background:linear-gradient(135deg,#6FCF97,#27AE60);">创建账号</button>
    </div>

    <div class="section-card text-center">
      <button class="btn-secondary" id="momLogoutBtn" style="width:100%;">🚪 退出登录</button>
    </div>
  `;

  /* 改密码 */
  body.querySelectorAll('[data-resetpw]').forEach(btn => {
    btn.onclick = () => {
      const acc = accs.find(a => a.id === btn.dataset.resetpw);
      if (!acc) return;
      showModal(`
        <h3>🔑 修改 ${acc.name} 的密码</h3>
        <input id="newPw1" class="text-input" type="password" placeholder="新密码（至少4位）" style="margin-bottom:8px;">
        <input id="newPw2" class="text-input" type="password" placeholder="再输入一遍">
        <div class="modal-actions">
          <button class="btn-primary" data-result="ok">确定</button>
          <button class="btn-secondary" data-result="cancel">取消</button>
        </div>
      `).then(async (r) => {
        if (r !== 'ok') return;
        const p1 = $('#newPw1') ? $('#newPw1').value : '';
        const p2 = $('#newPw2') ? $('#newPw2').value : '';
        if (p1.length < 4) return toast('密码至少 4 位');
        if (p1 !== p2) return toast('两次输入不一致');
        acc.salt = PIN_UTIL.genSalt();
        acc.passHash = await PIN_UTIL.hash(p1, acc.salt);
        delete acc.passPlain;
        DB.save();
        toast('✅ 密码已修改');
        renderMomAccounts(body);
      });
    };
  });

  /* 添加孩子账号 */
  body.querySelector('#newKidBtn').onclick = async () => {
    const name = body.querySelector('#newKidName').value.trim();
    const grade = body.querySelector('#newKidGrade').value.trim() || '一年级';
    const gender = body.querySelector('#newKidGender').value;
    const username = body.querySelector('#newKidUser').value.trim().toLowerCase();
    const pass = body.querySelector('#newKidPass').value;
    if (!name) return toast('请填孩子名字');
    if (!/^[a-z0-9_]{2,16}$/.test(username)) return toast('用户名需 2-16 位英文/数字/下划线');
    if ((DB.data.accounts||[]).some(a => a.username === username)) return toast('用户名已被使用');
    if (!pass || pass.length < 4) return toast('密码至少 4 位');

    const kidId = 'kid_' + Date.now().toString(36);
    const usedColors = Object.keys(DB.data.profiles||{}).map(k => DB.data.profiles[k].color)
      .concat(['#FF4F8B', '#4A90E2']);
    const palette = KID_PALETTES.find(c => !usedColors.includes(c.color)) || KID_PALETTES[0];
    const petPool = (typeof PET_LIBRARY !== 'undefined' ? PET_LIBRARY : []);
    const petDef = petPool.length ? petPool[Math.floor(Math.random()*petPool.length)] : { name:'小可爱', emoji:'🐣', type:'chick' };

    /* 动态档案（持久化 + 运行时注册） */
    PROFILES[kidId] = Object.assign({
      name, cn: '', grade, gender,
      avatar: gender === 'girl' ? '👧🏻' : '👦🏻',
      petDefault: { name: petDef.name || petDef.emoji, emoji: petDef.emoji, type: petDef.type },
      appDayLimit: '19:00'
    }, palette);
    if (!DB.data.profiles) DB.data.profiles = {};
    DB.data.profiles[kidId] = PROFILES[kidId];

    /* 孩子数据空间 */
    DB.data.users[kidId] = DB._newUser(kidId);
    DB.data.weeklyConfig[kidId] = {
      enabled: PLAN_LIBRARY.reduce((a,p) => (a[p.id]=WEEKLY_DEFAULT_TIMES[p.id],a), {}),
      fixedDay: PLAN_LIBRARY.reduce((a,p) => (a[p.id]=p.fixedDay||null,a), {}),
      allowSelfAssign: false
    };
    DB.data.poems[kidId] = [];
    DB.data.bczWords[kidId] = [];

    /* 账号 */
    const salt = PIN_UTIL.genSalt();
    DB.data.accounts.push({
      id: 'acc_' + kidId, username, name, role: 'child', childId: kidId,
      passHash: await PIN_UTIL.hash(pass, salt), salt
    });
    DB.save();
    toast(`🎉 ${name} 的学习平台已创建！`);
    renderMomAccounts(body);
  };

  /* 退出登录 */
  body.querySelector('#momLogoutBtn').onclick = () => AUTH.logout();
}
