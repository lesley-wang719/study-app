/* ============================================================
   学习小天地 - 主应用逻辑
   ============================================================ */
'use strict';

/* ===================== 第 1 节：常量与配置 ===================== */
const APP = {
  name: '学习小天地',
  version: '1.1.0',
  dbKey: 'studyApp_v1',
  currentUser: null,        // 'janny' | 'jackie' | 'mother' | null
  currentModule: null,
  today: '',                // yyyy-mm-dd
  camera: null,             // MediaStream
  cameraFacing: 'environment',
  mediaRec: null,
  mediaChunks: [],
  recStartAt: 0,
  recTimer: null,
  inited: false,
  flowActive: false         // 控制子页面入口
};

/* 孩子档案 */
const PROFILES = {
  janny: {
    name: 'Janny',
    cn: '姐姐',
    grade: '六年级',
    gender: 'girl',
    avatar: '👧🏻',
    color: '#FF4F8B',
    colorSoft: '#FFE4EE',
    colorDeep: '#C9184A',
    petDefault: { name:'小桃子', emoji:'🐰', type:'rabbit' },
    appDayLimit: '19:00'
  },
  jackie: {
    name: 'Jackie',
    cn: '弟弟',
    grade: '三年级',
    gender: 'boy',
    avatar: '👦🏻',
    color: '#4A90E2',
    colorSoft: '#D6EAF8',
    colorDeep: '#1B4F72',
    petDefault: { name:'小蓝龙', emoji:'🐲', type:'dragon' },
    appDayLimit: '19:00'
  }
};

/* 宠物图鉴（孩子可自选，等级解锁） */
const PET_LIBRARY = [
  { type:'rabbit',  emoji:'🐰', name:'小兔子', unlock:1 },
  { type:'dragon',  emoji:'🐲', name:'小恐龙', unlock:1 },
  { type:'cat',     emoji:'🐱', name:'小猫咪', unlock:1 },
  { type:'dog',     emoji:'🐶', name:'小狗狗', unlock:1 },
  { type:'chick',   emoji:'🐤', name:'小黄鸡', unlock:2 },
  { type:'panda',   emoji:'🐼', name:'大熊猫', unlock:2 },
  { type:'penguin', emoji:'🐧', name:'小企鹅', unlock:3 },
  { type:'fox',     emoji:'🦊', name:'小狐狸', unlock:3 },
  { type:'tiger',   emoji:'🐯', name:'小老虎', unlock:4 },
  { type:'hamster', emoji:'🐹', name:'小仓鼠', unlock:4 },
  { type:'unicorn', emoji:'🦄', name:'独角兽', unlock:5 },
  { type:'owl',     emoji:'🦉', name:'猫头鹰', unlock:6 }
];

/* 宠物装扮商店（积分购买） */
const PET_OUTFITS = [
  { id:'bow',       emoji:'🎀', name:'蝴蝶结',  price:8,  slot:'hat' },
  { id:'cap',       emoji:'🧢', name:'棒球帽',  price:10, slot:'hat' },
  { id:'flower',    emoji:'🌸', name:'小花环',  price:12, slot:'hat' },
  { id:'magic-hat', emoji:'🎩', name:'魔术帽',  price:15, slot:'hat' },
  { id:'crown',     emoji:'👑', name:'小皇冠',  price:30, slot:'hat' },
  { id:'glasses',   emoji:'👓', name:'小眼镜',  price:8,  slot:'face' },
  { id:'sunglass',  emoji:'😎', name:'墨镜',    price:14, slot:'face' },
  { id:'scarf',     emoji:'🧣', name:'小围巾',  price:10, slot:'neck' },
  { id:'bell',      emoji:'🔔', name:'小铃铛',  price:10, slot:'neck' },
  { id:'balloon',   emoji:'🎈', name:'气球',    price:6,  slot:'hand' },
  { id:'lolly',     emoji:'🍭', name:'棒棒糖',  price:6,  slot:'hand' },
  { id:'ball',      emoji:'⚽', name:'足球',    price:10, slot:'hand' }
];

/* 17种学习计划配置 */
const PLAN_LIBRARY = [
  {
    id: 'p1_poem',
    name: '今日古诗',
    emoji: '📜',
    duration: 10,
    desc: '读 3 遍 + 写 1 遍，循环 3 天',
    defaultDays: ['mon','tue','wed','thu','fri'],
    weekendOnly: false,
    type: 'poem',
    minGrade: 3
  },
  {
    id: 'p2_read',
    name: '语文阅读理解',
    emoji: '📖',
    duration: 30,
    desc: '解题技巧录音 + 练习题拍照',
    defaultDays: ['tue','thu'],
    weekendOnly: false,
    type: 'read_zh'
  },
  {
    id: 'p3_essay',
    name: '语文作文深度阅读',
    emoji: '✍️',
    duration: 30,
    desc: '周末默写 + 主题阅读（周一晚上）',
    defaultDays: ['mon'],
    weekendOnly: false,
    type: 'essay_zh'
  },
  {
    id: 'p4_calc',
    name: '数学计算一页',
    emoji: '🧮',
    duration: 5,
    desc: '口算练习拍照',
    defaultDays: ['mon','tue','wed','thu','fri','sat','sun'],
    weekendOnly: false,
    type: 'calc'
  },
  {
    id: 'p5_thinking',
    name: '数学思维训练',
    emoji: '🧠',
    duration: 50,
    desc: '一个主题拍照练习',
    defaultDays: ['tue','thu'],
    weekendOnly: false,
    type: 'math_thinking'
  },
  {
    id: 'p6_wang',
    name: '王老师数学课堂',
    emoji: '🎓',
    duration: 50,
    desc: '讲课 20 分钟 + 练习 30 分钟',
    defaultDays: ['mon','wed','fri'],
    weekendOnly: false,
    type: 'wang_class'
  },
  {
    id: 'p7_nce',
    name: '英语新概念',
    emoji: '🔤',
    duration: 80,
    desc: '书面笔记 + 单词 + 练习拍照',
    defaultDays: ['tue'],
    weekendOnly: false,
    type: 'nce',
    fixedDay: 'tue'
  },
  {
    id: 'p8_oxford',
    name: '英语牛津学习',
    emoji: '📘',
    duration: 80,
    desc: '书面笔记 + 单词拍照 + 文章朗读',
    defaultDays: ['sun'],
    weekendOnly: false,
    type: 'oxford',
    fixedDay: 'sun'
  },
  {
    id: 'p9_words1000',
    name: '英语1000词',
    emoji: '💬',
    duration: 30,
    desc: '书面笔记 + 单词 + 句子朗读',
    defaultDays: ['sun'],
    weekendOnly: false,
    type: 'words1000',
    fixedDay: 'sun'
  },
  {
    id: 'p10_speak',
    name: '英语阅读打卡',
    emoji: '🗣️',
    duration: 40,
    desc: '4 段录音打卡',
    defaultDays: ['mon','tue','wed','thu','fri','sat','sun'],
    weekendOnly: false,
    type: 'speak_daily'
  },
  {
    id: 'p11_eng_read_listen',
    name: '英文阅读理解 & 听力',
    emoji: '👂',
    duration: 15,
    desc: '阅读 + 听力各 1 项',
    defaultDays: ['mon','wed','fri'],
    weekendOnly: false,
    type: 'eng_reading'
  },
  {
    id: 'p12_eng_essay',
    name: '英文作文',
    emoji: '📝',
    duration: 15,
    desc: '作文拍照',
    defaultDays: ['sat'],
    weekendOnly: false,
    type: 'eng_essay'
  },
  {
    id: 'p13_bcz',
    name: '百词斩',
    emoji: '🌱',
    duration: 40,
    desc: '录入 15 词 + 系统出阅读理解',
    defaultDays: ['mon','wed','fri'],
    weekendOnly: false,
    type: 'bcz'
  },
  {
    id: 'p14_math_test',
    name: '数学学霸单元卷',
    emoji: '📐',
    duration: 90,
    desc: '周日验收',
    defaultDays: ['sun'],
    weekendOnly: false,
    type: 'math_test',
    fixedDay: 'sun'
  },
  {
    id: 'p15_zh_test',
    name: '语文学霸单元卷',
    emoji: '📚',
    duration: 90,
    desc: '周日验收',
    defaultDays: ['sun'],
    weekendOnly: false,
    type: 'zh_test',
    fixedDay: 'sun'
  },
  {
    id: 'p16_en_test',
    name: '英语学霸单元卷',
    emoji: '📕',
    duration: 90,
    desc: '周日验收',
    defaultDays: ['sun'],
    weekendOnly: false,
    type: 'en_test',
    fixedDay: 'sun'
  },
  {
    id: 'p17_doubao',
    name: '和豆包英语口语对话',
    emoji: '🤖',
    duration: 5,
    desc: '妈妈设置豆包限制',
    defaultDays: ['mon','tue','wed','thu','fri'],
    weekendOnly: false,
    type: 'doubao'
  }
];

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_NAMES = {'mon':'周一','tue':'周二','wed':'周三','thu':'周四','fri':'周五','sat':'周六','sun':'周日'};

/* 每周计划默认次数 */
const WEEKLY_DEFAULT_TIMES = {
  p1_poem:5, p2_read:2, p3_essay:3, p4_calc:5, p5_thinking:2, p6_wang:1,
  p7_nce:1, p8_oxford:1, p9_words1000:1, p10_speak:5,
  p11_eng_read_listen:3, p12_eng_essay:1, p13_bcz:3, p14_math_test:1,
  p15_zh_test:1, p16_en_test:1, p17_doubao:5
};

/* 鼓励语池 */
const ENCOURAGE = {
  girl: {
    homework: [
      '你是最棒的公主，把今天的作业写完吧～',
      '认真写作业的Janny最美啦 ✨',
      '写完作业，就能早点休息啦，加油！',
      '一笔一划，写出漂亮的自己 🌸',
      '妈妈在等你交作业哦，爱你～',
      '作业写得好，今天你就是小明星！'
    ],
    mistakes: [
      '错题是成长的台阶，再走一遍就稳啦！',
      'Janny超厉害，下次一定会做对 💪',
      '认真复习，你比昨天更厉害了～',
      '错了不怕，改了就是好孩子 ✨',
      '一步一个脚印，加油我的小公主！',
      '复盘错题是最聪明的学习方式 👑'
    ],
    done: [
      '太棒啦Janny！今天的任务全部完成 🎉',
      '妈妈为你骄傲，你是学习小能手 🌟',
      '辛苦啦！休息一会儿，吃个水果吧 🍎'
    ],
    combo: [
      '连续3次正确！这是学霸的节奏 🚀',
      '连击达成！你是最闪亮的 🌟'
    ]
  },
  boy: {
    homework: [
      'Jackie大男孩，认真写作业超帅气 🦁',
      '写完作业就可以玩啦，加油⚡',
      '今日份作业，挑战一下自己吧！',
      '男子汉，写作业也要干脆利落 💪',
      '一笔一划，写出大英雄 ✏️',
      '妈妈期待你的作业本哦～'
    ],
    mistakes: [
      '错了不算啥，再来一次就是NB！',
      'Jackie是错题小猎手 🔍',
      '英雄都是改错中诞生的 🌟',
      '不怕错，怕不改！',
      '你比昨天的自己更强 💪',
      '再读一遍题目，仔细一定行！'
    ],
    done: [
      'Jackie完成啦！今日小英雄 🏆',
      '帅气！作业全部搞定 ✨',
      '真棒！玩一会儿吧 ⚽'
    ],
    combo: [
      '三次全对！Jackie是错题杀手 🗡️',
      '连击达成！学霸体质觉醒 ⚡'
    ]
  },
  generic: {
    wrong: [
      '没关系，下次仔细一点 🌱',
      '答错是学习的一部分，加油！',
      '勇敢面对错题，你就是最棒的 🌟',
      '我们再来一次！'
    ],
    correct: [
      '答对啦！你真聪明 ✨',
      '完美！就是这样 🎯',
      '恭喜你，这次正确了！',
      '进步看得见，继续保持 🌈'
    ]
  }
};

/* 商店商品 */
const SHOP_ITEMS = [
  { id:'s1', name:'挑一本喜欢的文具', emoji:'✏️', cost:50 },
  { id:'s2', name:'周末点餐权', emoji:'🍕', cost:100 },
  { id:'s3', name:'英文动画片 30 分钟', emoji:'📺', cost:80 },
  { id:'s4', name:'一袋零食', emoji:'🍬', cost:30 },
  { id:'s5', name:'一日采购主管', emoji:'🛒', cost:200 },
  { id:'s6', name:'选一个盲盒', emoji:'🎁', cost:60 },
  { id:'s7', name:'晚睡半小时权', emoji:'🌙', cost:120 },
  { id:'s8', name:'一次电影之夜', emoji:'🎬', cost:150 }
];

/* ===================== 第 2 节：工具函数 ===================== */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
function $(id) { return document.getElementById(id); }

function today() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function dayKey(d = new Date()) {
  return DAYS[(d.getDay() + 6) % 7];
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function fromNow(days) {
  return addDays(today(), days);
}

function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function toast(text, ms=2000) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), ms);
}

/* 图片查重——通过canvas缩略后采样哈希 */
async function imageHash(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 16, 16);
      const data = ctx.getImageData(0,0,16,16).data;
      let sum = '';
      for (let i=0;i<data.length;i+=4) {
        sum += (data[i] > 120 ? '1' : '0');
      }
      resolve(sum);
    };
    img.src = dataUrl;
  });
}

/* 简单相似度（哈希对比） */
function hashSimilar(h1, h2) {
  if (!h1 || !h2 || h1.length !== h2.length) return 0;
  let same = 0;
  for (let i=0;i<h1.length;i++) if (h1[i] === h2[i]) same++;
  return same / h1.length;
}

/* ===================== 第 3 节：存储管理 ===================== */
const DB = {
  data: null,
  defaults() {
    return {
      users: {
        janny: this._newUser('janny'),
        jackie: this._newUser('jackie')
      },
      homework: {},     // per user
      mistakes: {},     // per user: mistake id => record
      studyDaily: {},   // per user per date: { plans: [{planId, state, ...}], generatedAt }
      weeklyConfig: {  // 妈妈配置
        janny: { enabled: PLAN_LIBRARY.reduce((a,p) => (a[p.id]=WEEKLY_DEFAULT_TIMES[p.id],a), {}) , fixedDay: PLAN_LIBRARY.reduce((a,p) => (a[p.id]=p.fixedDay||null,a), {}), allowSelfAssign: false },
        jackie:{ enabled: PLAN_LIBRARY.reduce((a,p) => (a[p.id]=WEEKLY_DEFAULT_TIMES[p.id],a), {}) , fixedDay: PLAN_LIBRARY.reduce((a,p) => (a[p.id]=p.fixedDay||null,a), {}), allowSelfAssign: false }
      },
      momChecks: {},    // 推送的检查单
      poems: { janny:[], jackie:[] },   // 妈妈上传的古诗
      bczWords: { janny:[], jackie:[] }, // 百词斩词库
      rewardHistory: {}, // 兑换记录
      firstDate: today(),
      // ===== 新增：妈妈端PIN锁屏（v1.1+）=====
      pin: {
        hash: '',          // SHA-256(PIN + salt)
        salt: '',          // 16位随机
        setAt: 0,          // 设置时间
        lastFailAt: 0,     // 最后失败时间
        failCount: 0       // 连续失败次数
      },
      // ===== 新增：OCR 引擎配置（v1.1+）=====
      ocr: {
        engine: 'mock',    // 'mock' | 'tesseract' | 'tencent'
        tencent: { secretId:'', secretKey:'', region:'ap-guangzhou' }
      },
      // ===== 新增：Server酱 微信推送（v1.1+）=====
      wechat: {
        sctKey: '',         // Server酱 SendKey (SCT...)
        enabled: false,
        quietStart: 22,     // 免打扰开始（小时）
        quietEnd: 7         // 免打扰结束（小时）
      },
      // ===== 账号系统（v1.5+）=====
      accounts: [],         // 账号列表（load 时自动初始化默认账号）
      profiles: {},         // 妈妈新增孩子的动态档案
      // ===== 积分每日上限（v1.5+）=====
      pointCaps: {}         // { date: { uid: { capKey: earned } } }
    };
  },
  _newUser(id) {
    const p = PROFILES[id];
    return {
      id,
      name: p.name,
      grade: p.grade,
      gender: p.gender,
      streakDays: 0,
      lastLoginDate: '',
      lastRewardDate: '',
      points: 0,
      pet: {
        name: p.petDefault.name,
        type: p.petDefault.type,
        emoji: p.petDefault.emoji,
        level: 1,
        exp: 0,
        state: 'happy',       // happy/confused/sick/angry/cry
        sickReason: '',
        lastFedAt: '',
        lastLoginAt: '',
        outfit: null,          // 当前穿着的装扮 id
        ownedOutfits: []       // 已拥有的装扮 id 列表
      },
      photoHashes: [],       // 查重用
      combo: 0,              // 当前连击
      records: []            // 通用流水
    };
  },
  load() {
    try {
      const raw = localStorage.getItem(APP.dbKey);
      if (raw) this.data = JSON.parse(raw);
      else { this.data = this.defaults(); this.save(); }
      // 缺字段补全
      this._fillMissing();
    } catch(e) {
      console.error('load db error', e);
      this.data = this.defaults();
    }
  },
  _fillMissing() {
    const d = this.defaults();
    for (const k of Object.keys(d)) {
      if (this.data[k] === undefined) this.data[k] = d[k];
    }
    // 账号系统：首次自动初始化默认账号（初始密码 1234，登录时自动升级为哈希）
    if (!this.data.accounts || !this.data.accounts.length) {
      this.data.accounts = [
        { id:'acc_mom',   username:'mama',   name:'妈妈',   role:'mom',   childId:'',      passHash:'', salt:'', passPlain:'1234' },
        { id:'acc_janny', username:'janny',  name:'Janny',  role:'child', childId:'janny', passHash:'', salt:'', passPlain:'1234' },
        { id:'acc_jackie',username:'jackie', name:'Jackie', role:'child', childId:'jackie',passHash:'', salt:'', passPlain:'1234' }
      ];
    }
    // 妈妈新增孩子的档案恢复到 PROFILES
    for (const pid of Object.keys(this.data.profiles || {})) {
      if (!PROFILES[pid]) PROFILES[pid] = this.data.profiles[pid];
    }
    // 动态补全每个孩子的配置
    for (const uid of Object.keys(this.data.users)) {
      if (!this.data.weeklyConfig[uid]) this.data.weeklyConfig[uid] = { enabled: PLAN_LIBRARY.reduce((a,p) => (a[p.id]=WEEKLY_DEFAULT_TIMES[p.id],a), {}), fixedDay: PLAN_LIBRARY.reduce((a,p) => (a[p.id]=p.fixedDay||null,a), {}), allowSelfAssign: false };
      if (!this.data.poems[uid]) this.data.poems[uid] = [];
      if (!this.data.bczWords[uid]) this.data.bczWords[uid] = [];
    }
  },
  save() {
    try {
      localStorage.setItem(APP.dbKey, JSON.stringify(this.data));
    } catch(e) {
      console.warn('save db error', e);
      toast('存储空间不足，请清理历史照片');
    }
  },
  reset() {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;
    localStorage.removeItem(APP.dbKey);
    this.data = this.defaults();
    this.save();
    toast('数据已重置');
    location.hash = '';
    setTimeout(()=>location.reload(), 600);
  },

  /* 用户相关的便利方法 */
  user(id) { return this.data.users[id]; },
  todayHomework(id) {
    const t = today();
    if (!this.data.homework[id]) this.data.homework[id] = {};
    if (!this.data.homework[id][t]) this.data.homework[id][t] = { content:'', photo:'', photos:[], hash:'', completed:false, ts:null };
    if (!Array.isArray(this.data.homework[id][t].photos)) {
      this.data.homework[id][t].photos = this.data.homework[id][t].photo ? [this.data.homework[id][t].photo] : [];
    }
    return this.data.homework[id][t];
  },
  dailyPlan(id) {
    const t = today();
    const k = id;
    if (!this.data.studyDaily[k]) this.data.studyDaily[k] = {};
    if (!this.data.studyDaily[k][t]) this.data.studyDaily[k][t] = { plans: [], totalDuration:0, generatedAt: Date.now() };
    return this.data.studyDaily[k][t];
  },
  addPhotoHash(id, hash) {
    const u = this.user(id);
    u.photoHashes = u.photoHashes || [];
    u.photoHashes.push(hash);
    if (u.photoHashes.length > 200) u.photoHashes = u.photoHashes.slice(-150);
  },
  hasSimilarPhoto(id, hash, threshold=0.92) {
    const u = this.user(id);
    if (!u.photoHashes) return false;
    for (const old of u.photoHashes) {
      if (hashSimilar(hash, old) > threshold) return true;
    }
    return false;
  }
};

/* ===================== 第 4 节：路由 ===================== */
function go(path) {
  location.hash = path;
}

function route() {
  /* 登录门卫：未登录只能看登录页 */
  if (typeof AUTH !== 'undefined' && AUTH && !AUTH.logged()) { AUTH.showLogin(); return; }
  const path = (location.hash || '').replace(/^#\/?/, '');
  if (!path) {
    APP.currentUser = null;
    showPage('home');
    return;
  }
  const parts = path.split('/');
  if (parts[0] === 'mother') {
    if (typeof AUTH !== 'undefined' && AUTH && !AUTH.isMom()) { toast('只有妈妈账号可以进入后台'); return AUTH.goHome(); }
    APP.currentUser = 'mother';
    showPage('home');
    Mother.render(parts[1]||'home', parts[2]||'janny');
  } else if (parts[0] === 'child') {
    const uid = parts[1];
    if (!DB.data.users[uid]) return go('');
    /* 孩子账号只能看自己的页面 */
    if (typeof AUTH !== 'undefined' && AUTH && AUTH.ownChildId() && AUTH.ownChildId() !== uid) {
      toast('每个账号只能看自己的页面哦');
      return go('child/' + AUTH.ownChildId());
    }
    APP.currentUser = uid;
    if (parts.length === 2) {
      // 孩子主页
      ChildHome.render(uid);
    } else {
      // 子页面
      const sub = parts[2];
      if (sub === 'homework') ChildHomework.render(uid);
      else if (sub === 'mistakes') ChildMistakes.render(uid);
      else if (sub === 'plans') ChildPlans.render(uid);
      else if (sub === 'planTask') ChildPlans.renderTask(uid, parts[3]);
      else if (sub === 'shop') ChildShop.render(uid);
      else if (sub === 'pet') ChildPet.render(uid);
      else ChildHome.render(uid);
    }
  } else {
    showPage('home');
  }
}
window.addEventListener('hashchange', route);

function showPage(name) {
  $$('.page').forEach(p => p.removeAttribute('data-active'));
  const el = document.querySelector(`.page-${name}`);
  if (el) el.setAttribute('data-active', 'true');
  // 不显示subpage
  if (name !== 'home') $$('.subpage').forEach(s => s.removeAttribute('data-active'));
}

/* ===================== 第 5 节：弹窗 ===================== */
function showModal(html) {
  return new Promise((resolve) => {
    const body = $('modalBody');
    body.innerHTML = html;
    $('modal').classList.remove('hidden');
    body.querySelectorAll('[data-result]').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-result');
        const result = v === 'true' ? true : v === 'false' ? false : v;
        $('modal').classList.add('hidden');
        resolve(result);
      });
    });
    $('modal').querySelector('.modal-mask').onclick = () => {
      $('modal').classList.add('hidden');
      resolve(null);
    };
  });
}
function closeModal() { $('modal').classList.add('hidden'); }

/* ===================== 第 6 节：相机 ===================== */

/* 摄像头 API 可用性检测：手机用 http://IP 访问时浏览器会禁用摄像头，
   此时回退到"系统相机"（<input capture>），移动端会直接唤起相机 App 拍照 */
function cameraApiAvailable() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function captureViaSystemCamera() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment'); // 优先调起后置摄像头
    input.style.display = 'none';
    document.body.appendChild(input);
    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      if (input.parentNode) input.remove();
      fn();
    };
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) { finish(() => resolve(null)); return; }
      const reader = new FileReader();
      reader.onload = () => finish(() => resolve(reader.result));
      reader.onerror = () => finish(() => reject(new Error('读取照片失败')));
      reader.readAsDataURL(file);
    };
    input.addEventListener('cancel', () => finish(() => resolve(null)));
    input.click();
  });
}

async function openCamera({ tip='把内容拍清楚' } = {}) {
  // 非安全上下文（HTTP+IP）：浏览器禁用 getUserMedia，回退系统相机
  if (!cameraApiAvailable()) {
    return await captureViaSystemCamera();
  }
  return new Promise(async (resolve, reject) => {
    const layer = $('cameraLayer');
    const video = $('cameraVideo');
    $('cameraTip').textContent = tip;
    layer.classList.remove('hidden');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: APP.cameraFacing, width:{ideal:1920}, height:{ideal:1080} },
        audio: false
      });
      APP.camera = stream;
      video.srcObject = stream;
    } catch(e) {
      layer.classList.add('hidden');
      reject(e);
    }
    const cleanup = () => {
      if (APP.camera) {
        APP.camera.getTracks().forEach(t=>t.stop());
        APP.camera = null;
      }
      layer.classList.add('hidden');
      $('camClose').onclick = null;
      $('camShoot').onclick = null;
      $('camFlip').onclick = null;
    };
    $('camClose').onclick = () => { cleanup(); resolve(null); };
    $('camFlip').onclick = async () => {
      APP.cameraFacing = APP.cameraFacing === 'environment' ? 'user' : 'environment';
      if (APP.camera) APP.camera.getTracks().forEach(t=>t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: APP.cameraFacing }
        });
        APP.camera = stream;
        $('cameraVideo').srcObject = stream;
      } catch(e) { toast('切换失败'); }
    };
    $('camShoot').onclick = () => {
      const video = $('cameraVideo');
      const canvas = $('cameraCanvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      cleanup();
      resolve(dataUrl);
    };
  });
}

/* 强制摄像头拍照（自动查重） */
async function finishPhoto(dataUrl, uid, allowDup) {
  const hash = await imageHash(dataUrl);
  if (uid && !allowDup) {
    if (DB.hasSimilarPhoto(uid, hash)) {
      await showModal(`
        <h3>🚫 检测到相同照片</h3>
        <p>不能用历史照片哦～必须是现场拍的！</p>
        <div class="modal-actions"><button class="btn-primary" data-result="retry">📷 重新拍摄</button></div>
      `);
      return 'dup';
    }
    DB.addPhotoHash(uid, hash);
  }
  return { dataUrl, hash };
}

async function takePhoto(opts={}) {
  const { tip='把内容拍清楚 📸', uid=null, allowDup=false } = opts;
  let dataUrl = null;
  try {
    dataUrl = await openCamera({ tip });
    if (!dataUrl) return null;
  } catch(e) {
    // 浏览器摄像头被禁用/拒绝授权 → 回退系统相机
    toast('浏览器摄像头不可用，改用系统相机拍照', 2500);
    try {
      dataUrl = await captureViaSystemCamera();
    } catch(e2) {
      toast('无法访问摄像头');
      return null;
    }
    if (!dataUrl) return null;
  }
  const result = await finishPhoto(dataUrl, uid, allowDup);
  if (result === 'dup') return await takePhoto(opts);
  return result;
}

/* ---- 多张拍照：拍1张后可继续拍/重拍最后一张，返回数组 [{dataUrl,hash}] ---- */
async function takePhotos({ tip='把内容拍清楚 📸', uid=null, max=9 } = {}) {
  const arr = [];
  while (arr.length < max) {
    // 第2张起允许与第1张相似（刚拍的同一页内容属正常），防作弊只针对历史旧照片
    const p = await takePhoto({ tip: arr.length ? tip + `（已拍${arr.length}张）` : tip, uid, allowDup: arr.length > 0 });
    if (!p) break;                       // 用户取消 → 用已拍的
    arr.push(p);
    const act = await showModal(`
      <h3>📷 已拍 ${arr.length} 张</h3>
      <div class="photo-grid">${arr.map(a=>`<img src="${a.dataUrl}" class="photo-grid-item">`).join('')}</div>
      <div class="modal-actions">
        <button class="btn-secondary" data-result="retake">🔄 重拍最后一张</button>
        <button class="btn-primary" data-result="more">➕ 再拍一张</button>
        <button class="btn-primary" data-result="done">✅ 就这些</button>
      </div>
    `);
    if (act === 'more') continue;
    if (act === 'retake') { arr.pop(); continue; }
    break;
  }
  return arr;
}

/* 照片数组 → 网格 HTML（兼容旧的单张字符串；空串=照片未同步到本机） */
function photosGridHtml(photos, cls='') {
  if (!photos || !photos.length) return '';
  return `<div class="photo-grid ${cls}">` + photos.map(p => {
    const src = typeof p === 'string' ? p : (p && p.dataUrl);
    if (!src) return `<div class="photo-grid-item photo-missing">📷<span>照片未同步<br>（在本机可见）</span></div>`;
    return `<img src="${src}" class="photo-grid-item">`;
  }).join('') + `</div>`;
}
/* 合并照片到数组（兼容旧字段是单张字符串），最多保留 maxN 张 */
function mergePhotos(existing, addedOnes, maxN=12) {
  const arr = Array.isArray(existing) ? existing.slice() : (existing ? [existing] : []);
  for (const p of (addedOnes||[])) arr.push(typeof p === 'string' ? p : p.dataUrl);
  return arr.slice(0, maxN);
}

/* ===================== 第 7 节：OCR（模拟+真实）===================== */
async function ocrImage(dataUrl) {
  const layer = $('ocrLayer');
  $('ocrText').textContent = '🔍 正在识别题目内容…';
  if (layer) layer.classList.remove('hidden');

  try {
    // 调用扩展模块的 OCR_ENGINE（v1.1+ 真实接入）
    const result = await OCR_ENGINE.recognize(dataUrl);
    if (layer) {
      $('ocrText').textContent = `✅ 识别完成（${result.engine} · 置信度${result.confidence}%）`;
      setTimeout(() => layer.classList.add('hidden'), 400);
    }
    // 如果是 mock 引擎，沿用原来的"题库随机"逻辑，让演示效果更自然
    if (result.engine === 'mock') {
      const sampleMath = ['27 + 18 = ?', '36 × 4 = ?', '100 - 35 = ?',
                          '8 × 7 + 5 = ?', 'x + 12 = 25，x = ?', '长方形面积 = 长 × 宽'];
      const sampleZh = ['请用"突然"造一个句子。', '阅读下面短文，回答问题。',
                        '把下列词语补充完整：专心( )致志'];
      const sampleEn = ['Write a sentence about your family.',
                        'Translate: 我喜欢吃苹果。', 'Read and answer the question.'];
      const pool = [...sampleMath, ...sampleZh, ...sampleEn];
      return pick(pool);
    }
    return result.text || '';
  } catch (e) {
    if (layer) layer.classList.add('hidden');
    toast('OCR 识别失败：' + e.message, 3000);
    return '';
  }
}

/* 自动判题（基于OCR+对比） */
async function judgeAnswer(originalText, newDataUrl, newOcr) {
  // 简单实现：让孩子自己确认
  return { needConfirm: true, similarity: 0.5, suggestion: 'none' };
}

/* ===================== 第 8 节：录音 ===================== */
async function recordAudio({ maxSec=180 } = {}) {
  // HTTP 非安全上下文下浏览器禁用麦克风，明确提示而不是报错
  if (!cameraApiAvailable()) {
    toast('当前环境（HTTP）浏览器禁用了麦克风，录音暂不可用；可改用 HTTPS 方式访问', 3500);
    return Promise.resolve(null);
  }
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      APP.mediaChunks = [];
      rec.ondataavailable = e => APP.mediaChunks.push(e.data);
      const layer = $('recLayer');
      layer.classList.remove('hidden');
      $('recTitle').textContent = '准备中…';
      $('recTime').textContent = '00:00';
      const start = () => {
        APP.mediaRec = rec;
        rec.start();
        APP.recStartAt = Date.now();
        $('recTitle').textContent = '录音中…';
        $('recToggle').textContent = '⏸ 暂停';
        APP.recTimer = setInterval(() => {
          const sec = Math.floor((Date.now() - APP.recStartAt)/1000);
          const mm = String(Math.floor(sec/60)).padStart(2,'0');
          const ss = String(sec%60).padStart(2,'0');
          $('recTime').textContent = `${mm}:${ss}`;
          if (sec >= maxSec) {
            stopRec();
          }
        }, 200);
      };
      const stopRec = () => {
        if (rec.state !== 'inactive') rec.stop();
        clearInterval(APP.recTimer);
        stream.getTracks().forEach(t=>t.stop());
      };
      const toggle = () => {
        if (rec.state === 'recording') {
          rec.pause();
          $('recTitle').textContent = '已暂停';
          $('recToggle').textContent = '⏺ 继续';
          clearInterval(APP.recTimer);
        } else if (rec.state === 'paused') {
          rec.resume();
          $('recTitle').textContent = '录音中…';
          $('recToggle').textContent = '⏸ 暂停';
          APP.recStartAt = Date.now() - (APP._pausedAt || 0);
          APP.recTimer = setInterval(() => {
            const sec = Math.floor((Date.now() - APP.recStartAt)/1000);
            const mm = String(Math.floor(sec/60)).padStart(2,'0');
            const ss = String(sec%60).padStart(2,'0');
            $('recTime').textContent = `${mm}:${ss}`;
          }, 200);
        } else {
          start();
        }
      };
      $('recToggle').onclick = toggle;
      $('recPlay').onclick = () => {
        if (APP._lastBlob) {
          const audio = new Audio(URL.createObjectURL(APP._lastBlob));
          audio.play();
        } else toast('请先录音');
      };
      $('recCancel').onclick = () => {
        stopRec();
        layer.classList.add('hidden');
        resolve(null);
      };
      rec.onstop = () => {
        const blob = new Blob(APP.mediaChunks, { type:'audio/webm' });
        APP._lastBlob = blob;
        // 转base64简易存储
        const reader = new FileReader();
        reader.onloadend = () => {
          $('recSubmit').onclick = () => {
            layer.classList.add('hidden');
            resolve({ dataUrl: reader.result, duration: Math.floor((Date.now()-APP.recStartAt)/1000) });
          };
        };
        reader.readAsDataURL(blob);
      };
      // 自动开始
      start();
    } catch(e) {
      toast('无法访问麦克风');
      reject(e);
    }
  });
}

/* ===================== 第 9 节：通用页面框架 ===================== */
function openSubpage({ title, body, onClose }) {
  // 关闭所有现有subpage
  $$('.subpage').forEach(s => s.remove());
  const sub = document.createElement('section');
  sub.className = 'subpage';
  sub.innerHTML = `
    <header class="subpage-header">
      <button class="subpage-back">←</button>
      <h2>${title}</h2>
      <span style="width:40px"></span>
    </header>
    <div class="subpage-content">${body}</div>
  `;
  $('appMain').appendChild(sub);
  setTimeout(()=> sub.setAttribute('data-active','true'), 10);
  sub.querySelector('.subpage-back').onclick = () => {
    sub.remove();
    if (onClose) onClose();
  };
  return sub;
}

/* ===================== 第 10 节：孩子主页 ===================== */
const ChildHome = {
  render(uid) {
    showPage('child');
    const p = PROFILES[uid];
    const sec = document.querySelector('.page-child');
    sec.className = `page page-child theme-${p.gender}`;
    APP.currentUser = uid;
    $('childHeader').style.background = `linear-gradient(135deg, ${p.color} 0%, ${p.colorDeep} 100%)`;
    $('childAvatar').textContent = p.avatar;
    const u = DB.user(uid);
    const greet = pick([`${u.name}，今天也是元气满满的一天！`, `${u.name}，加油！`, `${u.name}准备好啦吗？`, `${u.name}，我们开始吧～`]);
    $('childGreet').textContent = greet;
    const d = new Date();
    $('childDate').textContent = `${d.getMonth()+1}月${d.getDate()}日 · 周${'日一二三四五六'[d.getDay()]}`;
    $('childStreak').textContent = u.streakDays || 0;
    // 宠物
    const pet = u.pet;
    let petEmoji = pet.emoji;
    if (pet.state === 'sick') petEmoji = '🤒';
    else if (pet.state === 'cry') petEmoji = '😢';
    else if (pet.state === 'angry') petEmoji = '😠';
    else if (pet.state === 'confused') petEmoji = '🤔';
    const worn = (typeof PET_OUTFITS !== 'undefined') ? PET_OUTFITS.find(o => o.id === pet.outfit) : null;
    document.querySelector('.pet-mini .pet-emoji').textContent = petEmoji + (worn && worn.slot === 'hat' ? worn.emoji : '');
    document.querySelector('.pet-mini .pet-name-mini').textContent = `Lv${pet.level} ${pet.name}`;

    // 模块状态
    const hw = DB.todayHomework(uid);
    document.getElementById('homeworkStatus').textContent = hw.completed ? '✅ 已完成' : '未完成';
    document.getElementById('homeworkStatus').style.background = hw.completed ? '#D4EDDA' : '#FFE4EE';
    document.getElementById('homeworkStatus').style.color = hw.completed ? '#155724' : '#FF4F8B';

    const list = DB.user(uid);
    const mistakeCount = Object.values(DB.data.mistakes[uid]||{}).filter(m=>!m.archived).length;
    document.getElementById('mistakesStatus').textContent = `${mistakeCount} 道待复习`;
    document.getElementById('mistakesStatus').style.background = mistakeCount > 0 ? '#FADBD8' : '#D4EDDA';
    document.getElementById('mistakesStatus').style.color = mistakeCount > 0 ? '#E74C3C' : '#155724';

    const daily = DB.dailyPlan(uid);
    const total = daily.plans.length;
    const finished = daily.plans.filter(p=>p.state==='done').length;
    document.getElementById('planStatus').textContent = `${finished}/${total} 已完成`;
    document.getElementById('planDuration').textContent = daily.totalDuration || 0;
    const pct = total ? Math.round(finished/total*100) : 0;
    document.querySelector('.module-plan .module-progress-fill').style.width = pct + '%';

    // 鼓励语
    const encourMap = ENCOURAGE[p.gender];
    $('homeworkEncourage').textContent = pick(encourMap.homework);
    $('mistakesEncourage').textContent = pick(encourMap.mistakes);

    // 绑定点击
    $$('.module-card').forEach(card => {
      card.onclick = () => go(card.getAttribute('data-go').replace('child/', 'child/' + uid + '/').replace('child/' + uid, 'child/' + uid));
    });
    $('openReward').onclick = () => go(`child/${uid}/shop`);
    $('openPet').onclick = () => go(`child/${uid}/pet`);
    $$('[data-go="home"]').forEach(b=> b.onclick = () => { AUTH.logout(); });

    // 触发登录宠物状态切换
    ChildHome.checkLoginReward(uid);
  },

  checkLoginReward(uid) {
    const u = DB.user(uid);
    const t = today();
    if (u.lastLoginDate !== t) {
      if (u.lastLoginDate) {
        // 计算间隔
        const diff = Math.floor((new Date(t) - new Date(u.lastLoginDate)) / (1000*60*60*24));
        if (diff === 1) u.streakDays = (u.streakDays||0) + 1;
        else if (diff > 1) {
          u.streakDays = 1;
          // 触发惩罚
          if (diff >= 3) {
            Mother.sendPenalty('social','你已经' + diff + '天没学习了！小宠物想你了～');
            // 微信推送给妈妈
            if (typeof WECHAT_PUSH !== 'undefined') {
              WECHAT_PUSH.onStreakBroken(u.name, diff).catch(()=>{});
            }
          }
          // 宠物生病
          u.pet.state = 'sick';
          u.pet.sickReason = '已经' + diff + '天没登录';
        }
        if (diff >= 1) {
          u.pet.state = u.pet.state === 'sick' ? 'sick' : 'cry';
        }
      } else {
        u.streakDays = 1;
      }
      u.lastLoginDate = t;
      u.pet.lastLoginAt = t;
      DB.save();
    }
  }
};

/* 数据路由——页面加载 */
const ChildHomework = { render: renderHomework };
const ChildMistakes = { render: renderMistakes };
const ChildPlans = { render: renderPlans, renderTask: renderPlanTask };
const ChildShop = { render: renderShop };
const ChildPet = { render: renderPet };
const Mother = { render: renderMother, sendPenalty };

/* 入口初始化 */
window.addEventListener('DOMContentLoaded', () => {
  DB.load();
  // 绑定首页角色
  $$('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      go(card.dataset.go);
    });
  });
  route();
});

/* ============================================================
   第 11 节：今日老师作业
   ============================================================ */
async function renderHomework(uid) {
  showPage('child');
  const p = PROFILES[uid];
  const u = DB.user(uid);
  const hw = DB.todayHomework(uid);
  const encour = pick(ENCOURAGE[p.gender].homework);

  const html = `
    <div class="section-card" style="background:linear-gradient(135deg,#FFE4EE,${p.colorSoft}); border-left:5px solid ${p.color}">
      <div class="section-title">📚 ${u.name}的今日作业</div>
      <div class="kid-font girl-color" style="color:${p.colorDeep}; font-size:16px; line-height:1.6;">${encour}</div>
    </div>

    <div class="section-card">
      <div class="section-title">✍️ 填写今天的作业</div>
      <textarea id="hwContent" class="textarea-input" placeholder="例如：语文课本 P32-35，数学练习册 P18，听写单词5个……" rows="4">${hw.content||''}</textarea>
    </div>

    <div class="section-card">
      <div class="section-title">📸 拍照（必须现场拍摄，可拍多张）</div>
      ${hw.photos && hw.photos.length ? photosGridHtml(hw.photos) :
        `<div style="background:#FFE4EE; color:${p.color}; padding:24px; text-align:center; border-radius:12px; border:2px dashed ${p.color};">
          <div style="font-size:32px">📷</div>
          <div>还未拍照</div>
        </div>`}
      <button class="btn-finish" id="hwTake" style="background:linear-gradient(135deg,#FF8FB1,${p.color})">📸 ${hw.photos && hw.photos.length ? '再加拍一张（已拍'+hw.photos.length+'张）' : '现在拍照'}</button>
      <p class="small muted text-center mt-12">📌 系统会查重，不能用相册里的旧照片</p>
    </div>

    <div class="section-card">
      <div class="section-title">☑️ 是否完成？</div>
      <div style="display:flex; gap:10px;">
        <button class="btn-finish" id="hwDone" style="flex:1; background:${hw.completed?'linear-gradient(135deg,#6FCF97,#27AE60)':'linear-gradient(135deg,#FF8FB1,'+p.color+')'}">${hw.completed?'✅ 已完成':'🎉 我完成啦'}</button>
        <button class="btn-secondary" id="hwSkip" style="flex:1;">⏰ 跳过</button>
      </div>
    </div>

    ${hw.completed ? `
      <div class="section-card" style="background:linear-gradient(135deg,#D5F5E3,#A9DFBF); border-left:5px solid #27AE60;">
        <div class="section-title" style="color:#1E8449;">🎉 完成得不错</div>
        <p class="kid-font" style="color:#239B56; font-size:16px; line-height:1.6;">${pick(ENCOURAGE[p.gender].done)}</p>
      </div>
    `:''}

    <div class="section-card">
      <div class="section-title">📅 历史作业</div>
      <div id="hwHistory"></div>
    </div>
  `;

  const sub = openSubpage({ title: '今日老师作业', body: html });

  // 绑定交互
  $('#hwTake', sub).onclick = async () => {
    const photos = await takePhotos({ tip:'把作业本拍清楚', uid, max:9 });
    if (!photos.length) return;
    hw.photos = mergePhotos(hw.photos, photos, 12);
    hw.photo = hw.photos[hw.photos.length-1];   // 兼容旧字段（妈妈端查看）
    DB.save();
    toast(`✅ 拍照成功，共 ${hw.photos.length} 张`);
    renderHomework(uid);
  };

  $('#hwDone', sub).onclick = () => {
    if (!$('#hwContent', sub).value.trim()) return toast('请先填写作业内容');
    if (!hw.photos || !hw.photos.length) return toast('请先拍照');
    hw.content = $('#hwContent', sub).value.trim();
    hw.completed = !hw.completed;
    hw.ts = hw.completed ? Date.now() : null;
    if (hw.completed) {
      // 积分+5（每天最多5分，重复点击不再加分）
      addPoints(uid, 5, '完成作业', 'homework');
    }
    DB.save();
    renderHomework(uid);
  };

  $('#hwSkip', sub).onclick = () => {
    if (!confirm('确认跳过吗？妈妈会收到提醒。')) return;
    hw.content = $('#hwContent', sub).value.trim();
    hw.completed = false;
    hw.skipped = true;
    DB.save();
    Mother.pushCheck(uid, 'homework', { content: hw.content });
    toast('已通知妈妈');
    go(`child/${uid}`);
  };

  // 历史
  const hist = Object.entries(DB.data.homework[uid]||{})
    .filter(([d])=>d!==today())
    .sort((a,b)=>b[0].localeCompare(a[0]))
    .slice(0, 7);
  $('#hwHistory', sub).innerHTML = hist.length ? hist.map(([d,v])=>`
    <div class="list-card">
      <div class="list-icon">${v.completed?'✅':'⏳'}</div>
      <div class="list-body">
        <div class="list-title">${d}</div>
        <div class="list-sub">${(v.content||'').slice(0,30)}</div>
      </div>
      <span class="tag ${v.completed?'tag-done':'tag-pending'}">${v.completed?'完成':'未完成'}</span>
    </div>
  `).join('') : '<p class="muted small text-center">暂无历史记录</p>';
}

function $(sel, scope) {
  // 兼容两种调用：$('modalBody') 纯 id 和 $('#xxx') / '.xxx' CSS 选择器
  const root = scope || document;
  if (/^[A-Za-z][\w-]*$/.test(sel)) {
    return document.getElementById(sel) || root.querySelector(sel);
  }
  return root.querySelector(sel);
}

/* ============================================================
   第 12 节：今日错题
   ============================================================ */
async function renderMistakes(uid) {
  showPage('child');
  const p = PROFILES[uid];
  const u = DB.user(uid);
  const encour = pick(ENCOURAGE[p.gender].mistakes);

  const list = Object.entries(DB.data.mistakes[uid]||{})
    .filter(([k,m])=>!m.archived)
    .map(([k,m]) => ({ k, ...m }));

  const due = list.filter(m => m.nextReview && m.nextReview <= today());
  const upcoming = list.filter(m => m.nextReview && m.nextReview > today());

  const html = `
    <div class="section-card" style="background:linear-gradient(135deg,#FADBD8,#F1948A); border-left:5px solid #E74C3C">
      <div class="section-title" style="color:#922B21;">🔍 今日错题复习</div>
      <div class="kid-font" style="color:#641E16; font-size:16px; line-height:1.6;">${encour}</div>
    </div>

    <div class="summary-card red">
      <div>
        <div class="num">${due.length}</div>
        <div class="lbl">待复习</div>
      </div>
      <div style="text-align:right;">
        <div class="num">${list.length}</div>
        <div class="lbl">错题总数</div>
      </div>
    </div>

    <button class="btn-finish" id="addMistake" style="background:linear-gradient(135deg,#F1948A,#E74C3C);">➕ 录入新错题</button>

    ${due.length === 0 && list.length === 0 ? `
      <div class="section-card text-center muted">
        <div style="font-size:48px;">🎉</div>
        <p>还没有错题，继续保持！</p>
      </div>
    `: ''}

    <div id="mistakeList"></div>

    <div class="section-card">
      <div class="section-title">📜 错题档案</div>
      <div id="mistakeArchive"></div>
    </div>
  `;

  const sub = openSubpage({ title: '今日错题', body: html });

  $('#addMistake', sub).onclick = () => addNewMistake(uid);

  // 渲染待复习列表
  const listEl = $('#mistakeList', sub);
  const renderList = () => {
    const lst = Object.entries(DB.data.mistakes[uid]||{})
      .filter(([k,m])=>!m.archived)
      .map(([k,m]) => ({ k, ...m }));
    const d = lst.filter(m => m.nextReview && m.nextReview <= today());
    if (d.length === 0) {
      listEl.innerHTML = '';
      return;
    }
    listEl.innerHTML = `<div class="section-title">📝 待复习 (${d.length})</div>` +
      d.map(m => {
        const roundColor = ['#FF6B6B','#4ECDC4','#FFD166','#95E1D3'][m.round||0];
        return `
        <div class="mistake-card" data-id="${m.k}">
          <div class="round-indicator" style="background:${roundColor}; color:#fff;">第 ${(m.round||0)+1} 轮复习</div>
          <div class="kid-font" style="font-size:14px; color:#555; margin-bottom:8px;">${(m.question||'').slice(0,80)}</div>
          <div style="display:flex; gap:8px;">
            <button class="btn-primary" data-act="review" data-id="${m.k}" style="flex:1;">📸 重做</button>
          </div>
        </div>
      `;
      }).join('');
    $$('[data-act="review"]', listEl).forEach(b => {
      b.onclick = () => reviewMistake(uid, b.dataset.id);
    });
  };
  renderList();

  // 错题档案
  const allArchive = Object.entries(DB.data.mistakes[uid]||{})
    .sort((a,b)=>(b[1].ts||0)-(a[1].ts||0))
    .slice(0, 30);
  $('#mistakeArchive', sub).innerHTML = allArchive.length ? allArchive.map(([k,m])=>`
    <div class="list-card">
      <div class="list-icon">${m.archived?'📜':(m.round>=3?'🏆':'🔄')}</div>
      <div class="list-body">
        <div class="list-title" style="font-size:13px;">${(m.question||'').slice(0,30)}</div>
        <div class="list-sub">第 ${(m.round||0)+1} 轮 · ${m.archived?'已归档':(m.nextReview||'待安排')}</div>
      </div>
      ${m.archived ? '<span class="tag tag-done">已通关</span>' : `<span class="tag ${m.round>=3?'tag-done':'tag-pending'}">${m.round>=3?'已掌握':'进行中'}</span>`}
    </div>
  `).join('') : '<p class="muted small text-center">还没有错题</p>';
}

/* 录入新错题（一天可录入多条；可拍多张照片） */
async function addNewMistake(userId) {
  const p = PROFILES[userId];
  const photos = await takePhotos({ tip:'把错题拍清楚', uid: userId, max:6 });
  if (!photos.length) return;                       // 用户取消
  const photo = photos[0];
  // OCR识别（用第一张）
  const questionText = await ocrImage(photo.dataUrl);
  showModal(`
    <h3>📝 请确认题目内容</h3>
    <p class="small muted">系统从图片识别出来的内容，可手动修改</p>
    <textarea id="ocrInput" class="textarea-input" rows="6">${questionText}</textarea>
    <div id="ocrImgPreview" style="margin-top:8px;"></div>
    <div class="modal-actions">
      <button class="btn-primary" data-result="true">✓ 确认</button>
      <button class="btn-secondary" data-result="false">取消</button>
    </div>
  `).then((res) => {
    if (!res) return;
    const text = $('#ocrInput').value.trim();
    // 让用户填写错误原因
    setTimeout(() => {
      showModal(`
        <h3>💡 写下错误原因</h3>
        <p class="small muted">这样能帮助你下次避免</p>
        <textarea id="errorReasonInput" class="textarea-input" rows="3" placeholder="例如：粗心，忘记进位……"></textarea>
        <div class="modal-actions">
          <button class="btn-primary" data-result="true">✓ 保存</button>
          <button class="btn-secondary" data-result="false">取消</button>
        </div>
      `).then((r) => {
        if (!r) return;
        const reason = $('#errorReasonInput').value.trim();
        // 注意：不能调用 uid()，参数名 userId 避免与全局函数重名
        const mid = userId + '_m' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        if (!DB.data.mistakes[userId]) DB.data.mistakes[userId] = {};
        DB.data.mistakes[userId][mid] = {
          question: text,
          photo: photos[0].dataUrl,
          photos: photos.map(x=>x.dataUrl),
          hash: photos[0].hash,
          errorReason: reason,
          round: 0,
          attempts: [{ ts: Date.now(), correct: false, errorReason: reason }],
          nextReview: fromNow(3),
          createdAt: Date.now(),
          archived: false
        };
        DB.save();
        // 推送妈妈检查
        Mother.pushCheck(userId, 'mistake_new', { id: mid });
        toast(`✅ 已加入错题本（今天第 ${Object.keys(DB.data.mistakes[userId]).filter(k=>new Date(DB.data.mistakes[userId][k].createdAt).toDateString()===new Date().toDateString()).length} 条），3天后再复习`);
        renderMistakes(userId);   // 立即重绘，修复"上传后不显示"
      });
    }, 100);
  });
  $('#ocrImgPreview').innerHTML = photosGridHtml(photos.map(x=>x.dataUrl));
}

/* 复习错题（重做） */
async function reviewMistake(uid, mistakeId) {
  const m = DB.data.mistakes[uid][mistakeId];
  if (!m) return toast('错题不存在');
  const p = PROFILES[uid];
  const u = DB.user(uid);

  // 显示原错题和上次原因
  showModal(`
    <h3>🔄 重新做一遍</h3>
    ${m.photo ? `<img src="${m.photo}" style="width:100%; border-radius:8px; margin-bottom:10px;">` : ''}
    <div class="kid-font" style="text-align:left; font-size:14px; color:#555; padding:10px; background:#FFE4EE; border-radius:8px; margin-bottom:10px;">
      <b>题目：</b>${m.question || '(图片形式)'}
    </div>
    ${m.attempts && m.attempts.length ? `
      <div class="kid-font" style="text-align:left; font-size:13px; color:#888; padding:8px; background:#F8F9FA; border-radius:8px;">
        <b>上次错误原因：</b>${m.attempts[m.attempts.length-1].errorReason || '(未填)'}
      </div>
    ` : ''}
    <div class="modal-actions">
      <button class="btn-primary" data-result="true">📸 我重做完了</button>
      <button class="btn-secondary" data-result="false">取消</button>
    </div>
  `).then(async (res) => {
    if (!res) return;
    const photos = await takePhotos({ tip:'把重做的题目拍清楚', uid, max:4 });
    if (!photos.length) return;
    const photo = photos[0];

    // 询问对错
    showModal(`
      <h3>对了吗？</h3>
      ${photosGridHtml(photos)}
      <p class="kid-font" style="color:#FF4F8B;">${pick(ENCOURAGE[p.gender].mistakes)}</p>
      <div class="modal-actions">
        <button class="btn-primary" data-result="correct">✅ 做对了</button>
        <button class="btn-secondary" data-result="wrong">❌ 还错了</button>
      </div>
    `).then(async (result) => {
      if (result === 'cancel') return;
      const isCorrect = result === 'correct';
      let errorReason = '';
      if (!isCorrect) {
        await new Promise(async (r) => {
          await showModal(`
            <h3>💡 错误原因</h3>
            <textarea id="errR" class="textarea-input" rows="3" placeholder="再仔细想想为什么错了……"></textarea>
            <div class="modal-actions">
              <button class="btn-primary" data-result="true">提交</button>
            </div>
          `).then((res) => {
            if ($('#errR')) errorReason = $('#errR').value;
            r();
          });
        });
      }

      m.attempts.push({ ts: Date.now(), correct: isCorrect, errorReason, photo: photos[0].dataUrl, photos: photos.map(x=>x.dataUrl), hash: photos[0].hash });
      m.photos = mergePhotos(m.photos, photos, 12);
      m.photo = photos[0].dataUrl;
      m.hash = photos[0].hash;
      m.round = (m.round||0) + 1;

      if (isCorrect) {
        u.combo = (u.combo||0) + 1;
        // 积分（每道错题每天最多5分）
        if (u.combo >= 3) {
          // combo特效
          bigEncourage(pick(ENCOURAGE[p.gender].combo), 5);
          addPoints(uid, 10 + 5, '错题连击', 'mistake_' + mistakeId);
          u.combo = 0;
        } else {
          bigEncourage(pick(ENCOURAGE.generic.correct), 5);
          addPoints(uid, 5, '错题复习正确', 'mistake_' + mistakeId);
        }
        // 进入下一轮倒计时
        if (m.round >= 4) {
          m.archived = true;
          m.nextReview = '';
          toast('🏆 这道题你已经掌握啦！');
        } else if (m.round === 1) m.nextReview = fromNow(7);
        else if (m.round === 2) m.nextReview = fromNow(15);
        else if (m.round === 3) m.nextReview = fromNow(30);
        else m.nextReview = fromNow(3);
      } else {
        u.combo = 0;
        // 错误也要鼓励
        const encour = pick(ENCOURAGE.generic.wrong);
        bigEncourage(encour, 2);
        addPoints(uid, 2, '尝试复习', 'mistake_' + mistakeId);
        m.round = Math.max(0, (m.round||0) - 1);
        // 保留原 round，再次+1 在下一次成功时进入下一轮倒计时
        if (m.round === 0) m.nextReview = fromNow(3);
        else if (m.round === 1) m.nextReview = fromNow(7);
        else if (m.round === 2) m.nextReview = fromNow(15);
        else m.nextReview = fromNow(15);
        // 3次未掌握 -> 宠物生病
        const failStreak = m.attempts.slice(-3).filter(a=>!a.correct).length;
        if (failStreak >= 3) {
          u.pet.state = 'sick';
          u.pet.sickReason = `${m.question||'错题'}连续出错3次`;
        }
      }
      m.errorReason = m.attempts[m.attempts.length-1].errorReason;
      DB.save();
      // 推送给妈妈
      Mother.pushCheck(uid, 'mistake_review', { id: mistakeId, correct: isCorrect, round: m.round });
      go(`child/${uid}/mistakes`);
    });
  });
}

/* ===================== 通用：积分动效 =====================
   capKey：每日上限键（同一 capKey 每天最多得 DAILY_POINT_CAP 分，
   重复点击"确认完成"不会重复得分）。不传 capKey 则不设上限。 */
const DAILY_POINT_CAP = 5;
function addPoints(uid, n, reason, capKey) {
  const u = DB.user(uid);
  if (capKey) {
    const t = today();
    if (!DB.data.pointCaps) DB.data.pointCaps = {};
    // 只保留当天，自动清理历史
    for (const d of Object.keys(DB.data.pointCaps)) if (d !== t) delete DB.data.pointCaps[d];
    if (!DB.data.pointCaps[t]) DB.data.pointCaps[t] = {};
    if (!DB.data.pointCaps[t][uid]) DB.data.pointCaps[t][uid] = {};
    const earned = DB.data.pointCaps[t][uid][capKey] || 0;
    if (earned >= DAILY_POINT_CAP) {
      toast(`「${reason}」今天已拿满 ${DAILY_POINT_CAP} 分，明天继续加油～`);
      return 0;
    }
    n = Math.min(n, DAILY_POINT_CAP - earned);
    DB.data.pointCaps[t][uid][capKey] = earned + n;
  }
  u.points = (u.points || 0) + n;
  u.records = u.records || [];
  u.records.push({ ts: Date.now(), delta: n, reason });
  u.pet.exp = (u.pet.exp || 0) + n;
  // 升级
  while (u.pet.exp >= u.pet.level * 20) {
    u.pet.exp -= u.pet.level * 20;
    u.pet.level = (u.pet.level||1) + 1;
  }
  // 如果之前生病，完成任务后恢复
  if (u.pet.state === 'sick' || u.pet.state === 'cry') {
    u.pet.state = 'confused';
    setTimeout(()=> {
      u.pet.state = 'happy';
      DB.save();
    }, 5000);
  }
  DB.save();
  return n;
}

function bigEncourage(text, points) {
  const layer = document.createElement('div');
  layer.className = 'big-encourage';
  layer.innerHTML = `
    <div class="body">
      <div class="stars">⭐⭐⭐</div>
      <div class="text kid-font">${text}</div>
      ${points ? `<div class="points">+${points} 🌟</div>`:''}
    </div>
  `;
  document.body.appendChild(layer);
  setTimeout(()=> {
    layer.classList.add('hidden');
    setTimeout(()=>layer.remove(), 300);
  }, 1800);
}

/* ============================================================
   第 13 节：学习计划（17种）
   ============================================================ */
function generateDailyPlans(uid) {
  const p = PROFILES[uid];
  const u = DB.user(uid);
  const t = today();
  // 已经生成过且今日？
  const daily = DB.dailyPlan(uid);
  // 如果今天未生成，则重新生成（智能分配）
  const weekday = dayKey();
  const conf = DB.data.weeklyConfig[uid];
  if (!conf) return;
  // 生成：根据每周配置，扫描每个计划项在今天是否开启
  const plans = [];
  let total = 0;

  PLAN_LIBRARY.forEach((plan) => {
    // 1. 妈妈配置的固定日（多选，最高优先级）
    const momFixed = normalizeFixed(conf.fixedDay[plan.id]);
    if (momFixed.length) {
      if (momFixed.includes(weekday)) {
        plans.push({ planId: plan.id, state: 'pending' });
        total += plan.duration;
      }
      return;
    }
    // 2. 计划内置固定日（兼容单值/数组）
    if (plan.fixedDay) {
      const arr = Array.isArray(plan.fixedDay) ? plan.fixedDay : [plan.fixedDay];
      if (arr.includes(weekday)) {
        plans.push({ planId: plan.id, state: 'pending' });
        total += plan.duration;
      }
      return;
    }
    // 3. 周末专属
    if (plan.weekendOnly && weekday !== 'sat' && weekday !== 'sun') return;
    // 平时专属：周末不安排
    if (!plan.weekendOnly && (weekday === 'sat' || weekday === 'sun')) return;
    // 4. 否则按每周次数智能分配
    const enabled = conf.enabled[plan.id];
    if (!enabled) return;
    const todayPlan = DB.dailyPlan(uid);
    const todayUsed = todayPlan.plans.filter(x => x.planId === plan.id).length;
    const weeklyCount = countWeekPlans(uid, plan.id);
    if (weeklyCount < enabled) {
      plans.push({ planId: plan.id, state: 'pending' });
      total += plan.duration;
    }
  });
  daily.plans = plans;
  daily.totalDuration = total;
  DB.save();
}

/* 统计本周该计划项已分配次数 */
function countWeekPlans(uid, planId) {
  const start = (()=>{
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // 周一为起点
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0,10);
  })();
  const end = addDays(start, 6);
  const userDaily = DB.data.studyDaily[uid] || {};
  let c = 0;
  for (const d in userDaily) {
    if (d >= start && d <= end) {
      userDaily[d].plans.forEach(p => {
        if (p.planId === planId) c++;
      });
    }
  }
  return c;
}

async function renderPlans(uid) {
  showPage('child');
  const p = PROFILES[uid];
  // 自动生成今日计划
  generateDailyPlans(uid);

  const u = DB.user(uid);
  const daily = DB.dailyPlan(uid);

  // 计算预计学习时长
  const list = daily.plans.map(item => {
    const plan = PLAN_LIBRARY.find(x=>x.id===item.planId);
    return { ...item, plan };
  });
  const totalMinutes = daily.totalDuration;
  const finished = list.filter(x=>x.state==='done').length;

  const html = `
    <div class="summary-card blue">
      <div>
        <div class="num">${list.length}</div>
        <div class="lbl">今日任务</div>
      </div>
      <div style="text-align:right;">
        <div class="num">${totalMinutes}</div>
        <div class="lbl">预计分钟</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">📅 今日待办</div>
      <div class="module-progress"><div class="module-progress-fill" style="width:${list.length?Math.round(finished/list.length*100):0}%"></div></div>
      <p class="small muted">已完成 ${finished} / ${list.length}</p>
    </div>

    <div id="plansList"></div>

    ${list.length === 0 ? `
      <div class="section-card text-center">
        <p class="muted">今日无任务，享受自由时光吧 🎈</p>
      </div>
    `: ''}
  `;

  const sub = openSubpage({ title: '今日学习计划', body: html });
  $('#plansList', sub).innerHTML = list.length ? list.map((it, i) => `
    <div class="task-row ${it.state==='done'?'task-done':''}" data-i="${i}">
      <div class="task-emoji">${it.plan.emoji}</div>
      <div class="task-body">
        <div class="task-name kid-font">${it.plan.name}</div>
        <div class="task-desc">${it.plan.desc}</div>
        <div class="task-time">⏱ ${it.plan.duration} 分钟</div>
      </div>
      <button class="btn-primary" data-i="${i}" style="padding:8px 14px; font-size:13px;">
        ${it.state==='done'?'已✅':'开始 →'}
      </button>
    </div>
  `).join('') : '';

  $$('#plansList .task-row', sub).forEach((row, i) => {
    row.querySelector('button').onclick = () => {
      go(`child/${uid}/planTask/${daily.plans[i].uniqId || (daily.plans[i].uniqId = uid())}`);
    };
  });
}

/* 单个计划任务的详情页 */
async function renderPlanTask(uid, taskId) {
  showPage('child');
  const p = PROFILES[uid];
  const daily = DB.dailyPlan(uid);
  const item = daily.plans.find(x => x.uniqId === taskId);
  if (!item) return go(`child/${uid}/plans`);
  const plan = PLAN_LIBRARY.find(x=>x.id===item.planId);
  item.state = item.state || 'pending';

  const html = `
    <div class="section-card" style="background:linear-gradient(135deg,#D6EAF8,${p.colorSoft}); border-left:5px solid ${p.color};">
      <div style="font-size:48px; text-align:center;">${plan.emoji}</div>
      <h3 class="kid-font" style="text-align:center; margin:8px 0; color:${p.colorDeep};">${plan.name}</h3>
      <div class="kid-font muted text-center small">${plan.desc}</div>
      <div class="text-center mt-12"><span class="tag tag-weekend">⏱ 预计 ${plan.duration} 分钟</span></div>
    </div>

    <div id="planContent"></div>
  `;

  const sub = openSubpage({ title: plan.name, body: html });

  // 根据type渲染不同内容
  const ct = $('#planContent', sub);
  if (plan.type === 'poem') renderPoemPlan(ct, uid, item, plan);
  else if (plan.type === 'read_zh') renderReadZh(ct, uid, item, plan);
  else if (plan.type === 'essay_zh') renderEssayZh(ct, uid, item, plan);
  else if (plan.type === 'calc') renderCalc(ct, uid, item, plan);
  else if (plan.type === 'math_thinking') renderMathThink(ct, uid, item, plan);
  else if (plan.type === 'wang_class') renderWangClass(ct, uid, item, plan);
  else if (plan.type === 'nce') renderNCE(ct, uid, item, plan);
  else if (plan.type === 'oxford') renderOxford(ct, uid, item, plan);
  else if (plan.type === 'words1000') renderWords1000(ct, uid, item, plan);
  else if (plan.type === 'speak_daily') renderSpeakDaily(ct, uid, item, plan);
  else if (plan.type === 'eng_reading' || plan.type === 'eng_essay' || plan.type === 'doubao') renderSimplePhoto(ct, uid, item, plan);
  else if (plan.type === 'bcz') renderBCZ(ct, uid, item, plan);
  else if (plan.type === 'math_test' || plan.type === 'zh_test' || plan.type === 'en_test') renderTest(ct, uid, item, plan);
  else renderSimplePhoto(ct, uid, item, plan);

  // 完成后按钮
  if (item.state !== 'done') {
    const btn = document.createElement('button');
    btn.className = 'btn-finish';
    btn.textContent = '✅ 我完成了';
    btn.style.background = `linear-gradient(135deg,#6FCF97,#27AE60)`;
    btn.onclick = () => {
      item.state = 'done';
      // 每个计划项目每天最多5分（重复确认不再得分）
      const got = addPoints(uid, 5, `完成${plan.name}`, 'plan_' + item.planId);
      DB.save();
      if (got > 0) toast(`+5 分！${plan.name}`);
      go(`child/${uid}/plans`);
    };
    ct.appendChild(btn);
  } else {
    const done = document.createElement('div');
    done.className = 'section-card text-center';
    done.style.background = '#D5F5E3';
    done.innerHTML = `<div style="font-size:32px;">✅</div><b>已完成</b>`;
    ct.appendChild(done);
  }
}

/* 古诗学习（循环3天） */
function renderPoemPlan(ct, uid, item, plan) {
  const u = DB.user(uid);
  const poems = DB.data.poems[uid] || [];
  // 选一首今日学习
  const todayKey = today();
  const cycleKey = `poem_${uid}_${Math.floor((new Date(todayKey).getTime() - new Date('2026-01-01').getTime()) / (1000*60*60*24*3))}`;
  let selectedPoem = poems[Math.abs(hashCode(cycleKey)) % poems.length];
  if (!selectedPoem) selectedPoem = { text: '请妈妈在后台先上传古诗 📜', name: '示例古诗' };

  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">📜 今日古诗</div>
      <div style="padding:14px; background:#FFF9E6; border-radius:12px; border:2px dashed #FFD966; font-family:'KID',cursive; font-size:16px; line-height:1.8; color:#5D4037;">
        ${selectedPoem.text.replace(/\n/g,'<br>')}
      </div>
      <div class="mt-12 muted small">第 <b>${(Math.floor((new Date(todayKey).getTime() - new Date('2026-01-01').getTime()) / (1000*60*60*24)) % 3) + 1}</b> 天 / 共 3 天循环</div>
    </div>

    <div class="section-card">
      <div class="section-title">🎤 朗读 3 遍</div>
      <p class="kid-font small muted">每遍单独录音</p>
      <div id="poemRecordings"></div>
    </div>

    <div class="section-card">
      <div class="section-title">✍️ 抄写 1 遍（拍照）</div>
      <div id="poemWrite"></div>
    </div>
  `;
  // 录音列表（3遍）
  const recBox = ct.querySelector('#poemRecordings');
  for (let i=1;i<=3;i++) {
    recBox.innerHTML += `
      <div class="list-card">
        <div class="list-icon">🎤</div>
        <div class="list-body">
          <div class="list-title">第 ${i} 遍朗读</div>
          <div class="list-sub">点击录音</div>
        </div>
        <button class="btn-primary" data-rec="${i}" style="padding:6px 12px; font-size:13px;">录音</button>
      </div>
    `;
  }
  recBox.querySelectorAll('[data-rec]').forEach(b => {
    b.onclick = async () => {
      const rec = await recordAudio({ maxSec: 90 });
      if (rec) { b.textContent = `✅ ${b.dataset.rec}`; DB.save(); }
    };
  });

  // 抄写拍照
  const writeBox = ct.querySelector('#poemWrite');
  writeBox.innerHTML = `
    <button class="btn-finish" id="poemShoot">📸 拍摄抄写</button>
    <div id="poemImg" class="mt-12"></div>
    <p class="small muted mt-12">📌 第 4 天开始需要默写测验</p>
  `;
  writeBox.querySelector('#poemShoot').onclick = async () => {
    const photos = await takePhotos({ tip:'把抄写的古诗拍清楚', uid });
    if (photos && photos.length) {
      writeBox.querySelector('#poemImg').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
      DB.save();
    }
  };

  // 第4天默写检查
  const day4 = fromNow(3);
  if (todayKey >= day4) {
    const mu = document.createElement('div');
    mu.className = 'section-card';
    mu.innerHTML = `
      <div class="section-title">🧠 默写时间到！</div>
      <p class="kid-font small">试着不看书默写一遍，拍照上传。</p>
      <button class="btn-finish" id="poemDictation" style="background:linear-gradient(135deg,#F1948A,#E74C3C);">📸 上传默写</button>
      <div id="poemDictationImg"></div>
    `;
    ct.appendChild(mu);
    mu.querySelector('#poemDictation').onclick = async () => {
      const photos = await takePhotos({ tip:'默写拍清楚', uid });
      if (photos && photos.length) {
        mu.querySelector('#poemDictationImg').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
        DB.save();
        Mother.pushCheck(uid, 'poem_dictation', { text: selectedPoem.text });
        toast('已通知妈妈检查');
      }
    };
  }
}

/* 语文阅读理解 */
function renderReadZh(ct, uid, item, plan) {
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">💡 解题技巧学习</div>
      <p class="small muted">用录音的方式把今天学到的解题技巧录下来</p>
      <button class="btn-finish" id="skillRecord">🎤 录制技巧</button>
      <div id="skillText" class="mt-12"></div>
    </div>
    <div class="section-card">
      <div class="section-title">✍️ 练习题拍照</div>
      <button class="btn-finish" id="doPractice">📸 拍练习题</button>
      <div id="practiceImg" class="mt-12"></div>
    </div>
  `;
  ct.querySelector('#skillRecord').onclick = async () => {
    const rec = await recordAudio({ maxSec: 180 });
    if (!rec) return;
    toast('录音完成，请确认识别内容');
    showModal(`
      <h3>📝 录音转文字</h3>
      <p class="small muted">系统识别结果（可手动修改）</p>
      <textarea id="trans" class="textarea-input" rows="6">（这是识别结果占位）</textarea>
      <div class="modal-actions">
        <button class="btn-primary" data-result="true">✓ 确认提交</button>
        <button class="btn-secondary" data-result="false">取消</button>
      </div>
    `).then(r => {
      if (!r) return;
      const text = $('#trans').value;
      ct.querySelector('#skillText').innerHTML = `<div class="kid-font" style="background:#FFE4EE; padding:10px; border-radius:8px;">${text}</div>`;
      Mother.pushCheck(uid, 'read_zh_skill', { text });
      DB.save();
    });
  };
  ct.querySelector('#doPractice').onclick = async () => {
    const photos = await takePhotos({ tip:'把练习题拍清楚', uid });
    if (photos && photos.length) {
      ct.querySelector('#practiceImg').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
      Mother.pushCheck(uid, 'read_zh_practice', { photos: photos.map(p=>p.dataUrl) });
      DB.save();
      toast('已通知妈妈检查');
    }
  };
}

/* 语文作文深度阅读 */
function renderEssayZh(ct, uid, item, plan) {
  const themes = ['写人（好朋友）','写人（老师）','写人（父母）','写事','写景','写物','写读后感'];
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">📝 本周作文主题</div>
      <div class="chip-row" id="themeChips">
        ${themes.map(t=>`<span class="chip" data-t="${t}">${t}</span>`).join('')}
      </div>
      <p class="kid-font small muted mt-12">💡 每周默写半个，两周完成一个完整作文</p>
    </div>
    <div class="section-card">
      <div class="section-title">📖 优秀作文深度阅读</div>
      <p class="small muted">先朗读一篇优秀范文，再试着默写</p>
      <button class="btn-finish" id="essayRead">🎤 朗读范文</button>
    </div>
    <div class="section-card">
      <div class="section-title">✍️ 默写拍照</div>
      <button class="btn-finish" id="essayWrite">📸 默写拍照</button>
      <div id="essayImg"></div>
    </div>
  `;
  ct.querySelectorAll('#themeChips .chip').forEach(c => {
    c.onclick = () => {
      ct.querySelectorAll('#themeChips .chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
      DB.save();
    };
  });
  ct.querySelector('#essayRead').onclick = async () => {
    const rec = await recordAudio({ maxSec: 300 });
    if (rec) toast('朗读完成');
  };
  ct.querySelector('#essayWrite').onclick = async () => {
    const photos = await takePhotos({ tip:'默写拍清楚', uid });
    if (photos && photos.length) {
      ct.querySelector('#essayImg').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
      Mother.pushCheck(uid, 'essay_zh', { photos: photos.map(p=>p.dataUrl) });
      DB.save();
    }
  };
}

/* 数学计算（拍照） */
function renderCalc(ct, uid, item, plan) {
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">🧮 练习口算一页</div>
      <button class="btn-finish" id="calcShoot">📸 拍照提交</button>
      <div id="calcImg"></div>
    </div>
  `;
  ct.querySelector('#calcShoot').onclick = async () => {
    const photos = await takePhotos({ tip:'把练习页拍清楚', uid });
    if (photos && photos.length) {
      ct.querySelector('#calcImg').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
      Mother.pushCheck(uid, 'math_calc', { photos: photos.map(p=>p.dataUrl) });
      DB.save();
      toast('已通知妈妈检查');
    }
  };
}

/* 数学思维训练 */
function renderMathThink(ct, uid, item, plan) {
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">🧠 今日数学思维主题</div>
      <p class="small muted">选择一个主题，完成后拍照</p>
      <div class="chip-row" id="mtChips">
        <span class="chip" data-t="和差问题">和差问题</span>
        <span class="chip" data-t="植树问题">植树问题</span>
        <span class="chip" data-t="鸡兔同笼">鸡兔同笼</span>
        <span class="chip" data-t="行程问题">行程问题</span>
        <span class="chip" data-t="盈亏问题">盈亏问题</span>
      </div>
    </div>
    <div class="section-card">
      <div class="section-title">📸 拍照提交</div>
      <button class="btn-finish" id="mtShoot">📸 拍照</button>
      <div id="mtImg"></div>
    </div>
  `;
  ct.querySelectorAll('#mtChips .chip').forEach(c => {
    c.onclick = () => {
      ct.querySelectorAll('#mtChips .chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
    };
  });
  ct.querySelector('#mtShoot').onclick = async () => {
    const photos = await takePhotos({ tip:'把练习题拍清楚', uid });
    if (photos && photos.length) {
      ct.querySelector('#mtImg').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
      Mother.pushCheck(uid, 'math_thinking', { photos: photos.map(p=>p.dataUrl) });
      DB.save();
    }
  };
}

/* 王老师数学课堂（20讲+30练倒计时） */
function renderWangClass(ct, uid, item, plan) {
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">🎓 王老师数学课堂</div>
      <p class="kid-font small">讲课 <b>20</b> 分钟 + 练习 <b>30</b> 分钟</p>
      <div class="text-center mt-12">
        <button class="btn-finish" id="wangStart" style="background:linear-gradient(135deg,#3498DB,#2980B9);">⏱ 开始学习</button>
      </div>
    </div>
    <div id="wangArea"></div>
  `;
  const area = ct.querySelector('#wangArea');
  ct.querySelector('#wangStart').onclick = () => {
    area.innerHTML = `
      <div class="section-card">
        <div class="section-title">⏱ 学习中</div>
        <div class="countdown"><span class="countdown-num" id="wangRemain">3000</span> 秒</div>
        <p class="small muted">讲课 20 分钟 + 练习 30 分钟，总 50 分钟</p>
      </div>
      <div class="section-card" id="wangNote" style="display:none;">
        <div class="section-title">📖 今日学到</div>
        <textarea id="wangNew" class="textarea-input" rows="3" placeholder="请写下今天学到的新知识..."></textarea>
        <button class="btn-finish" id="wangRec" style="background:linear-gradient(135deg,#56CCF2,#2F80ED);">🎤 录音总结</button>
        <div id="wangRecText" class="mt-12"></div>
        <button class="btn-finish" id="wangSubmit">📤 提交给妈妈</button>
      </div>
    `;
    let rem = 50*60;
    const t = setInterval(()=>{
      rem--;
      const m = Math.floor(rem/60), s = rem%60;
      area.querySelector('#wangRemain').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (rem <= 0) {
        clearInterval(t);
        area.querySelector('#wangNote').style.display = '';
        toast('⏱ 时间到！写下今日所学');
      }
    }, 1000);

    area.querySelector('#wangRec').onclick = async () => {
      const rec = await recordAudio({ maxSec: 180 });
      if (rec) {
        // 模拟转文字
        showModal(`
          <h3>📝 录音转文字</h3>
          <textarea id="wangTrans" class="textarea-input" rows="4">（识别占位）</textarea>
          <div class="modal-actions">
            <button class="btn-primary" data-result="true">✓ 确认</button>
          </div>
        `).then(()=>{
          if ($('#wangTrans')) {
            area.querySelector('#wangRecText').innerHTML = `<div class="kid-font" style="background:#D6EAF8; padding:10px; border-radius:8px;">${$('#wangTrans').value}</div>`;
          }
        });
      }
    };
    area.querySelector('#wangSubmit').onclick = () => {
      Mother.pushCheck(uid, 'wang_class', { note: $('#wangNew').value });
      DB.save();
      toast('已提交');
    };
  };
}

/* 英语新概念 */
function renderNCE(ct, uid, item, plan) {
  renderEngNote(ct, uid, '英语新概念', 'nce');
}

/* 牛津英语 */
function renderOxford(ct, uid, item, plan) {
  renderEngNote(ct, uid, '英语牛津', 'oxford');
}

function renderEngNote(ct, uid, name, type) {
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">📝 书面笔记 + 单词 + 练习</div>
      <button class="btn-finish" id="engNoteShoot">📸 拍照笔记</button>
      <div id="engNoteImg"></div>
    </div>
    <div class="section-card">
      <div class="section-title">🎤 朗读文章（仅周日 ${name==='英语牛津'?'牛津':''}）</div>
      <button class="btn-finish" id="engRead">🎤 录制朗读</button>
    </div>
  `;
  ct.querySelector('#engNoteShoot').onclick = async () => {
    const photos = await takePhotos({ tip:'把笔记拍清楚', uid });
    if (photos && photos.length) {
      ct.querySelector('#engNoteImg').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
      Mother.pushCheck(uid, `${type}_note`, { photos: photos.map(p=>p.dataUrl) });
      DB.save();
    }
  };
  ct.querySelector('#engRead').onclick = async () => {
    const rec = await recordAudio({ maxSec: 300 });
    if (rec) {
      Mother.pushCheck(uid, `${type}_read`, { audio: rec.dataUrl });
      DB.save();
      toast('朗读上传完成');
    }
  };
}

/* 1000词 */
function renderWords1000(ct, uid, item, plan) {
  renderEngNote(ct, uid, '英语1000词', 'words1000');
}

/* 英语阅读打卡（4段录音） */
function renderSpeakDaily(ct, uid, item, plan) {
  const items = [
    { name: '新概念录音', key: 'nce' },
    { name: '牛津录音', key: 'oxford' },
    { name: '1000词录音', key: 'words' },
    { name: '英文课本录音', key: 'textbook' }
  ];
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">🗣️ 今日英语打卡</div>
      <p class="kid-font small muted">每段单独录音</p>
    </div>
  `;
  items.forEach(it => {
    const div = document.createElement('div');
    div.className = 'list-card';
    div.innerHTML = `
      <div class="list-icon">🎤</div>
      <div class="list-body">
        <div class="list-title kid-font">${it.name}</div>
        <div class="list-sub">点击录音</div>
      </div>
      <button class="btn-primary" style="padding:6px 12px; font-size:13px;">开始</button>
    `;
    ct.appendChild(div);
    div.querySelector('button').onclick = async () => {
      const rec = await recordAudio({ maxSec: 180 });
      if (rec) {
        Mother.pushCheck(uid, `speak_${it.key}`, { audio: rec.dataUrl });
        div.querySelector('button').textContent = '✅';
        div.querySelector('.list-sub').textContent = `时长 ${rec.duration} 秒`;
        DB.save();
      }
    };
  });
}

/* 简单拍照类型（英文阅读、英文听力、英文作文、豆包） */
function renderSimplePhoto(ct, uid, item, plan) {
  const typeName = {
    eng_reading: '英文阅读理解',
    eng_essay: '英文作文',
    doubao: '和豆包英语口语对话'
  }[plan.type] || plan.name;
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">📸 ${typeName}</div>
      <p class="kid-font small muted">${plan.desc}</p>
      <button class="btn-finish" id="simShoot">📸 现场拍照</button>
      <div id="simImg"></div>
    </div>
  `;
  ct.querySelector('#simShoot').onclick = async () => {
    const photos = await takePhotos({ tip:`拍下${typeName}`, uid });
    if (photos && photos.length) {
      ct.querySelector('#simImg').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
      Mother.pushCheck(uid, plan.type, { photos: photos.map(p=>p.dataUrl) });
      DB.save();
    }
  };
}

/* 百词斩 - 录入单词 + 自动出阅读理解 */
function renderBCZ(ct, uid, item, plan) {
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">🌱 百词斩</div>
      <p class="kid-font small muted">从百词斩学到的新单词录入（至少15个）</p>
      <div id="bczWordsList"></div>
      <div class="recipe-input">
        <input id="bczWord" class="text-input" placeholder="英文" />
        <input id="bczMeaning" class="text-input" placeholder="中文" />
        <button class="btn-primary" id="bczAdd">＋</button>
      </div>
      <button class="btn-finish" id="bczFinish" style="background:linear-gradient(135deg,#6FCF97,#27AE60); margin-top:10px;">📚 完成录入并出题</button>
    </div>
    <div id="bczReading"></div>
  `;
  const list = DB.data.bczWords[uid] || [];
  const todayW = list.filter(w => w.date === today());
  ct.querySelector('#bczWordsList').innerHTML = todayW.length ? todayW.map((w,i) => `
    <span class="chip" data-i="${i}">${w.word} = ${w.meaning}</span>
  `).join('') : '<p class="muted small">今天还没录入单词</p>';

  ct.querySelector('#bczAdd').onclick = () => {
    const w = ct.querySelector('#bczWord').value.trim();
    const m = ct.querySelector('#bczMeaning').value.trim();
    if (!w || !m) return toast('请填完整');
    DB.data.bczWords[uid].push({ word: w, meaning: m, date: today() });
    DB.save();
    renderBCZ(ct, uid, item, plan);
  };

  ct.querySelector('#bczFinish').onclick = () => {
    if (todayW.length < 15) return toast(`还需要录入 ${15-todayW.length} 个单词`);
    // 出阅读理解
    const words = todayW.slice(0, 15);
    const passage = `Today we are going to learn some new words: ${words.map(w=>w.word).join(', ')}. ` +
      `Try to use them in your own sentences. ` +
      words.slice(0,3).map(w=>`Example: "${w.word}" means "${w.meaning}".`).join(' ');
    ct.querySelector('#bczReading').innerHTML = `
      <div class="section-card">
        <div class="section-title">📝 阅读理解题（5题）</div>
        <div style="background:#F8F9FA; padding:12px; border-radius:8px; font-family:'KID',cursive; line-height:1.7;">
          ${passage}
        </div>
        <ol style="text-align:left; padding-left:20px; margin-top:10px;">
          ${[
            `How many words are mentioned in the passage?`,
            `What does "${words[0].word}" mean?`,
            `Translate "${words[1].word}" into Chinese.`,
            `Use "${words[2].word}" to make a sentence.`,
            `Which word means "${words[3].meaning}"?`
          ].map((q,i)=>`<li style="margin:6px 0;">${q}</li>`).join('')}
        </ol>
        <button class="btn-finish" id="bczPhoto" style="background:linear-gradient(135deg,#56CCF2,#2F80ED);">📸 拍照答题</button>
        <div id="bczPhotoArea"></div>
      </div>
    `;
    ct.querySelector('#bczPhoto').onclick = async () => {
      const photos = await takePhotos({ tip:'把答题拍下来', uid });
      if (photos && photos.length) {
        ct.querySelector('#bczPhotoArea').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
        Mother.pushCheck(uid, 'bcz', { passage, photos: photos.map(p=>p.dataUrl) });
        DB.save();
        toast('已通知妈妈');
      }
    };
  };
}

/* 学霸单元卷 */
function renderTest(ct, uid, item, plan) {
  const subj = { math_test:'数学', zh_test:'语文', en_test:'英语' }[plan.type];
  ct.innerHTML = `
    <div class="section-card">
      <div class="section-title">📐 学霸${subj}单元卷</div>
      <button class="btn-finish" id="testShoot">📸 拍下卷子</button>
      <div id="testImg"></div>
      <div class="mt-12">
        <label class="kid-font">你的得分</label>
        <input id="testScore" type="number" class="text-input" placeholder="0-100" />
      </div>
      <button class="btn-finish" id="testSubmit">提交</button>
    </div>
  `;
  ct.querySelector('#testShoot').onclick = async () => {
    const photos = await takePhotos({ tip:'拍下你的卷子', uid });
    if (photos && photos.length) {
      ct.querySelector('#testImg').innerHTML = photosGridHtml(photos.map(p=>p.dataUrl));
    }
  };
  ct.querySelector('#testSubmit').onclick = () => {
    const score = ct.querySelector('#testScore').value;
    if (!score) return toast('请先填写分数');
    Mother.pushCheck(uid, plan.type, { photo: ct.querySelector('#testImg img')?.src, score });
    DB.save();
    toast('已提交给妈妈检查');
  };
}

/* ============================================================
   第 14 节：积分商城
   ============================================================ */
async function renderShop(uid) {
  showPage('child');
  const p = PROFILES[uid];
  const u = DB.user(uid);

  const html = `
    <div class="summary-card" style="background:linear-gradient(135deg,#FFD166,#FF9F1C)">
      <div>
        <div class="num">${u.points||0}</div>
        <div class="lbl">我的积分</div>
      </div>
      <div style="text-align:right;">
        <div class="num">Lv${u.pet?.level||1}</div>
        <div class="lbl">宠物等级</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">🎁 虚拟小卖部</div>
      <div class="shop-grid" id="shopGrid"></div>
    </div>

    <div class="section-card">
      <div class="section-title">📜 最近积分记录</div>
      <div id="pointsLog"></div>
    </div>
  `;

  const sub = openSubpage({ title: '积分商城', body: html });
  sub.querySelector('#shopGrid').innerHTML = SHOP_ITEMS.map(s => `
    <div class="shop-item" data-id="${s.id}">
      <div class="shop-emoji">${s.emoji}</div>
      <div class="shop-name kid-font">${s.name}</div>
      <div class="shop-cost">🌟 ${s.cost} 分</div>
      <button class="shop-btn" data-id="${s.id}">兑换</button>
    </div>
  `).join('');
  sub.querySelectorAll('[data-id] button').forEach(b => {
    b.onclick = () => {
      const item = SHOP_ITEMS.find(s => s.id === b.dataset.id);
      if (!item) return;
      if ((u.points||0) < item.cost) return toast('积分不够哦～');
      if (!confirm(`兑换 ${item.name} 吗？`)) return;
      u.points -= item.cost;
      u.records = u.records || [];
      u.records.push({ ts: Date.now(), delta: -item.cost, reason: '兑换' + item.name });
      DB.save();
      Mother.pushCheck(uid, 'shop_exchange', { item: item.name });
      toast(`已兑换，等待妈妈确认！`);
      renderShop(uid);
    };
  });

  sub.querySelector('#pointsLog').innerHTML = (u.records||[]).slice(-15).reverse().map(r=>`
    <div class="list-card">
      <div class="list-icon">${r.delta>0?'➕':'➖'}</div>
      <div class="list-body">
        <div class="list-title">${r.reason}</div>
        <div class="list-sub">${new Date(r.ts).toLocaleString('zh-CN')}</div>
      </div>
      <span class="kid-font" style="color:${r.delta>0?'#27AE60':'#E74C3C'}; font-weight:bold;">${r.delta>0?'+':''}${r.delta}</span>
    </div>
  `).join('') || '<p class="muted small">暂无积分记录</p>';
}

/* ============================================================
   第 15 节：宠物
   ============================================================ */
async function renderPet(uid) {
  showPage('child');
  const p = PROFILES[uid];
  const u = DB.user(uid);
  const pet = u.pet;
  if (!Array.isArray(pet.ownedOutfits)) pet.ownedOutfits = [];
  if (pet.outfit !== null && !pet.ownedOutfits.includes(pet.outfit)) pet.outfit = null;

  const stateMsg = {
    happy: '小家伙开心地蹦蹦跳跳～🎉',
    confused: '头顶有个❓，它有点困惑哦～',
    sick: '小家伙生病了，要好好照顾它！',
    cry: '它在哭泣……快安慰它～',
    angry: '它背对着你，需要做复活任务！'
  }[pet.state];

  // 状态对应动画类
  const animClass = pet.state==='happy' ? 'anim-bounce'
                  : pet.state==='sick'  ? 'anim-wobble'
                  : pet.state==='cry'   ? 'anim-wobble'
                  : pet.state==='angry' ? 'anim-shake'
                  : 'anim-idle';

  const outfit = PET_OUTFITS.find(o => o.id === pet.outfit);
  const bodyEmoji = pet.state==='sick'?'🤒':pet.state==='cry'?'😢':pet.state==='angry'?'😠':pet.state==='confused'?'🤔':pet.emoji;

  const html = `
    <div class="pet-stage-v2">
      <div class="pet-scene">
        <div class="pet-figure ${animClass}">
          ${outfit && outfit.slot==='hat'  ? `<span class="pf pf-hat">${outfit.emoji}</span>` : ''}
          ${outfit && outfit.slot==='face' ? `<span class="pf pf-face">${outfit.emoji}</span>` : ''}
          <span class="pf-body">${bodyEmoji}</span>
          ${outfit && outfit.slot==='neck' ? `<span class="pf pf-neck">${outfit.emoji}</span>` : ''}
          ${outfit && outfit.slot==='hand' ? `<span class="pf pf-hand">${outfit.emoji}</span>` : ''}
        </div>
        <div class="pet-ground"></div>
      </div>
      <div class="pet-name kid-font">${pet.name}${outfit ? ' ' + outfit.emoji : ''}</div>
      <div class="pet-level">Lv.${pet.level} · ${pet.exp}/${pet.level*20} EXP</div>
      <div class="kid-font mt-12">${stateMsg}</div>
    </div>

    <div class="section-card">
      <div class="section-title">🐾 我的宠物伙伴</div>
      <p class="small muted">等级达到即可解锁新伙伴；换宠物会保留等级和经验哦</p>
      <div class="pet-select-grid">
        ${PET_LIBRARY.map(pc => {
          const locked = (pet.level||1) < pc.unlock;
          const cur = pet.type === pc.type;
          return `<div class="pet-card ${cur?'cur':''} ${locked?'locked':''}" data-type="${pc.type}">
            <div class="pc-emoji">${locked?'🔒':pc.emoji}</div>
            <div class="pc-name kid-font">${pc.name}</div>
            <div class="pc-sub">${cur ? '我的伙伴' : (locked ? 'Lv.'+pc.unlock+' 解锁' : '点我领养')}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">👗 宠物装扮商店</div>
      <p class="small muted">我的积分：<b>${u.points||0}</b> · 已拥有 ${pet.ownedOutfits.length}/${PET_OUTFITS.length} 件</p>
      <div class="outfit-grid">
        ${PET_OUTFITS.map(o => {
          const owned = pet.ownedOutfits.includes(o.id);
          const wearing = pet.outfit === o.id;
          const afford = (u.points||0) >= o.price;
          return `<div class="outfit-card ${wearing?'wearing':''}">
            <div class="oc-emoji">${o.emoji}</div>
            <div class="oc-name kid-font">${o.name}</div>
            <div class="oc-price">${owned ? '✓ 已拥有' : o.price + ' 积分'}</div>
            ${wearing ? `<button class="btn-mini" disabled>穿着中</button>`
              : owned ? `<button class="btn-mini wear-outfit" data-id="${o.id}">穿上</button>`
              : `<button class="btn-mini buy-outfit" data-id="${o.id}" ${afford?'':'disabled'}>${afford?'购买':'积分不足'}</button>`}
          </div>`;
        }).join('')}
      </div>
      ${pet.outfit ? `<button class="btn-finish mt-12" id="takeOffOutfit" style="background:#95a5a6; box-shadow:0 4px 0 #616a6b;">脱下装扮</button>` : ''}
    </div>

    <div class="section-card">
      <div class="section-title">📊 养成记录</div>
      <p>登录天数：<b>${u.streakDays||0}</b> 天</p>
      <p>本周完成任务：<b>${Object.values(DB.data.studyDaily[uid]||{}).filter(d=>new Date(d.generatedAt).getTime()>Date.now()-7*86400000).reduce((s,d)=>s+d.plans.filter(p=>p.state==='done').length,0)}</b></p>
    </div>

    <div class="section-card">
      <div class="section-title">🍖 喂食</div>
      <p class="kid-font small">每天完成任务可以获得经验值</p>
      <button class="btn-finish" id="feedPet">🍖 喂食（消耗 5 积分）</button>
    </div>

    ${pet.state === 'sick' || pet.state === 'angry' ? `
      <div class="section-card" style="background:#FADBD8; border-left:5px solid #E74C3C;">
        <div class="section-title" style="color:#922B21;">🩺 复活任务</div>
        <p class="kid-font small">做 3 道口算题或录制 1 分钟朗读视频，让宠物恢复！</p>
        <button class="btn-finish" id="revivePet" style="background:linear-gradient(135deg,#F1948A,#E74C3C);">开始复活任务</button>
      </div>
    `:''}
  `;

  const sub = openSubpage({ title: '我的宠物', body: html });

  // 换宠物
  sub.querySelectorAll('.pet-card').forEach(card => {
    card.onclick = () => {
      const pc = PET_LIBRARY.find(x => x.type === card.dataset.type);
      if (!pc) return;
      if ((pet.level||1) < pc.unlock) return toast('达到 Lv.' + pc.unlock + ' 才能领养 ' + pc.name + '，加油升级吧！');
      if (pet.type === pc.type) return;
      pet.type = pc.type;
      pet.emoji = pc.emoji;
      pet.name = pc.name;   // 换宠物换名字，等级经验保留
      DB.save();
      bigEncourage('新伙伴 ' + pc.name + ' 加入啦！' + pc.emoji, 0);
      renderPet(uid);
    };
  });

  // 买装扮 / 穿装扮
  sub.querySelectorAll('.buy-outfit, .wear-outfit').forEach(btn => {
    btn.onclick = () => {
      const o = PET_OUTFITS.find(x => x.id === btn.dataset.id);
      if (!o) return;
      if (!pet.ownedOutfits.includes(o.id)) {
        if ((u.points||0) < o.price) return toast('积分不够哦，完成任务赚积分吧！');
        u.points -= o.price;
        pet.ownedOutfits.push(o.id);
        toast('成功购买 ' + o.name + ' ' + o.emoji);
      }
      pet.outfit = o.id;
      DB.save();
      renderPet(uid);
    };
  });
  const takeOff = sub.querySelector('#takeOffOutfit');
  if (takeOff) {
    takeOff.onclick = () => {
      pet.outfit = null;
      DB.save();
      renderPet(uid);
    };
  }

  sub.querySelector('#feedPet').onclick = () => {
    if ((u.points||0) < 5) return toast('积分不够');
    u.points -= 5;
    u.pet.exp += 5;
    while (u.pet.exp >= u.pet.level * 20) {
      u.pet.exp -= u.pet.level * 20;
      u.pet.level++;
      bigEncourage(`${u.pet.name} 升级了！Lv.${u.pet.level}`, 0);
    }
    DB.save();
    renderPet(uid);
  };

  const reviveBtn = sub.querySelector('#revivePet');
  if (reviveBtn) {
    reviveBtn.onclick = async () => {
      // 复活任务：1分钟朗读
      const rec = await recordAudio({ maxSec: 60 });
      if (!rec) return;
      u.pet.state = 'happy';
      DB.save();
      bigEncourage(u.pet.name + ' 恢复健康啦！', 5);
      addPoints(uid, 5, '复活任务');
      renderPet(uid);
    };
  }
}

function hashCode(s) {
  let h = 0;
  for (let i=0;i<s.length;i++) h = ((h<<5)-h)+s.charCodeAt(i);
  return h;
}

/* ============================================================
   第 16 节：妈妈后台
   ============================================================ */
let _motherState = { tab: 'home', child: 'janny' };

async function renderMother(tab = 'home', child = 'janny') {
  showPage('child');
  $$('.page-child').forEach(p=>p.classList.add('theme-girl'));
  $$('.page-child').forEach(p=>p.classList.add('theme-boy'));
  $$('.page-child').forEach(p=>p.removeAttribute('data-active'));
  $$('.page').forEach(p => p.removeAttribute('data-active'));
  document.querySelector('.page-home').setAttribute('data-active', 'true');
  _motherState.tab = tab;
  _motherState.child = child;
  // 创建
  showMother(tab, child);
}

function showMother(tab, child) {
  $$('.subpage').forEach(s => s.remove());
  const sec = document.createElement('section');
  sec.className = 'subpage';
  sec.setAttribute('data-active', 'true');
  const titleMap = {
    home: '妈妈后台',
    homework: '作业检查',
    mistakes: '错题查看',
    plans: '计划分配',
    poems: '古诗管理',
    checks: '推送箱',
    rewards: '奖励设置',
    punish: '惩罚设置',
    settings: '系统设置'
  };
  sec.innerHTML = `
    <header class="subpage-header" style="background:linear-gradient(135deg,#9B59B6,#8E44AD);">
      <button class="subpage-back">←</button>
      <h2>${titleMap[tab]||'妈妈后台'}</h2>
      <span style="width:40px"></span>
    </header>
    <div class="subpage-content">
      ${motherTabs(tab, child)}
    </div>
  `;
  $('appMain').appendChild(sec);
  sec.querySelector('.subpage-back').onclick = () => history.back();

  // 渲染内容
  motherBody(sec, tab, child);
}

function motherTabs(tab, child) {
  const tabs = [
    { id:'home', label:'概览' },
    { id:'homework', label:'作业检查' },
    { id:'mistakes', label:'错题查看' },
    { id:'plans', label:'计划分配' },
    { id:'poems', label:'古诗管理' },
    { id:'checks', label:'推送箱' },
    { id:'rewards', label:'奖励设置' },
    { id:'punish', label:'惩罚' },
    { id:'accounts', label:'账户' },
    { id:'settings', label:'系统' }
  ];
  const childIds = Object.keys(DB.data.users);
  return `
    <div class="mother-tabs">
      ${tabs.map(t=>`<button class="${t.id===tab?'active':''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div class="mother-child-tabs">
      ${childIds.map(id=>{
        const p = PROFILES[id] || {};
        return `<button class="${child===id?(p.gender==='boy'?'active-boy':'active-girl'):''}" data-child="${id}">${p.name||id}（${p.grade||''}）</button>`;
      }).join('')}
    </div>
    <div id="motherBody"></div>
  `;
}

function motherBody(scope, tab, child) {
  /* 计划分配页有未保存草稿时，先询问再离开（避免妈妈误丢改动） */
  const leavePlanGuard = (toTab) => {
    if (_planDirty(child) && toTab !== 'plans') {
      if (!confirm('计划分配还有未保存的修改，离开将丢失。确定要离开吗？')) return false;
      _dropPlanDraft();
    }
    return true;
  };
  scope.querySelectorAll('[data-tab]').forEach(b => {
    b.onclick = () => {
      if (!leavePlanGuard(b.dataset.tab)) return;
      go(`mother/${b.dataset.tab}/${child}`);
    };
  });
  scope.querySelectorAll('[data-child]').forEach(b => {
    b.onclick = () => {
      if (!leavePlanGuard(tab)) return;
      go(`mother/${tab}/${b.dataset.child}`);
    };
  });
  const body = scope.querySelector('#motherBody');
  if (tab === 'home') renderMomHome(body, child);
  else if (tab === 'homework') renderMomHomework(body, child);
  else if (tab === 'mistakes') renderMomMistakes(body, child);
  else if (tab === 'plans') renderMomPlans(body, child);
  else if (tab === 'poems') renderMomPoems(body, child);
  else if (tab === 'checks') renderMomChecks(body, child);
  else if (tab === 'rewards') renderMomRewards(body, child);
  else if (tab === 'punish') renderMomPunish(body, child);
  else if (tab === 'accounts') renderMomAccounts(body);
  else if (tab === 'settings') renderMomSettings(body);
}

/* 妈妈后台 - 概览 */
function renderMomHome(body, child) {
  const p = PROFILES[child];
  const u = DB.user(child);
  const daily = DB.dailyPlan(child);
  const points = u.points||0;
  const todo = daily.plans.filter(p=>p.state!=='done').length;
  body.innerHTML = `
    <div class="summary-card purple">
      <div>
        <div class="num">${u.streakDays||0}</div>
        <div class="lbl">坚持天数</div>
      </div>
      <div style="text-align:right;">
        <div class="num">${points}</div>
        <div class="lbl">${p.name}积分</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">📊 今日完成</div>
      <div class="module-progress"><div class="module-progress-fill" style="width:${daily.plans.length?Math.round((daily.plans.length-todo)/daily.plans.length*100):0}%"></div></div>
      <p class="small">${daily.plans.length-todo}/${daily.plans.length} 任务</p>
    </div>

    <div class="section-card">
      <div class="section-title">📨 推送箱（最新5条）</div>
      <div id="momPreview"></div>
    </div>
  `;
  const checks = Object.entries(DB.data.momChecks).filter(([k])=>k.startsWith(child+'_')).sort((a,b)=>b[1].ts-a[1].ts).slice(0,5);
  body.querySelector('#momPreview').innerHTML = checks.length ? checks.map(([k,v])=>`
    <div class="list-card">
      <div class="list-icon">📨</div>
      <div class="list-body">
        <div class="list-title">${v.type}</div>
        <div class="list-sub">${new Date(v.ts).toLocaleString('zh-CN')}</div>
      </div>
      <span class="tag ${v.status==='reviewed'?'tag-done':'tag-pending'}">${v.status==='reviewed'?'已查看':'待检查'}</span>
    </div>
  `).join('') : '<p class="muted small">还没有推送</p>';
}

/* 妈妈后台 - 作业检查 */
function renderMomHomework(body, child) {
  const hwMap = DB.data.homework[child] || {};
  const days = Object.entries(hwMap).sort((a,b)=>b[0].localeCompare(a[0])).slice(0, 14);
  body.innerHTML = days.length ? days.map(([d,v]) => `
    <div class="check-row">
      <h3 class="kid-font" style="color:#FF4F8B; margin:0 0 8px;">📅 ${d}</h3>
      <p>${v.content || '<span class="muted">无内容</span>'}</p>
      ${v.photo ? `<img class="check-photo" src="${v.photo}" />`:''}
      <div class="check-actions">
        <button class="btn-primary" data-act="ok" data-date="${d}" data-child="${child}">✅ 没错误</button>
        <button class="btn-secondary" data-act="wrong" data-date="${d}" data-child="${child}">❌ 有错误</button>
      </div>
    </div>
  `).join('') : '<div class="section-card text-center muted"><p>还没有作业记录</p></div>';
  body.querySelectorAll('[data-act]').forEach(b => {
    b.onclick = () => {
      const d = b.dataset.date, c = b.dataset.child;
      if (b.dataset.act === 'ok') {
        Mother.pushCheck(c, 'homework_ok', { date: d });
        toast('✅ 已确认通过');
      } else {
        // 惩罚
        Mother.sendPenalty('homework', '请检查今天的作业，有错误需要订正', c);
        Mother.pushCheck(c, 'homework_wrong', { date: d });
        toast('已发送提醒');
      }
    };
  });
}

/* 妈妈后台 - 错题查看 */
function renderMomMistakes(body, child) {
  const m = DB.data.mistakes[child] || {};
  const list = Object.entries(m).sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));
  body.innerHTML = list.length ? list.map(([k,v]) => `
    <div class="check-row">
      <h3 class="kid-font" style="color:#E74C3C; margin:0 0 8px;">
        第 ${(v.round||0)+1} 轮${v.archived?'(已掌握)':''}
      </h3>
      <p>${v.question || '(无题目)'}</p>
      ${v.photo ? `<img class="check-photo" src="${v.photo}" />`:''}
      <p class="small muted">下次复习：${v.nextReview || '已归档'}</p>
      <p class="small">错误原因：${v.errorReason || '-'}</p>
      <p class="small">尝试次数：${v.attempts?.length||0}（正确${v.attempts?.filter(a=>a.correct).length||0}）</p>
    </div>
  `).join('') : '<div class="section-card text-center muted"><p>还没有错题</p></div>';
}

/* 妈妈后台 - 计划分配 */
/* 固定日归一化：兼容旧的字符串值，统一返回数组 */
function normalizeFixed(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string' && v) return [v];
  return [];
}

/* ===================== 妈妈后台 - 计划分配（草稿 + 保存并同步） ===================== */
/* 草稿：妈妈修改先写入本地草稿，点「保存并同步」才写库并推到云端全家可见 */
let _planDraft = null;
let _planDraftChild = '';

function fmtTs(ts) {
  try { return new Date(ts).toLocaleString('zh-CN', { hour12:false }); } catch(e) { return ''; }
}

function _draftOf(child) {
  if (_planDraftChild !== child || !_planDraft) {
    const conf = DB.data.weeklyConfig[child] || { enabled:{}, fixedDay:{}, allowSelfAssign:false };
    _planDraft = {
      enabled: Object.assign({}, conf.enabled || {}),
      fixedDay: Object.assign({}, conf.fixedDay || {}),
      allowSelfAssign: !!conf.allowSelfAssign
    };
    _planDraftChild = child;
  }
  return _planDraft;
}

function _dropPlanDraft() { _planDraft = null; _planDraftChild = ''; }

function _planDirty(child) {
  if (!_planDraft || _planDraftChild !== child) return false;
  const conf = DB.data.weeklyConfig[child] || {};
  return JSON.stringify(conf.enabled||{}) !== JSON.stringify(_planDraft.enabled)
    || JSON.stringify(conf.fixedDay||{}) !== JSON.stringify(_planDraft.fixedDay)
    || !!conf.allowSelfAssign !== !!_planDraft.allowSelfAssign;
}

/* 云端同步状态条（依赖 app-sync.js 的 SYNC.cloudHint） */
function _syncBoxHtml() {
  const hasSync = typeof SYNC !== 'undefined' && SYNC.cloudHint;
  const s = hasSync ? SYNC.cloudHint() : { level:'warn', text:'本版本缺少同步模块，数据仅保存在本机' };
  const cls = s.level==='ok' ? 'sync-ok' : (s.level==='err' ? 'sync-err' : 'sync-warn');
  const icon = s.level==='ok' ? '✅' : (s.level==='err' ? '⚠️' : '☁️');
  const setupBtn = `<button class="btn-mini sync-btn" id="btnSyncSetup">⚙️ 开启/修改</button>`;
  const nowBtn = s.level==='ok' ? `<button class="btn-mini sync-btn" id="btnSyncNow">🔄 立即同步</button>` : '';
  return `<div class="sync-box ${cls}"><span class="sync-ic">${icon}</span><span class="sync-txt">${s.text}</span>${nowBtn}${setupBtn}</div>`;
}

function renderMomPlans(body, child) {
  const conf = DB.data.weeklyConfig[child] || {};
  const d = _draftOf(child);
  const dirty = _planDirty(child);
  const meta = (DB.data.planMeta && DB.data.planMeta[child]) || null;
  const sync = (typeof SYNC !== 'undefined' && SYNC.cloudHint) ? SYNC.cloudHint() : null;

  body.innerHTML = `
    ${_syncBoxHtml()}
    <div class="section-card">
      <div class="section-title">⚙️ 每周计划配置</div>
      <p class="small muted">修改每周次数；点亮星期几 = 固定到那几天（可多选）。<br>改完记得点下方<b>「💾 保存并同步到全家」</b>，其他手机/电脑会自动更新。</p>
      <div id="planList"></div>
      <label class="mt-12" style="display:flex; align-items:center; gap:6px;">
        <input type="checkbox" id="allowSelfAssign" ${d.allowSelfAssign?'checked':''} />
        允许孩子自己分配每日计划
      </label>
    </div>

    <div class="plan-save-bar ${dirty?'active':''}">
      <span class="plan-save-status">${dirty ? '<span class="dirty-dot">●</span> 有未保存的修改' : '✅ 已全部保存'}</span>
      <span class="plan-save-actions">
        <button class="btn-secondary" id="planDiscard" style="${dirty?'':'display:none'}">↩️ 撤销修改</button>
        <button class="btn-finish" id="planSave" ${dirty?'':'disabled'}>💾 保存并同步到全家</button>
      </span>
    </div>

    <div class="section-card">
      <div class="section-title">📅 本周分配预览</div>
      <p class="small muted">预览为当前已保存的实际分配；保存新配置后，孩子端打开会按新配置重新分配。</p>
      <div class="week-grid" id="weekGrid"></div>
      <div id="weekPlanList"></div>
    </div>

    <div class="section-card">
      <div class="section-title">🕒 最近修改</div>
      <p class="small muted">${meta ? (meta.by + ' · ' + (meta.atLabel || fmtTs(meta.at))) : '还没有修改记录'}</p>
    </div>
  `;

  const list = body.querySelector('#planList');
  list.innerHTML = PLAN_LIBRARY.map(p => {
    const fixed = normalizeFixed(d.fixedDay[p.id]);
    return `
    <div class="plan-edit-row">
      <div class="per-name">
        <div class="kid-font" style="font-weight:bold;">${p.emoji} ${p.name}</div>
        <div class="small muted">${p.duration}分钟</div>
      </div>
      <div class="per-times">
        <span class="small muted">每周</span>
        <input type="number" data-pid="${p.id}" data-f="times" value="${d.enabled[p.id]}" min="0" max="7" />
        <span class="small muted">次</span>
      </div>
      <span class="tag ${d.enabled[p.id]>0?'tag-done':'tag-pending'}">${d.enabled[p.id]>0?'开启':'关闭'}</span>
      <div class="day-pick" data-pid="${p.id}">
        ${DAYS.map(dy => {
          const on = fixed.includes(dy);
          const wknd = ['sat','sun'].includes(dy);
          return `<span data-day="${dy}" class="${on?'active':''} ${wknd?'weekend':''}">${DAY_NAMES[dy].replace('周','')}</span>`;
        }).join('')}
      </div>
    </div>
  `;
  }).join('');

  /* 刷新底部保存栏状态（草稿变了就亮起来） */
  const refreshSaveUI = () => {
    const isDirty = _planDirty(child);
    const bar = body.querySelector('.plan-save-bar');
    if (bar) {
      bar.classList.toggle('active', isDirty);
      const st = bar.querySelector('.plan-save-status');
      if (st) st.innerHTML = isDirty ? '<span class="dirty-dot">●</span> 有未保存的修改' : '✅ 已全部保存';
      const saveBtn = bar.querySelector('#planSave');
      if (saveBtn) saveBtn.disabled = !isDirty;
      const disc = bar.querySelector('#planDiscard');
      if (disc) disc.style.display = isDirty ? '' : 'none';
    }
  };

  /* 次数修改（只改草稿，不保存） */
  list.querySelectorAll('input[data-f=times]').forEach(inp => {
    inp.onchange = () => {
      _draftOf(child).enabled[inp.dataset.pid] = Math.max(0, Math.min(7, +inp.value || 0));
      const row = inp.closest('.plan-edit-row');
      const tag = row.querySelector('.tag');
      const on = d.enabled[inp.dataset.pid] > 0;
      tag.className = 'tag ' + (on ? 'tag-done' : 'tag-pending');
      tag.textContent = on ? '开启' : '关闭';
      refreshSaveUI();
    };
  });
  /* 多选固定日：点击点亮/熄灭（只改草稿） */
  list.querySelectorAll('.day-pick span').forEach(btn => {
    btn.onclick = () => {
      const pid = btn.parentElement.dataset.pid;
      const day = btn.dataset.day;
      const fixed = normalizeFixed(_draftOf(child).fixedDay[pid]);
      const i = fixed.indexOf(day);
      if (i >= 0) fixed.splice(i, 1); else fixed.push(day);
      _draftOf(child).fixedDay[pid] = fixed;
      btn.classList.toggle('active', fixed.includes(day));
      refreshSaveUI();
    };
  });
  const selfBox = body.querySelector('#allowSelfAssign');
  if (selfBox) {
    selfBox.onchange = (e) => {
      _draftOf(child).allowSelfAssign = e.target.checked;
      refreshSaveUI();
    };
  }

  /* 保存并同步 */
  const saveBtn = body.querySelector('#planSave');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const dd = _draftOf(child);
      const cfg = DB.data.weeklyConfig[child] || (DB.data.weeklyConfig[child] = { enabled:{}, fixedDay:{}, allowSelfAssign:false });
      cfg.enabled = Object.assign({}, dd.enabled);
      cfg.fixedDay = Object.assign({}, dd.fixedDay);
      cfg.allowSelfAssign = !!dd.allowSelfAssign;
      // 记录“谁在什么时候改的”，随云端同步，全家可见
      const me = (typeof AUTH !== 'undefined' && AUTH.current) ? (AUTH.current() || {}) : {};
      const who = me.name || me.username || '妈妈';
      if (!DB.data.planMeta) DB.data.planMeta = {};
      DB.data.planMeta[child] = { by: who, at: Date.now(), atLabel: fmtTs(Date.now()) };
      // 清掉孩子今天已生成的计划缓存：孩子端下次打开自动按新配置重排
      if (DB.data.studyDaily[child]) delete DB.data.studyDaily[child][today()];
      _dropPlanDraft();
      DB.save();
      renderMomPlans(body, child);
      toast('💾 已保存，正在同步到云端…', 1800);
      setTimeout(() => {
        if (typeof SYNC !== 'undefined' && SYNC.pushNow) {
          SYNC.pushNow().then(r => {
            if (r && r.ok) toast('✅ 已同步：其他手机/电脑打开会自动看到新计划', 3000);
            else if (r && r.msg) toast('☁️ 已存在本机；云端同步未完成：' + r.msg, 4000);
          });
        } else {
          toast('☁️ 已保存在本机（未连接云端，其他设备看不到）', 3500);
        }
      }, 80);
    };
  }
  /* 撤销修改 */
  const discBtn = body.querySelector('#planDiscard');
  if (discBtn) {
    discBtn.onclick = () => {
      _dropPlanDraft();
      renderMomPlans(body, child);
      toast('已撤销全部修改');
    };
  }
  /* 同步操作按钮 */
  const setupBtn = body.querySelector('#btnSyncSetup');
  if (setupBtn) {
    setupBtn.onclick = () => { if (typeof openSyncSetup === 'function') openSyncSetup(); };
  }
  const nowBtn = body.querySelector('#btnSyncNow');
  if (nowBtn) {
    nowBtn.onclick = async () => {
      nowBtn.disabled = true;
      nowBtn.textContent = '🔄 同步中…';
      const r = await (typeof SYNC !== 'undefined' && SYNC.syncNow ? SYNC.syncNow() : Promise.resolve({ok:false,msg:'无同步模块'}));
      nowBtn.disabled = false;
      nowBtn.textContent = '🔄 立即同步';
      if (r && r.ok) toast('✅ 已同步最新数据', 1800);
      else toast('❌ ' + ((r&&r.msg)||'同步失败'), 3000);
      const box = body.querySelector('.sync-box');
      if (box && typeof SYNC !== 'undefined' && SYNC.cloudHint) box.outerHTML = _syncBoxHtml();
    };
  }

  // 周预览
  body.querySelector('#weekGrid').innerHTML = DAYS.map(dy => `
    <div class="week-day ${['sat','sun'].includes(dy)?'weekend':''}">${DAY_NAMES[dy]}</div>
  `).join('');

  const start = (()=>{
    const dt = new Date();
    const dy = dt.getDay();
    const diff = (dy === 0 ? -6 : 1) - dy;
    dt.setDate(dt.getDate() + diff);
    return dt.toISOString().slice(0,10);
  })();
  const userDaily = DB.data.studyDaily[child] || {};
  const preview = [];
  for (let i = 0; i < 7; i++) {
    const dstr = addDays(start, i);
    const plans = (userDaily[dstr] && userDaily[dstr].plans) || [];
    preview.push({ d: dstr, plans });
  }
  body.querySelector('#weekPlanList').innerHTML = preview.map(({ d, plans }) => {
    if (!plans.length) return `<div class="muted small mt-12">${d}（${DAY_NAMES[dayKey(new Date(d))]}）: 无任务</div>`;
    return `
      <div class="section-card">
        <div class="kid-font" style="font-weight:bold;">${d}（${DAY_NAMES[dayKey(new Date(d))]}） · 预计${userDaily[d].totalDuration||0}分钟</div>
        ${plans.map(p => {
          const plan = PLAN_LIBRARY.find(x=>x.id===p.planId);
          return `<span class="chip ${p.state==='done'?'tag-done':''}">${plan.emoji} ${plan.name}</span>`;
        }).join('')}
      </div>
    `;
  }).join('');
}

/* 妈妈后台 - 古诗管理 */
/* 妈妈后台 - 古诗管理：每个孩子独立上传窗口 */
function renderMomPoems(body, child) {
  const kids = Object.keys(DB.data.users);
  body.innerHTML = kids.map(kid => {
    const prof = PROFILES[kid];
    const poems = DB.data.poems[kid] || [];
    return `
    <div class="section-card" style="border-top:4px solid ${prof.color};">
      <div class="section-title">${prof.avatar} ${prof.name}（${prof.grade}）的古诗</div>
      <p class="small muted">给 ${prof.name} 拍照上传今日学习古诗，每首循环学习3天</p>
      <button class="btn-finish poem-photo" data-kid="${kid}" style="background:${prof.color}; box-shadow:0 4px 0 ${prof.colorDeep};">📸 为 ${prof.name} 拍照上传</button>
      <div class="mt-12" style="display:flex; gap:8px;">
        <input id="poemName_${kid}" class="text-input" style="flex:1;" placeholder="诗名（选填）" />
      </div>
      <textarea id="poemText_${kid}" class="textarea-input mt-8" rows="3" placeholder="或输入文字：&#10;静夜思&#10;床前明月光&#10;疑是地上霜"></textarea>
      <button class="btn-secondary poem-add mt-8" data-kid="${kid}">➕ 添加文字古诗</button>
      <div class="small muted mt-12">已上传（${poems.length} 首）</div>
      <div class="poem-list" data-kid="${kid}"></div>
    </div>
  `;
  }).join('');

  // 渲染每个孩子的古诗列表
  const renderList = (kid) => {
    const poems = DB.data.poems[kid] || [];
    const box = body.querySelector(`.poem-list[data-kid="${kid}"]`);
    box.innerHTML = poems.length ? poems.map((p, i)=>`
      <div class="list-card">
        <div class="list-icon">📜</div>
        <div class="list-body">
          <div class="list-title kid-font">${p.name}</div>
          <div class="list-sub" style="white-space:pre-wrap;">${(p.text||'').slice(0,60)}</div>
        </div>
        <button class="btn-secondary" data-kid="${kid}" data-del="${i}" style="padding:4px 8px; font-size:12px;">删</button>
      </div>
    `).join('') : '<p class="muted small">还没有古诗，快为TA上传吧～</p>';
  };
  kids.forEach(renderList);

  // 拍照上传（区分孩子）
  body.querySelectorAll('.poem-photo').forEach(btn => {
    btn.onclick = async () => {
      const kid = btn.dataset.kid;
      const prof = PROFILES[kid];
      const photos = await takePhotos({ tip: '拍下给 ' + prof.name + ' 学的古诗', max: 6 });
      if (photos && photos.length) {
        const text = await ocrImage(photos[0].dataUrl);
        if (!DB.data.poems[kid]) DB.data.poems[kid] = [];
        DB.data.poems[kid].push({ text, photo: photos[0].dataUrl, photos: photos.map(p=>p.dataUrl), name: 'OCR识别', ts: Date.now() });
        DB.save();
        toast('已为 ' + prof.name + ' 上传古诗（' + photos.length + ' 张）');
        renderMomPoems(body, child);
      }
    };
  });

  // 文字添加（区分孩子）
  body.querySelectorAll('.poem-add').forEach(btn => {
    btn.onclick = () => {
      const kid = btn.dataset.kid;
      const prof = PROFILES[kid];
      const poems = DB.data.poems[kid] = DB.data.poems[kid] || [];
      const text = body.querySelector('#poemText_' + kid).value.trim();
      const name = body.querySelector('#poemName_' + kid).value.trim() || `古诗${poems.length+1}`;
      if (!text) return toast('请填内容');
      poems.push({ text, name, ts: Date.now() });
      DB.save();
      toast('已为 ' + prof.name + ' 添加古诗');
      renderMomPoems(body, child);
    };
  });

  // 删除（区分孩子）
  body.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = () => {
      const kid = b.dataset.kid;
      const poems = DB.data.poems[kid] || [];
      if (!confirm('确定删除这首古诗？')) return;
      poems.splice(+b.dataset.del, 1);
      DB.save();
      renderList(kid);
    };
  });
}

/* 妈妈后台 - 推送箱 */
function renderMomChecks(body, child) {
  const all = Object.entries(DB.data.momChecks)
    .filter(([k]) => k.startsWith(child + '_'))
    .sort((a,b)=>b[1].ts-a[1].ts);
  body.innerHTML = all.length ? all.map(([k,v]) => `
    <div class="check-row">
      <h3 class="kid-font" style="margin:0 0 8px; color:#8E44AD;">${v.type}</h3>
      <p class="small muted">${new Date(v.ts).toLocaleString('zh-CN')}</p>
      ${v.data?.photo ? `<img class="check-photo" src="${v.data.photo}" />`:''}
      ${v.data?.text ? `<p class="kid-font">${v.data.text}</p>`:''}
      ${v.data?.score ? `<p>分数：${v.data.score}</p>`:''}
      ${v.data?.audio ? `<audio src="${v.data.audio}" controls></audio>`:''}
      <div class="check-actions">
        <button class="btn-primary" data-ack="${k}">✓ 标记已查看</button>
      </div>
    </div>
  `).join('') : '<div class="section-card text-center muted"><p>暂无推送</p></div>';
  body.querySelectorAll('[data-ack]').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.ack;
      DB.data.momChecks[k].status = 'reviewed';
      DB.save();
      renderMomChecks(body, child);
    };
  });
}

/* 妈妈后台 - 奖励设置 */
function renderMomRewards(body, child) {
  body.innerHTML = `
    <div class="section-card">
      <div class="section-title">🎁 ${PROFILES[child].name}的奖励设置</div>
      <p class="small">当前积分：<b>${DB.user(child).points||0}</b></p>
      <label>调整积分（可加可减）</label>
      <div class="recipe-input">
        <input type="number" id="adjustPoints" class="text-input" placeholder="积分调整 (+/-)" />
        <button class="btn-primary" id="adjustBtn">调整</button>
      </div>
      <div class="muted small mt-12">积分商城内容（系统预设）：</div>
      ${SHOP_ITEMS.map(s=>`<span class="chip">${s.emoji} ${s.name}（${s.cost}分）</span>`).join('')}
    </div>
  `;
  body.querySelector('#adjustBtn').onclick = () => {
    const v = +body.querySelector('#adjustPoints').value;
    if (!v) return;
    addPoints(child, v, '妈妈调整');
    renderMomRewards(body, child);
  };
}

/* 妈妈后台 - 惩罚设置 */
function renderMomPunish(body, child) {
  body.innerHTML = `
    <div class="section-card">
      <div class="section-title">⚠️ 温柔惩罚</div>
      <p class="kid-font small">不发火，用游戏化方式化解冲突</p>
      <button class="btn-finish" id="sendDuster">🪶 发送虚拟鸡毛掸子</button>
      <p class="small muted mt-12">孩子端会收到推送，需要点击"我错了"并朗读"我明天一定认真检查"，宠物才会恢复健康</p>
    </div>
    <div class="section-card">
      <div class="section-title">😢 强制复活任务</div>
      <button class="btn-finish" id="forceRevive" style="background:linear-gradient(135deg,#F1948A,#E74C3C);">触发 3 道口算复活任务</button>
    </div>
    <div class="section-card" style="background:#FFF3CD;">
      <div class="section-title">⚙️ 豆包设置（孩子口语对话）</div>
      <label>等级限制</label>
      <select id="doubaoGrade" class="text-input">
        <option value="kindergarten">幼儿园</option>
        <option value="primary-low" selected>小学低年级</option>
        <option value="primary-high">小学高年级</option>
      </select>
      <label class="mt-12">每日时长上限（分钟）</label>
      <input type="number" id="doubaoTime" class="text-input" value="5" />
      <label>话题白名单（逗号分隔）</label>
      <input type="text" id="doubaoTopics" class="text-input" placeholder="例如：friends,school,food" value="family,school,hobby,animal,food" />
      <button class="btn-finish" id="saveDoubao" style="background:linear-gradient(135deg,#56CCF2,#2F80ED);">保存豆包设置</button>
    </div>
  `;
  body.querySelector('#sendDuster').onclick = () => {
    Mother.sendPenalty('duster', `${PROFILES[child].name}，妈妈觉得你今天要更加认真哦～`, child);
    toast('已发送');
  };
  body.querySelector('#forceRevive').onclick = () => {
    const u = DB.user(child);
    u.pet.state = 'sick';
    DB.save();
    toast('宠物已生病，等待复活');
  };
  body.querySelector('#saveDoubao').onclick = () => {
    toast('豆包设置已保存');
  };
}

/* 妈妈后台 - 系统设置 */
function renderMomSettings(body) {
  const ocr = DB.data.ocr || (DB.data.ocr = { engine:'mock', tencent:{secretId:'',secretKey:'',region:'ap-guangzhou'} });
  const wechat = DB.data.wechat || (DB.data.wechat = { sctKey:'', enabled:false, quietStart:22, quietEnd:7 });
  const pinSet = (typeof PIN_UTIL !== 'undefined') ? PIN_UTIL.isSet() : false;

  body.innerHTML = `
    <div class="section-card">
      <div class="section-title">🔐 妈妈端安全</div>
      <p class="small muted">${pinSet ? '✅ 已设置 PIN 锁屏' : '⚠️ 未设置 PIN，进入后台将不会验证身份'}</p>
      <div class="settings-row">
        <button class="btn-finish" id="changePin">${pinSet ? '修改 PIN' : '设置 PIN'}</button>
        <button class="btn-finish" id="lockNow" style="background:#E67E22; box-shadow:0 4px 0 #A04000;">🔒 立即锁屏</button>
      </div>
      <p class="small muted mt-12">5 分钟无操作将自动锁屏；忘记 PIN 可在锁屏界面导出数据后重置</p>
    </div>

    <div class="section-card">
      <div class="section-title">🔍 OCR 识别引擎</div>
      <p class="small muted">默认"模拟模式"用于演示；真实模式可识别照片中的题目文字</p>
      <div class="settings-row">
        <label class="radio-pill">
          <input type="radio" name="ocrEngine" value="mock" ${ocr.engine==='mock'?'checked':''}>
          <span>🧪 模拟（演示）</span>
        </label>
        <label class="radio-pill">
          <input type="radio" name="ocrEngine" value="tesseract" ${ocr.engine==='tesseract'?'checked':''}>
          <span>🌐 Tesseract.js（本地）</span>
        </label>
        <label class="radio-pill">
          <input type="radio" name="ocrEngine" value="tencent" ${ocr.engine==='tencent'?'checked':''}>
          <span>☁️ 腾讯云 OCR（生产）</span>
        </label>
      </div>
      <details class="mt-12">
        <summary class="small" style="cursor:pointer;color:#4A90E2">📖 各模式说明</summary>
        <ul class="small muted" style="padding-left:20px; line-height:1.8">
          <li><b>模拟</b>：不识别图片，直接从题库随机抽题，适合演示</li>
          <li><b>Tesseract.js</b>：浏览器本地识别中英文，无需联网，准确率约 70-85%，首次需下载约 10MB 训练数据</li>
          <li><b>腾讯云</b>：云端印刷体识别，准确率 95%+，需要 SecretId/SecretKey（每月 1000 次免费）</li>
        </ul>
      </details>
      <div id="tencentCfg" class="mt-12" style="display:${ocr.engine==='tencent'?'block':'none'}; padding:12px; background:#F5F9FF; border-radius:8px;">
        <div class="form-group">
          <label>SecretId</label>
          <input type="text" id="txSecretId" value="${ocr.tencent.secretId||''}" placeholder="AKIDxxxxxxxxx">
        </div>
        <div class="form-group">
          <label>SecretKey</label>
          <input type="password" id="txSecretKey" value="${ocr.tencent.secretKey||''}" placeholder="密钥">
        </div>
        <div class="form-group">
          <label>区域</label>
          <select id="txRegion">
            <option value="ap-guangzhou" ${ocr.tencent.region==='ap-guangzhou'?'selected':''}>广州 (ap-guangzhou)</option>
            <option value="ap-shanghai" ${ocr.tencent.region==='ap-shanghai'?'selected':''}>上海 (ap-shanghai)</option>
            <option value="ap-beijing" ${ocr.tencent.region==='ap-beijing'?'selected':''}>北京 (ap-beijing)</option>
          </select>
        </div>
        <p class="small muted">密钥仅保存在本机浏览器，不会上传到任何服务器</p>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">📲 微信推送（Server酱）</div>
      <p class="small muted">孩子断签、错题连续错、妈妈发送惩罚时，自动推送到妈妈微信</p>
      <div class="form-group">
        <label>SendKey</label>
        <input type="text" id="sctKey" value="${wechat.sctKey||''}" placeholder="SCT2xxxxxxxxxxx">
      </div>
      <div class="form-group">
        <label>免打扰时段</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="number" id="quietStart" min="0" max="23" value="${wechat.quietStart}" style="width:60px"> 时
          <span>~</span>
          <input type="number" id="quietEnd" min="0" max="23" value="${wechat.quietEnd}" style="width:60px"> 时
        </div>
        <p class="small muted">在此时间段不发送推送（默认 22:00-07:00）</p>
      </div>
      <div class="settings-row">
        <button class="btn-finish" id="saveWechat">💾 保存</button>
        <button class="btn-finish" id="testWechat" style="background:#27AE60; box-shadow:0 4px 0 #1E8449;">🧪 发送测试</button>
        <a href="https://sct.ftqq.com/" target="_blank" class="btn-finish" style="background:#3498DB; box-shadow:0 4px 0 #21618C; text-decoration:none; display:inline-block; line-height:2.6;">🔗 注册获取SendKey</a>
      </div>
      <p class="small muted mt-12">
        📌 <b>Server酱</b>是免费微信推送服务，扫码绑定微信后即可接收通知。
        注册 → 绑定微信 → 复制 SendKey 粘贴到上面。
      </p>
    </div>

    <div class="section-card">
      <div class="section-title">📱 PWA 离线 / 添加到主屏幕</div>
      <p class="small muted">状态：<span id="pwaStatus">检测中...</span></p>
      <p class="small muted">缓存版本：<span id="pwaVer">-</span></p>
      <div class="settings-row">
        <button class="btn-finish" id="pwaCheckUpdate">🔄 检查更新</button>
        <button class="btn-finish" id="pwaClearCache" style="background:#E67E22; box-shadow:0 4px 0 #A04000;">🗑 清空缓存</button>
      </div>
      <p class="small mt-12">📌 <b>使用方法</b>：</p>
      <ul class="small muted" style="padding-left:20px; line-height:1.8">
        <li>📱 <b>iPhone Safari</b>：打开网址 → 底部"分享" → "添加到主屏幕"</li>
        <li>📱 <b>安卓 Chrome</b>：打开网址 → 右上角菜单 → "添加到主屏幕" / "安装应用"</li>
        <li>💻 <b>电脑 Chrome</b>：地址栏右侧会出现"安装"图标</li>
      </ul>
    </div>

    <div class="section-card">
      <div class="section-title">☁️ 多设备云同步</div>
      <p class="small muted">开启后，学习计划、积分、作业等数据自动同步：妈妈在一台设备保存，全家任何手机/电脑打开网站都会自动更新。</p>
      <div id="syncCardBody"></div>
    </div>

    <div class="section-card">
      <div class="section-title">💾 数据管理</div>
      <div class="settings-row">
        <button class="btn-finish" id="exportData">📤 导出 JSON</button>
        <button class="btn-finish" id="resetData" style="background:#E74C3C; box-shadow:0 4px 0 #922B21;">🗑 清空所有数据</button>
      </div>
      <p class="small muted mt-12">数据本机会缓存一份；开启上方「多设备云同步」后还会自动同步到云端。清空浏览器数据前请先导出备份。</p>
    </div>

    <div class="section-card">
      <div class="section-title">🌐 局域网访问</div>
      <p class="small">在同一 WiFi 下，手机浏览器打开：</p>
      <p style="background:#FFE4EE; padding:10px; border-radius:8px; font-family:monospace; word-break:break-all;" id="lanUrl">获取中...</p>
    </div>
  `;

  // PIN 操作
  if (body.querySelector('#changePin')) {
    body.querySelector('#changePin').onclick = () => PinLock.changePin();
  }
  if (body.querySelector('#lockNow')) {
    body.querySelector('#lockNow').onclick = () => {
      PinLock.lock();
      toast('🔒 已锁屏');
    };
  }

  // OCR 引擎切换
  body.querySelectorAll('input[name="ocrEngine"]').forEach(r => {
    r.addEventListener('change', () => {
      DB.data.ocr.engine = r.value;
      DB.save();
      const tcfg = body.querySelector('#tencentCfg');
      if (tcfg) tcfg.style.display = r.value === 'tencent' ? 'block' : 'none';
      toast('OCR 引擎已切换为：' + r.value);
    });
  });

  // 腾讯云配置
  const saveTencent = () => {
    DB.data.ocr.tencent.secretId = body.querySelector('#txSecretId').value.trim();
    DB.data.ocr.tencent.secretKey = body.querySelector('#txSecretKey').value.trim();
    DB.data.ocr.tencent.region = body.querySelector('#txRegion').value;
    DB.save();
    toast('✅ 腾讯云配置已保存');
  };
  body.querySelector('#txSecretId')?.addEventListener('change', saveTencent);
  body.querySelector('#txSecretKey')?.addEventListener('change', saveTencent);
  body.querySelector('#txRegion')?.addEventListener('change', saveTencent);

  // 微信推送
  body.querySelector('#saveWechat').onclick = () => {
    DB.data.wechat.sctKey = body.querySelector('#sctKey').value.trim();
    DB.data.wechat.quietStart = parseInt(body.querySelector('#quietStart').value) || 22;
    DB.data.wechat.quietEnd = parseInt(body.querySelector('#quietEnd').value) || 7;
    DB.data.wechat.enabled = !!DB.data.wechat.sctKey;
    DB.save();
    toast('✅ 微信推送配置已保存');
  };
  body.querySelector('#testWechat').onclick = async () => {
    // 先临时保存当前输入
    DB.data.wechat.sctKey = body.querySelector('#sctKey').value.trim();
    DB.save();
    if (!DB.data.wechat.sctKey) { toast('请先填写 SendKey'); return; }
    toast('📤 正在发送测试…', 1500);
    const r = await WECHAT_PUSH.test();
    if (r.ok) toast('✅ 微信推送成功，请查看微信');
    else toast('❌ 推送失败：' + (r.reason || '未知错误'), 4000);
  };

  // PWA 状态
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      const el = body.querySelector('#pwaStatus');
      if (el) el.textContent = reg ? '✅ Service Worker 已注册（支持离线）' : '⚠️ 未注册';
    });
    navigator.serviceWorker.controller?.postMessage({ type: 'GET_VERSION' });
  } else {
    const el = body.querySelector('#pwaStatus');
    if (el) el.textContent = '❌ 浏览器不支持';
  }
  navigator.serviceWorker?.addEventListener('message', e => {
    if (e.data && e.data.type === 'VERSION') {
      const el = body.querySelector('#pwaVer');
      if (el) el.textContent = e.data.version;
    }
  });

  body.querySelector('#pwaCheckUpdate').onclick = async () => {
    toast('🔄 检查更新中…', 1500);
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.update();
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        toast('✅ 已更新，刷新页面即可');
      } else {
        toast('已是最新版本');
      }
    }
  };
  body.querySelector('#pwaClearCache').onclick = async () => {
    if (await showModal('确定清空所有缓存？\n（不影响学习数据）')) {
      navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_CACHE' });
      setTimeout(() => location.reload(), 800);
    }
  };

  // 云同步状态卡
  renderSyncCard(body);

  // 数据导出/重置
  body.querySelector('#exportData').onclick = () => {
    const blob = new Blob([JSON.stringify(DB.data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyApp_${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('✅ 数据已导出');
  };
  body.querySelector('#resetData').onclick = () => DB.reset();

  // 局域网IP
  body.querySelector('#lanUrl').textContent = location.origin;
}

/* ===================== 多设备云同步（设置页卡片 + 配置弹窗） ===================== */
function renderSyncCard(scope) {
  const box = scope.querySelector('#syncCardBody');
  if (!box) return;
  const hasSync = typeof SYNC !== 'undefined';
  const info = (hasSync && SYNC.info) ? SYNC.info() : { connected:false, state:'off', mode:'local', lastSyncAt:0, lastError:'' };
  const hint = (hasSync && SYNC.cloudHint) ? SYNC.cloudHint() : { level:'warn', text:'' };
  const modeTxt = info.mode === 'jsonbin' ? 'JSONBin 云端' : info.mode === 'api' ? '自建后端' : '仅本机';
  let stHtml;
  if (info.connected) stHtml = '<span style="color:#1E8449;font-weight:bold;">✅ 已连接（' + modeTxt + '）</span>';
  else if (info.state === 'keyerror') stHtml = '<span style="color:#C0392B;font-weight:bold;">⚠️ 密钥错误，同步已暂停</span>';
  else if (info.state === 'error' || info.state === 'on') stHtml = '<span style="color:#B9770E;font-weight:bold;">⚠️ ' + (info.lastError || '连接中…') + '</span>';
  else stHtml = '<span style="color:#856404;font-weight:bold;">⭕ 未开启（数据仅保存在本机）</span>';

  box.innerHTML = `
    <p class="small" style="line-height:1.8;">状态：${stHtml}</p>
    <p class="small muted" style="line-height:1.6;">${hint.text}</p>
    ${info.lastSyncAt ? `<p class="small muted">最近一次同步：${fmtTs(info.lastSyncAt)}</p>` : ''}
    <div class="settings-row">
      <button class="btn-finish" id="syncNowBtn" ${info.connected ? '' : 'disabled'} style="background:#27AE60; box-shadow:0 4px 0 #1E8449;">🔄 立即同步</button>
      <button class="btn-finish" id="syncSetupBtn" style="background:#8E44AD; box-shadow:0 4px 0 #6C3483;">${info.connected ? '⚙️ 修改连接' : '🔌 开启/连接'}</button>
    </div>
  `;
  const nw = box.querySelector('#syncNowBtn');
  if (nw) {
    nw.onclick = async () => {
      nw.disabled = true;
      nw.textContent = '🔄 同步中…';
      const r = await ((hasSync && SYNC.syncNow) ? SYNC.syncNow() : Promise.resolve({ ok:false, msg:'同步模块未加载' }));
      nw.disabled = false;
      nw.textContent = '🔄 立即同步';
      if (r && r.ok) toast('✅ 同步完成', 1800);
      else toast('❌ ' + ((r && r.msg) || '同步失败'), 3000);
      renderSyncCard(scope);
    };
  }
  const sb = box.querySelector('#syncSetupBtn');
  if (sb) sb.onclick = () => openSyncSetup();
}

/* 配置云同步弹窗：填写 jsonbin Bin ID + Master Key → 保存并连接 */
function openSyncSetup() {
  const mb = $('modalBody');
  if (!mb) return;
  const cfg = (DB.data && DB.data._syncConfig) || {};
  const hasSync = typeof SYNC !== 'undefined';
  const connected = hasSync && SYNC.info && SYNC.info().connected;
  mb.innerHTML = `
    <h3 style="color:#7D3C98; margin:0 0 10px;">☁️ 多设备云同步设置</h3>
    <p class="small muted" style="line-height:1.7;">学习计划、积分、作业会保存到免费云端。妈妈在一台设备保存后，<b>全家任何手机/电脑打开网站都会自动更新</b>。每台设备只需设置一次。</p>
    <div style="margin:10px 0;"><label style="font-weight:bold; display:block; margin-bottom:4px;">① Bin ID（jsonbin.io → Create Bin 后，URL 中 /v3/b/ 后面那串）</label>
      <input type="text" id="sbBinId" class="text-input" style="width:100%;" placeholder="例：65f2a1b9dc74654018b9xxxx" value="${cfg.binUrl ? (cfg.binUrl.split('/').pop() || '') : ''}" /></div>
    <div style="margin:10px 0;"><label style="font-weight:bold; display:block; margin-bottom:4px;">② X-Master-Key（jsonbin 头像 → API Keys 里复制）</label>
      <input type="password" id="sbKey" class="text-input" style="width:100%;" placeholder="粘贴 X-Master-Key" value="${cfg.masterKey || ''}" /></div>
    <div style="margin:10px 0;"><label style="font-weight:bold; display:block; margin-bottom:4px;">③ X-Access-Key（选填；没设置就留空）</label>
      <input type="password" id="sbAccess" class="text-input" style="width:100%;" placeholder="选填" value="${cfg.accessKey || ''}" /></div>
    <div id="sbResult" style="display:none; margin:8px 0;" class="small"></div>
    <div class="modal-actions" style="flex-wrap:wrap;">
      <button class="btn-secondary" id="sbCancel">取消</button>
      ${connected ? '<button class="btn-secondary" id="sbClear" style="color:#C0392B;">🗑 清除连接</button>' : ''}
      <button class="btn-finish" id="sbSave">💾 保存并连接</button>
    </div>
    <details style="margin-top:10px;"><summary style="cursor:pointer; color:#4A90E2;" class="small">📖 没有 jsonbin 账号？3 步免费开通</summary>
      <div style="line-height:1.9; padding:10px 12px; background:#f6f6f6; border-radius:8px;" class="small muted">
        1) 打开 <b>https://jsonbin.io</b> → Sign up 注册（用邮箱即可）→ 登录<br>
        2) 右上角点 <b>+ Create Bin</b> → 内容随便填 → <b>Create</b>。成功后网址形如 …/v3/b/<b>65f2a1b9xxxx</b>，复制 <b>65f2a1b9xxxx</b> 这串 ID<br>
        3) 点右上角头像 → <b>API Keys</b> → 复制 <b>X-Master-Key</b> 整串<br>
        然后回到本页，把 ID 和 Key 填到上面保存即可。免费版每月 1 万次读写，一家四口完全够用。
      </div>
    </details>
  `;
  $('modal').classList.remove('hidden');
  const setRes = (txt, ok) => {
    const el = $('sbResult');
    if (!el) return;
    el.style.display = 'block';
    el.style.color = ok ? '#1E8449' : '#C0392B';
    el.textContent = txt;
  };
  $('sbCancel').onclick = () => closeModal();
  $('sbSave').onclick = async () => {
    const binId = ($('sbBinId') || {}).value ? $('sbBinId').value.trim() : '';
    const key = ($('sbKey') || {}).value ? $('sbKey').value.trim() : '';
    const acc = ($('sbAccess') || {}).value ? $('sbAccess').value.trim() : '';
    if (!binId || !key) { setRes('请填写 Bin ID 和 X-Master-Key 两项', false); return; }
    const btn = $('sbSave');
    btn.disabled = true;
    btn.textContent = '⏳ 正在连接并同步…';
    setRes('正在连接并上传首次数据…', true);
    if (!hasSync || !SYNC.setCloud) {
      btn.disabled = false;
      btn.textContent = '💾 保存并连接';
      setRes('同步模块未加载，请刷新页面后重试', false);
      return;
    }
    try {
      const r = await SYNC.setCloud(binId, key, acc);
      btn.disabled = false;
      btn.textContent = '💾 保存并连接';
      if (r && r.ok) {
        setRes('✅ 已连接云端并开始同步！其他设备打开网站会自动获取到数据。', true);
        setTimeout(closeModal, 2000);
      } else {
        setRes('❌ ' + ((r && r.msg) || '连接失败，请检查 Bin ID / Key 是否正确'), false);
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = '💾 保存并连接';
      setRes('❌ 连接异常：' + (e && e.message), false);
    }
  };
  const clr = $('sbClear');
  if (clr) {
    clr.onclick = async () => {
      closeModal();
      if (hasSync && SYNC.clearCloud) await SYNC.clearCloud();
      toast('已清除云端连接设置，数据将只保存在本机');
      route();
    };
  }
}

/* 妈妈推送 */
function pushCheck(child, type, data) {
  if (!DB.data.momChecks) DB.data.momChecks = {};
  const k = child + '_' + uid();
  DB.data.momChecks[k] = { type, data, ts: Date.now(), status: 'pending' };
  DB.save();
}

/* 妈妈发惩罚 */
function sendPenalty(type, message, targetChild) {
  const child = targetChild || _motherState.child;
  if (!DB.data.momChecks) DB.data.momChecks = {};
  const k = child + '_' + uid();
  DB.data.momChecks[k] = {
    type: 'punish_' + type,
    data: { message },
    ts: Date.now(),
    status: 'pending'
  };
  DB.save();
  // 微信推送给妈妈
  if (typeof WECHAT_PUSH !== 'undefined' && WECHAT_PUSH) {
    const nameMap = {};
    Object.keys(DB.data.users).forEach(id => nameMap[id] = (PROFILES[id]||{}).name || id);
    WECHAT_PUSH.onPenaltySent(nameMap[child] || child, type, message).catch(()=>{});
  }
}

/* ============================================================
   第 17 节：每日19:00提醒 & 启动时检测
   ============================================================ */
function checkDailyReminder() {
  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes();
  // 在19:00~19:05范围提示一次
  if (hh === 19 && mm < 5) {
    if (APP.currentUser && DB.data.users[APP.currentUser]) {
      const u = DB.user(APP.currentUser);
      const hw = DB.todayHomework(APP.currentUser);
      if (!hw.completed && !hw.skipped) {
        setTimeout(()=> toast(`⏰ ${u.name}，别忘了写今天的作业！`), 1000);
      }
    }
  }
}
setInterval(checkDailyReminder, 60*1000);

/* 启动时检测 */
window.addEventListener('load', () => {
  // 妈妈推送的小提醒
  if (APP.currentUser) {
    const checks = Object.entries(DB.data.momChecks||{})
      .filter(([k])=>k.startsWith(APP.currentUser + '_') && DB.data.momChecks[k].status === 'pending')
      .slice(-3);
    if (checks.length) {
      setTimeout(()=> toast(`📨 你有 ${checks.length} 条新消息`), 1500);
    }
    // 检查惩罚
    const penalties = checks.filter(([k,v]) => v.type.startsWith('punish_'));
    if (penalties.length) {
      setTimeout(()=> {
        const p = penalties[0][1];
        showModal(`
          <h3>📨 妈妈的提醒</h3>
          <p>${p.data?.message || '记得检查今天的学习哦～'}</p>
          ${p.type === 'punish_duster' ? `
            <p class="kid-font">点击"我错了"并朗读一句"我明天一定认真检查"，宠物会恢复健康哦～</p>
            <button class="btn-finish" id="admitWrong">我错了，朗读</button>
          ` : ''}
          ${p.type === 'punish_homework' ? `
            <button class="btn-finish" id="goReview" style="background:linear-gradient(135deg,#F1948A,#E74C3C);">立即检查作业</button>
          ` : ''}
          ${p.type === 'punish_social' ? `
            <p class="small muted">📢 宠物已经向妈妈求助啦～</p>
          ` : ''}
          <div class="modal-actions"><button class="btn-secondary" data-result="true">知道了</button></div>
        `).then(()=> {
          if ($('#admitWrong')) {
            $('#admitWrong').onclick = async () => {
              const rec = await recordAudio({ maxSec: 60 });
              if (rec) {
                const u = DB.user(APP.currentUser);
                u.pet.state = 'happy';
                DB.save();
                toast('宠物恢复健康！');
              }
            };
          }
          if ($('#goReview')) {
            $('#goReview').onclick = () => go(`child/${APP.currentUser}/homework`);
          }
        });
      }, 2000);
    }
  }
});

