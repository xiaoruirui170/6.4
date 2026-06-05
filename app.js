// ================================================================
//  我的账本 - 核心逻辑 v5 (Supabase 云端存储版)
//  功能：多账户系统 | 6位密码登录 | 日/月限额超限震动警告
//        按月折叠流水 | 缤纷图表 | 日志独立密码 | 云端同步
// ================================================================

// ============ Supabase 配置 ============
var SUPABASE_URL = 'https://bmfwgxrdtfourwtwhl.supabase.co';
var SUPABASE_KEY = 'sb_publishable_FPbyCVlUq7Qy4nKUtscm8g_PhqBS01t';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============ 全局状态 ============
var accountList = {};
var currentUser = null;
var records = [];
var diaries = [];
var currentType = 'expense';
var currentCategory = null;
var currentPageName = 'home';
var currentSortR = 'desc';
var loginPassword = null;
var diaryPassword = null;

// ============ 类别定义 ============
var EXPENSE_CATS = [
  { id: 'breakfast', name: '早餐', icon: '🥕', color: '#FF6384' },
  { id: 'lunch', name: '午餐', icon: '🍄', color: '#36A2EB' },
  { id: 'dinner', name: '晚餐', icon: '🍅', color: '#FFCE56' },
  { id: 'snacks', name: '零食', icon: '🍖', color: '#4BC0C0' },
  { id: 'shopping', name: '购物', icon: '🛅', color: '#9966FF' },
  { id: 'transport', name: '交通', icon: '🚞', color: '#FF9F40' },
  { id: 'entertain', name: '娱乐', icon: '🎃', color: '#C9CBCF' },
  { id: 'study', name: '学习', icon: '📎', color: '#7BC8A4' },
  { id: 'phone', name: '话费', icon: '📫', color: '#E8C3B9' },
  { id: 'medical', name: '医疗', icon: '💪', color: '#5B9BD5' },
  { id: 'utilities', name: '水电', icon: '💕', color: '#ED7D31' },
  { id: 'other', name: '其他', icon: '📦', color: '#A5A5A5' }
];

var INCOME_CATS = [
  { id: 'salary', name: '工资', icon: '💰', color: '#07c160' },
  { id: 'allowance', name: '零花钱', icon: '💰', color: '#1989fa' },
  { id: 'parttime', name: '兼职', icon: '💰', color: '#ff6b6b' },
  { id: 'redpacket', name: '红包', icon: '🧧', color: '#e74c3c' },
  { id: 'refund', name: '退款', icon: '↩️', color: '#9b59b6' },
  { id: 'income_other', name: '其他', icon: '💰', color: '#f39c12' }
];

var EXPENSE_MAP = {};
EXPENSE_CATS.forEach(function(c) { EXPENSE_MAP[c.id] = c; });
var INCOME_MAP = {};
INCOME_CATS.forEach(function(c) { INCOME_MAP[c.id] = c; });

var EXPENSE_COLORS = [
  '#FF6384','#FF9F40','#FFCE56','#36A2EB','#4BC0C0',
  '#9966FF','#7BC8A4','#E8C3B9','#5B9BD5','#ED7D31',
  '#C9CBCF','#A5A5A5'
];

// ============ 简单密码哈希 ============
function hashPwd(pwd) {
  var h = 0;
  for (var i = 0; i < pwd.length; i++) {
    h = ((h << 5) - h) + pwd.charCodeAt(i);
    h |= 0;
  }
  return 'h_' + Math.abs(h).toString(36);
}

// ============ Supabase 云端数据操作 ============
// 从云端加载所有账户
async function loadAccounts() {
  try {
    var { data, error } = await sb.from('accounts').select('*');
    if (error) throw error;
    accountList = {};
    data.forEach(function(row) {
      accountList[row.username] = {
        passwordHash: row.password_hash,
        createdAt: row.created_at
      };
    });
    // 同步到本地作为缓存
    localStorage.setItem('ledger_accounts', JSON.stringify(accountList));
  } catch(e) {
    console.log('从云端加载账户失败，使用本地缓存:', e.message);
    try { accountList = JSON.parse(localStorage.getItem('ledger_accounts')) || {}; } catch(e2) { accountList = {}; }
  }
}

// 保存账户到云端
async function saveAccounts() {
  try {
    var usernames = Object.keys(accountList);
    // 先删除旧数据再重新插入（简化处理）
    if (usernames.length > 0) {
      await sb.from('accounts').delete().neq('username', '__none__');
    }
    var rows = usernames.map(function(u) {
      return {
        username: u,
        password_hash: accountList[u].passwordHash,
        created_at: accountList[u].createdAt
      };
    });
    if (rows.length > 0) {
      var { error } = await sb.from('accounts').insert(rows);
      if (error) throw error;
    }
    localStorage.setItem('ledger_accounts', JSON.stringify(accountList));
  } catch(e) {
    console.log('保存账户到云端失败:', e.message);
    localStorage.setItem('ledger_accounts', JSON.stringify(accountList));
  }
}

// 从云端加载用户数据
async function loadUserData() {
  if (!currentUser) return;
  try {
    // 加载记录
    var { data: recData, error: recErr } = await sb.from('records').select('*').eq('username', currentUser).order('created_at', { ascending: false });
    if (recErr) throw recErr;
    records = recData.map(function(r) { return r.data; });
    localStorage.setItem('ledger_' + currentUser + '_records', JSON.stringify(records));

    // 加载日记
    var { data: diaryData, error: diaryErr } = await sb.from('diaries').select('*').eq('username', currentUser).order('created_at', { ascending: false });
    if (diaryErr) throw diaryErr;
    diaries = diaryData.map(function(d) { return d.data; });
    localStorage.setItem('ledger_' + currentUser + '_diaries', JSON.stringify(diaries));

    // 加载设置
    var { data: setData, error: setErr } = await sb.from('user_settings').select('*').eq('username', currentUser);
    if (!setErr && setData && setData.length > 0) {
      var settings = {};
      setData.forEach(function(s) { settings[s.key] = s.value; });
      localStorage.setItem('ledger_' + currentUser + '_settings', JSON.stringify(settings));
    }
  } catch(e) {
    console.log('从云端加载用户数据失败，使用本地缓存:', e.message);
    try { records = JSON.parse(localStorage.getItem('ledger_' + currentUser + '_records')) || []; } catch(e2) { records = []; }
    try { diaries = JSON.parse(localStorage.getItem('ledger_' + currentUser + '_diaries')) || []; } catch(e2) { diaries = []; }
  }
}

// 保存记录到云端
async function saveRecordsToCloud() {
  if (!currentUser) return;
  try {
    // 先删除该用户旧记录
    await sb.from('records').delete().eq('username', currentUser);
    // 批量插入
    var rows = records.map(function(r) {
      return { username: currentUser, record_id: r.id, data: r, created_at: r.createdAt };
    });
    if (rows.length > 0) {
      // Supabase 限制每次最多1000条，分批处理
      for (var i = 0; i < rows.length; i += 500) {
        var batch = rows.slice(i, i + 500);
        var { error } = await sb.from('records').insert(batch);
        if (error) throw error;
      }
    }
    localStorage.setItem('ledger_' + currentUser + '_records', JSON.stringify(records));
  } catch(e) {
    console.log('保存记录到云端失败:', e.message);
    localStorage.setItem('ledger_' + currentUser + '_records', JSON.stringify(records));
  }
}

// 保存日记到云端
async function saveDiaryDataToCloud() {
  if (!currentUser) return;
  try {
    await sb.from('diaries').delete().eq('username', currentUser);
    var rows = diaries.map(function(d) {
      return { username: currentUser, diary_date: d.date, data: d, created_at: d.createdAt };
    });
    if (rows.length > 0) {
      for (var i = 0; i < rows.length; i += 500) {
        var batch = rows.slice(i, i + 500);
        var { error } = await sb.from('diaries').insert(batch);
        if (error) throw error;
      }
    }
    localStorage.setItem('ledger_' + currentUser + '_diaries', JSON.stringify(diaries));
  } catch(e) {
    console.log('保存日记到云端失败:', e.message);
    localStorage.setItem('ledger_' + currentUser + '_diaries', JSON.stringify(diaries));
  }
}

// 保存用户设置到云端
async function saveUserSetting(key, value) {
  if (!currentUser) return;
  try {
    var { data: existing } = await sb.from('user_settings').select('*').eq('username', currentUser).eq('key', key);
    if (existing && existing.length > 0) {
      await sb.from('user_settings').update({ value: value }).eq('username', currentUser).eq('key', key);
    } else {
      await sb.from('user_settings').insert({ username: currentUser, key: key, value: value });
    }
  } catch(e) {
    console.log('保存设置到云端失败:', e.message);
  }
  // 同时保存到本地
  var settings = {};
  try { settings = JSON.parse(localStorage.getItem('ledger_' + currentUser + '_settings')) || {}; } catch(e2) {}
  settings[key] = value;
  localStorage.setItem('ledger_' + currentUser + '_settings', JSON.stringify(settings));
}

// 从云端获取用户设置
async function getUserSetting(key) {
  if (!currentUser) return null;
  try {
    var { data, error } = await sb.from('user_settings').select('value').eq('username', currentUser).eq('key', key);
    if (!error && data && data.length > 0) return data[0].value;
  } catch(e) {}
  // 回退到本地
  var settings = {};
  try { settings = JSON.parse(localStorage.getItem('ledger_' + currentUser + '_settings')) || {}; } catch(e2) {}
  return settings[key] || null;
}

// ============ 数据持久化接口（兼容旧代码） ============
function saveRecords() {
  if (!currentUser) return;
  localStorage.setItem('ledger_' + currentUser + '_records', JSON.stringify(records));
  saveRecordsToCloud();
}

function saveDiaryData() {
  if (!currentUser) return;
  localStorage.setItem('ledger_' + currentUser + '_diaries', JSON.stringify(diaries));
  saveDiaryDataToCloud();
}

function getDailyLimit() {
  if (!currentUser) return 0;
  var local = parseFloat(localStorage.getItem('ledger_' + currentUser + '_daily_limit')) || 0;
  return local;
}

function setDailyLimit(v) {
  if (!currentUser) return;
  localStorage.setItem('ledger_' + currentUser + '_daily_limit', v);
  saveUserSetting('daily_limit', String(v));
}

function getMonthlyLimit() {
  if (!currentUser) return 0;
  return parseFloat(localStorage.getItem('ledger_' + currentUser + '_monthly_limit')) || 0;
}

function setMonthlyLimit(v) {
  if (!currentUser) return;
  localStorage.setItem('ledger_' + currentUser + '_monthly_limit', v);
  saveUserSetting('monthly_limit', String(v));
}

function getUserStore(username, field) {
  return localStorage.getItem('ledger_' + username + '_' + field);
}

function setUserStore(username, field, val) {
  localStorage.setItem('ledger_' + username + '_' + field, val);
  if (username === currentUser) {
    saveUserSetting(field, val);
  }
}

function getAccountUsernames() {
  return Object.keys(accountList).sort();
}

// ============ 工具函数 ============
function fmtMoney(v) { return '\u00A5' + (parseFloat(v) || 0).toFixed(2); }
function getToday() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}
function getCurrentMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth()+1);
}
function getMonthKey(ds) { return ds ? ds.substring(0,7) : ''; }
function pad(n) { return String(n).padStart(2, '0'); }

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(function() { t.classList.remove('show'); }, 1800);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('show')) {
    e.target.classList.remove('show');
  }
});

function vibrateDevice(pattern) {
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch(e) {}
  }
}

// ============ 1. 登录系统（多账户） ============
async function initLoginPassword() {
  showToast('🔄 正在连接云端...');
  await loadAccounts();
  var lastUser = localStorage.getItem('ledger_current_user');
  if (lastUser && accountList[lastUser]) {
    loginPassword = accountList[lastUser].passwordHash;
  }
}

function renderAccountList() {
  var list = document.getElementById('accountList');
  var users = getAccountUsernames();
  if (users.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);font-size:13px">暂无账户，请创建一个</p>';
    return;
  }
  list.innerHTML = users.map(function(u) {
    var info = accountList[u];
    var date = info.createdAt ? info.createdAt.substring(0, 10) : '';
    return '<div class="account-card" onclick="selectAccount(\'' + u + '\')">' +
      '<span class="account-card-icon">👁</span>' +
      '<div class="account-card-info">' +
      '<span class="account-card-name">' + u + '</span>' +
      '<span class="account-card-date">创建于 ' + date + '</span>' +
      '</div>' +
      '<span class="account-card-arrow">→</span></div>';
  }).join('');
}

var selectedAccount = null;
function selectAccount(username) {
  selectedAccount = username;
  loginInput = '';
  document.getElementById('loginStepAccount').style.display = 'none';
  document.getElementById('loginStepPwd').style.display = 'block';
  document.getElementById('loginTargetUser').textContent = '👁 ' + username + ' 请输入6位密码';
  var dots = document.querySelectorAll('#loginDots .login-dot');
  dots.forEach(function(d) { d.classList.remove('filled', 'error'); });
  document.getElementById('loginError').textContent = '';
  renderLoginKeypad();
}

function goBackToAccountList() {
  selectedAccount = null;
  loginInput = '';
  document.getElementById('loginStepPwd').style.display = 'none';
  document.getElementById('loginStepAccount').style.display = 'block';
  document.getElementById('loginError').textContent = '';
}

function showCreateAccount() {
  document.getElementById('createAccountForm').style.display = 'block';
  document.getElementById('newAccountName').value = '';
  document.getElementById('createAccountError').textContent = '';
  setTimeout(function() { document.getElementById('newAccountName').focus(); }, 100);
}

function hideCreateAccount() {
  document.getElementById('createAccountForm').style.display = 'none';
  document.getElementById('createAccountError').textContent = '';
}

async function doCreateAccount() {
  var name = document.getElementById('newAccountName').value.trim();
  var errEl = document.getElementById('createAccountError');
  if (!name) { errEl.textContent = '请输入用户名'; return; }
  if (name.length > 10) { errEl.textContent = '用户名最大10个字符'; return; }
  if (accountList[name]) { errEl.textContent = '该用户名已存在'; return; }
  accountList[name] = { passwordHash: hashPwd('123456'), createdAt: new Date().toISOString() };
  await saveAccounts();
  hideCreateAccount();
  renderAccountList();
  showToast('✅ 账户创建成功！初始密码：123456');
  setTimeout(function() { selectAccount(name); }, 300);
}

function renderLoginKeypad() {
  var pad = document.getElementById('loginKeypad');
  if (!pad) return;
  var nums = [1,2,3,4,5,6,7,8,9,'del',0,''];
  pad.innerHTML = nums.map(function(n) {
    if (n === '') return '<button class="keypad-btn empty"></button>';
    if (n === 'del') return '<button class="keypad-btn del" onclick="loginKeyPress(\'del\')">⌫</button>';
    return '<button class="keypad-btn" onclick="loginKeyPress(\'' + n + '\')">' + n + '</button>';
  }).join('');
}

var loginInput = '';
function loginKeyPress(key) {
  var dots = document.querySelectorAll('#loginDots .login-dot');
  var errEl = document.getElementById('loginError');

  if (key === 'del') {
    if (loginInput.length > 0) {
      loginInput = loginInput.slice(0, -1);
      dots[loginInput.length].classList.remove('filled', 'error');
    }
    errEl.textContent = '';
    return;
  }

  if (loginInput.length >= 6) return;

  loginInput += key;
  dots[loginInput.length - 1].classList.add('filled');
  errEl.textContent = '';

  if (loginInput.length === 6) {
    setTimeout(async function() {
      var pwdHash = hashPwd(loginInput);
      if (pwdHash === accountList[selectedAccount].passwordHash) {
        currentUser = selectedAccount;
        loginPassword = pwdHash;
        localStorage.setItem('ledger_current_user', currentUser);
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('appWrapper').style.display = 'flex';
        document.getElementById('fabBtn').style.display = 'flex';
        initCurrentUserPasswords();
        document.getElementById('sidebarUserName').textContent = currentUser;
        document.getElementById('sidebarUserInfo').style.display = 'flex';
        showToast('✅ 欢迎回来，' + currentUser + '！');
        await loadUserData();
        initApp();
      } else {
        loginInput = '';
        dots.forEach(function(d) { d.classList.add('error'); d.classList.remove('filled'); });
        errEl.textContent = '❌ 密码错误，请重新输入';
        vibrateDevice([100, 50, 100]);
        setTimeout(function() {
          dots.forEach(function(d) { d.classList.remove('error'); });
          errEl.textContent = '';
        }, 800);
      }
    }, 200);
  }
}

function initCurrentUserPasswords() {
  if (!currentUser) return;
  var saved = getUserStore(currentUser, 'login_pwd');
  if (!saved) {
    loginPassword = hashPwd('123456');
    setUserStore(currentUser, 'login_pwd', loginPassword);
  } else {
    loginPassword = saved;
  }
  var ds = getUserStore(currentUser, 'diary_pwd');
  if (!ds) {
    diaryPassword = '1234';
    setUserStore(currentUser, 'diary_pwd', diaryPassword);
  } else {
    diaryPassword = ds;
  }
}

async function switchAccount() {
  saveRecords();
  saveDiaryData();
  currentUser = null;
  records = [];
  diaries = [];
  selectedAccount = null;
  loginInput = '';
  document.getElementById('appWrapper').style.display = 'none';
  document.getElementById('fabBtn').style.display = 'none';
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginStepPwd').style.display = 'none';
  document.getElementById('loginStepAccount').style.display = 'block';
  document.getElementById('sidebarUserInfo').style.display = 'none';
  await loadAccounts();
  renderAccountList();
}

// ============ 侧栏标题 ============
async function saveSidebarTitle() {
  if (!currentUser) return;
  var v = document.getElementById('sidebarTitle').value.trim();
  if (v) {
    setUserStore(currentUser, 'title', v);
    document.getElementById('headerTitle').textContent = v;
  }
}
async function loadSidebarTitle() {
  if (!currentUser) return;
  var s = getUserStore(currentUser, 'title') || '我的账本';
  document.getElementById('sidebarTitle').value = s;
  document.getElementById('headerTitle').textContent = s;
}

// ============ 页面切换 ============
function switchPage(page) {
  currentPageName = page;
  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  var pg = document.getElementById('page-' + page);
  if (!pg) return;
  pg.classList.add('active');

  if (page === 'diary') renderDiaryPage();
  else if (page === 'home') refreshAll();
  else if (page === 'records') { renderMonthFold(); }
  else if (page === 'charts') { populateChartMonth(); renderCharts(); }

  var sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth <= 768) sidebar.classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============ 蒲公英主题切换 ============
var currentDandelionTheme = 'pink';

function switchDandelionTheme(theme) {
  currentDandelionTheme = theme;
  var root = document.documentElement;
  var flower = document.getElementById('dandelionFlower');
  var cyberLines = document.getElementById('dandelionCyberLines');

  document.body.classList.remove('theme-pink', 'theme-blue', 'theme-yellow');

  document.querySelectorAll('.dandelion-theme-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.theme === theme);
  });

  if (cyberLines) cyberLines.style.display = 'none';

  if (theme === 'pink') {
    document.body.classList.add('theme-pink');
    root.style.setProperty('--dandelion-primary', '#e91e8c');
    root.style.setProperty('--dandelion-accent', '#39ff14');
    root.style.setProperty('--dandelion-light', '#2d0a1e');
    root.style.setProperty('--dandelion-bg', '#1a0a14');
    root.style.setProperty('--dandelion-flower', '#e91e8c');
    if (flower) flower.textContent = '🌸';
    if (cyberLines) cyberLines.style.display = 'block';
    showToast('🌸 玫红主题');
  } else if (theme === 'blue') {
    document.body.classList.add('theme-blue');
    root.style.setProperty('--dandelion-primary', '#5b9bd5');
    root.style.setProperty('--dandelion-accent', '#87ceeb');
    root.style.setProperty('--dandelion-light', '#e8f4fd');
    root.style.setProperty('--dandelion-bg', '#f0f8ff');
    root.style.setProperty('--dandelion-flower', '#5b9bd5');
    if (flower) flower.textContent = '🩵';
    showToast('🩵 浅蓝主题');
  } else if (theme === 'yellow') {
    document.body.classList.add('theme-yellow');
    root.style.setProperty('--dandelion-primary', '#f0c040');
    root.style.setProperty('--dandelion-accent', '#ffeaa7');
    root.style.setProperty('--dandelion-light', '#fffde7');
    root.style.setProperty('--dandelion-bg', '#fffef5');
    root.style.setProperty('--dandelion-flower', '#f0c040');
    if (flower) flower.textContent = '🌼';
    showToast('🌼 浅黄主题');
  }

  if (currentUser) setUserStore(currentUser, 'theme', theme);
  if (currentPageName === 'charts') renderCharts();
}

function loadDandelionTheme() {
  var saved = (currentUser ? getUserStore(currentUser, 'theme') : null) || 'pink';
  var cyberLines = document.getElementById('dandelionCyberLines');
  if (saved === 'pink' && cyberLines) cyberLines.style.display = 'block';
  switchDandelionTheme(saved);
}

// ============ 修改密码弹窗 ============
var changePwdStep = 'menu';
var changePwdTempOld = '';
var changePwdTempNew = '';

function openChangePwdModal() {
  changePwdStep = 'menu';
  changePwdTempOld = '';
  changePwdTempNew = '';
  renderChangePwdMenu();
  document.getElementById('changePwdModal').classList.add('show');
}

function renderChangePwdMenu() {
  var body = document.getElementById('changePwdBody');
  body.innerHTML =
    '<p style="text-align:center;font-size:14px;margin-bottom:8px">请选择要修改的密码</p>' +
    '<div style="display:flex;gap:10px">' +
    '<button class="btn-save" style="flex:1;background:#e91e8c" onclick="startChangeLoginPwd()">🔐 登录密码<br><small>6位数字</small></button>' +
    '<button class="btn-save" style="flex:1;background:#5b9bd5" onclick="startChangeDiaryPwd()">📑 日志密码<br><small>4位数字</small></button>' +
    '</div>';
}

function renderChangePwdKeypad(elId, onPress) {
  var pad = document.getElementById(elId);
  if (!pad) return;
  var nums = [1,2,3,4,5,6,7,8,9,'del',0,''];
  pad.innerHTML = nums.map(function(n) {
    if (n === '') return '<button class="keypad-btn empty"></button>';
    if (n === 'del') return '<button class="keypad-btn del" onclick="' + onPress + '(\'del\')">⌫</button>';
    return '<button class="keypad-btn" onclick="' + onPress + '(\'' + n + '\')">' + n + '</button>';
  }).join('');
}

function startChangeLoginPwd() {
  changePwdStep = 'login_old';
  changePwdTempOld = '';
  var body = document.getElementById('changePwdBody');
  body.innerHTML =
    '<p style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:6px">请输入<b>当前</b>6位登录密码</p>' +
    '<div class="login-dots" id="changePwdDots">' +
    '<span class="login-dot"></span><span class="login-dot"></span><span class="login-dot"></span>' +
    '<span class="login-dot"></span><span class="login-dot"></span><span class="login-dot"></span>' +
    '</div>' +
    '<p class="login-error" id="changePwdError"></p>' +
    '<div class="login-keypad" id="changePwdKeypad"></div>';
  renderChangePwdKeypad('changePwdKeypad', 'changeLoginPwdKeyPress');
}

function changeLoginPwdKeyPress(key) {
  var dots = document.querySelectorAll('#changePwdDots .login-dot');
  var errEl = document.getElementById('changePwdError');

  if (key === 'del') {
    if (changePwdTempOld.length > 0) {
      changePwdTempOld = changePwdTempOld.slice(0, -1);
      dots[changePwdTempOld.length].classList.remove('filled', 'error');
    }
    errEl.textContent = '';
    return;
  }
  if (changePwdTempOld.length >= 6) return;
  changePwdTempOld += key;
  dots[changePwdTempOld.length - 1].classList.add('filled');
  errEl.textContent = '';

  if (changePwdTempOld.length === 6) {
    setTimeout(function() {
      if (hashPwd(changePwdTempOld) === loginPassword) {
        changePwdStep = 'login_new';
        changePwdTempNew = '';
        var body = document.getElementById('changePwdBody');
        body.innerHTML =
          '<p style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:6px">请输入<b>新</b>6位登录密码</p>' +
          '<div class="login-dots" id="changePwdDots">' +
          '<span class="login-dot"></span><span class="login-dot"></span><span class="login-dot"></span>' +
          '<span class="login-dot"></span><span class="login-dot"></span><span class="login-dot"></span>' +
          '</div>' +
          '<p class="login-error" id="changePwdError"></p>' +
          '<div class="login-keypad" id="changePwdKeypad"></div>';
        renderChangePwdKeypad('changePwdKeypad', 'changeLoginNewKeyPress');
      } else {
        changePwdTempOld = '';
        dots.forEach(function(d) { d.classList.add('error'); d.classList.remove('filled'); });
        errEl.textContent = '❌ 密码错误';
        vibrateDevice([100, 50, 100]);
        setTimeout(function() {
          dots.forEach(function(d) { d.classList.remove('error'); });
          errEl.textContent = '';
        }, 600);
      }
    }, 200);
  }
}

function changeLoginNewKeyPress(key) {
  var dots = document.querySelectorAll('#changePwdDots .login-dot');
  var errEl = document.getElementById('changePwdError');

  if (key === 'del') {
    if (changePwdTempNew.length > 0) {
      changePwdTempNew = changePwdTempNew.slice(0, -1);
      dots[changePwdTempNew.length].classList.remove('filled', 'error');
    }
    errEl.textContent = '';
    return;
  }
  if (changePwdTempNew.length >= 6) return;
  changePwdTempNew += key;
  dots[changePwdTempNew.length - 1].classList.add('filled');
  errEl.textContent = '';

  if (changePwdTempNew.length === 6) {
    setTimeout(async function() {
      loginPassword = hashPwd(changePwdTempNew);
      accountList[currentUser].passwordHash = loginPassword;
      await saveAccounts();
      setUserStore(currentUser, 'login_pwd', loginPassword);
      closeModal('changePwdModal');
      showToast('✅ 登录密码已更新');
    }, 200);
  }
}

function startChangeDiaryPwd() {
  changePwdStep = 'diary_old';
  changePwdTempOld = '';
  var body = document.getElementById('changePwdBody');
  body.innerHTML =
    '<p style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:6px">请输入<b>当前</b>4位日志密码</p>' +
    '<div class="pwd-dots" id="changeDiaryDots">' +
    '<span class="pwd-dot"></span><span class="pwd-dot"></span><span class="pwd-dot"></span><span class="pwd-dot"></span>' +
    '</div>' +
    '<p class="login-error" id="changePwdError"></p>' +
    '<div class="login-keypad" id="changePwdKeypad"></div>';
  renderChangePwdKeypad('changePwdKeypad', 'changeDiaryPwdKeyPress');
}

function changeDiaryPwdKeyPress(key) {
  var dots = document.querySelectorAll('#changeDiaryDots .pwd-dot');
  var errEl = document.getElementById('changePwdError');

  if (key === 'del') {
    if (changePwdTempOld.length > 0) {
      changePwdTempOld = changePwdTempOld.slice(0, -1);
      dots[changePwdTempOld.length].classList.remove('filled', 'error');
    }
    errEl.textContent = '';
    return;
  }
  if (changePwdTempOld.length >= 4) return;
  changePwdTempOld += key;
  dots[changePwdTempOld.length - 1].classList.add('filled');
  errEl.textContent = '';

  if (changePwdTempOld.length === 4) {
    setTimeout(function() {
      if (changePwdTempOld === diaryPassword) {
        changePwdStep = 'diary_new';
        changePwdTempNew = '';
        var body = document.getElementById('changePwdBody');
        body.innerHTML =
          '<p style="text-align:center;font-size:13px;color:var(--text-secondary);margin-bottom:6px">请输入<b>新</b>4位日志密码</p>' +
          '<div class="pwd-dots" id="changeDiaryDots">' +
          '<span class="pwd-dot"></span><span class="pwd-dot"></span><span class="pwd-dot"></span><span class="pwd-dot"></span>' +
          '</div>' +
          '<p class="login-error" id="changePwdError"></p>' +
          '<div class="login-keypad" id="changePwdKeypad"></div>';
        renderChangePwdKeypad('changePwdKeypad', 'changeDiaryNewKeyPress');
      } else {
        changePwdTempOld = '';
        dots.forEach(function(d) { d.classList.add('error'); d.classList.remove('filled'); });
        errEl.textContent = '❌ 密码错误';
        vibrateDevice([100, 50, 100]);
        setTimeout(function() {
          dots.forEach(function(d) { d.classList.remove('error'); });
          errEl.textContent = '';
        }, 600);
      }
    }, 150);
  }
}

function changeDiaryNewKeyPress(key) {
  var dots = document.querySelectorAll('#changeDiaryDots .pwd-dot');
  var errEl = document.getElementById('changePwdError');

  if (key === 'del') {
    if (changePwdTempNew.length > 0) {
      changePwdTempNew = changePwdTempNew.slice(0, -1);
      dots[changePwdTempNew.length].classList.remove('filled', 'error');
    }
    errEl.textContent = '';
    return;
  }
  if (changePwdTempNew.length >= 4) return;
  changePwdTempNew += key;
  dots[changePwdTempNew.length - 1].classList.add('filled');
  errEl.textContent = '';

  if (changePwdTempNew.length === 4) {
    setTimeout(function() {
      diaryPassword = changePwdTempNew;
      setUserStore(currentUser, 'diary_pwd', diaryPassword);
      closeModal('changePwdModal');
      showToast('✅ 日志密码已更新');
    }, 150);
  }
}

// ============ 记账 ============
function setType(type) {
  currentType = type;
  currentCategory = null;
  cancelAdd();
  document.querySelectorAll('.type-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.type === type);
  });
  renderCatGrid();
}

function renderCatGrid() {
  var grid = document.getElementById('catGrid');
  var cats = currentType === 'expense' ? EXPENSE_CATS : INCOME_CATS;
  grid.innerHTML = cats.map(function(c) {
    return '<button class="cat-btn" data-cat="' + c.id + '" onclick="startAdd(\'' + c.id + '\')">' +
      '<span class="cat-icon">' + c.icon + '</span>' +
      '<span class="cat-name">' + c.name + '</span></button>';
  }).join('');
}

function startAdd(catId) {
  currentCategory = catId;
  var map = currentType === 'expense' ? EXPENSE_MAP : INCOME_MAP;
  var cat = map[catId];
  document.getElementById('selCat').innerHTML = cat.icon + ' ' + cat.name;
  document.getElementById('amountArea').style.display = 'flex';
  document.getElementById('quickAmounts').style.display = 'flex';
  document.getElementById('amountInput').value = '';
  document.getElementById('noteInput').value = '';
  document.getElementById('amountInput').focus();
  document.querySelectorAll('.cat-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.cat === catId);
  });
}

function cancelAdd() {
  currentCategory = null;
  document.getElementById('amountArea').style.display = 'none';
  document.getElementById('quickAmounts').style.display = 'none';
  document.getElementById('amountInput').value = '';
  document.getElementById('noteInput').value = '';
  document.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.remove('active'); });
}

function setAmount(val) {
  document.getElementById('amountInput').value = val;
  document.getElementById('amountInput').focus();
}

// ============ 超限检查与警告 ============
function checkOverLimit(amount, recordDate) {
  var today = getToday();
  var currentMonth = getCurrentMonth();
  var warnings = [];

  var dl = getDailyLimit();
  if (dl > 0) {
    var todayExpense = records
      .filter(function(r) { return r.date === today && r.type === 'expense'; })
      .reduce(function(s, r) { return s + r.amount; }, 0);
    if (todayExpense > dl) {
      warnings.push({
        type: 'daily',
        limit: dl,
        spent: todayExpense,
        over: todayExpense - dl,
        msg: '今日支出 <b>' + fmtMoney(todayExpense) + '</b> 已超过日限额 <b>' + fmtMoney(dl) + '</b>'
      });
    }
  }

  var ml = getMonthlyLimit();
  if (ml > 0) {
    var monthExpense = records
      .filter(function(r) { return getMonthKey(r.date) === currentMonth && r.type === 'expense'; })
      .reduce(function(s, r) { return s + r.amount; }, 0);
    if (monthExpense > ml) {
      warnings.push({
        type: 'monthly',
        limit: ml,
        spent: monthExpense,
        over: monthExpense - ml,
        msg: '本月支出 <b>' + fmtMoney(monthExpense) + '</b> 已超过月限额 <b>' + fmtMoney(ml) + '</b>'
      });
    }
  }

  if (warnings.length > 0) {
    showOverlimitBanner(warnings);
    var content = warnings.map(function(w) {
      return '<div style="background:#fdecea;padding:14px;border-radius:10px;margin-bottom:8px;text-align:center">' +
        '<p style="font-size:40px;margin-bottom:8px">⚠️</p>' +
        '<p style="font-size:14px;line-height:1.6">' + w.msg + '</p>' +
        '<p style="font-size:12px;color:#e74c3c;margin-top:4px">超支 ' + fmtMoney(w.over) + '</p></div>';
    }).join('');
    document.getElementById('overLimitContent').innerHTML = content +
      '<button class="btn-save btn-full" style="background:#e74c3c" onclick="closeModal(\'overLimitModal\')">我知道了</button>';
    document.getElementById('overLimitModal').classList.add('show');
    vibrateDevice([200, 100, 200, 100, 400]);
  }
}

function confirmAdd() {
  if (!currentCategory) return;
  var amount = parseFloat(document.getElementById('amountInput').value);
  if (!amount || amount <= 0) { showToast('请输入有效金额'); return; }
  var dateInput = document.getElementById('recordDate').value;
  var recordDate = dateInput || getToday();
  var note = document.getElementById('noteInput').value.trim();
  var map = currentType === 'expense' ? EXPENSE_MAP : INCOME_MAP;
  var cat = map[currentCategory];
  var record = {
    id: Date.now(),
    date: recordDate,
    type: currentType,
    category: currentCategory,
    amount: amount,
    note: note,
    createdAt: new Date().toISOString()
  };
  records.push(record);
  saveRecords();

  var typeLabel = currentType === 'expense' ? '支出' : '收入';
  var dateLabel = recordDate !== getToday() ? '补录 ' + recordDate : '';
  cancelAdd();
  document.getElementById('amountInput').blur();
  document.getElementById('noteInput').blur();
  showToast('✅ ' + dateLabel + ' ' + cat.icon + ' ' + cat.name + ' ' + typeLabel + ' ' + fmtMoney(amount) + (note ? ' 📑' + note : ''));
  refreshAll();

  if (currentType === 'expense') {
    setTimeout(function() { checkOverLimit(amount, recordDate); }, 300);
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    var area = document.getElementById('amountArea');
    if (area && area.style.display !== 'none') {
      e.preventDefault();
      confirmAdd();
    }
  }
});

// ============ 今日摘要 + 月度限额显示 ============
function renderTodaySummary() {
  var today = getToday();
  var todayRecords = records.filter(function(r) { return r.date === today; });
  var expenseTotal = todayRecords.filter(function(r) { return r.type === 'expense'; }).reduce(function(s, r) { return s + r.amount; }, 0);
  var expenseCount = todayRecords.filter(function(r) { return r.type === 'expense'; }).length;

  document.getElementById('todayExpense').textContent = fmtMoney(expenseTotal);
  document.getElementById('todayCount').textContent = expenseCount + '笔';

  var dl = getDailyLimit();
  var dd = document.getElementById('dailyLimitDisplay');
  var df = document.getElementById('dailyLimitFill');
  var dr = document.getElementById('dailyLimitRemain');
  renderLimit(dl, expenseTotal, dd, df, dr);

  var ml = getMonthlyLimit();
  var currentMonth = getCurrentMonth();
  var monthExpense = records
    .filter(function(r) { return getMonthKey(r.date) === currentMonth && r.type === 'expense'; })
    .reduce(function(s, r) { return s + r.amount; }, 0);
  var md = document.getElementById('monthlyLimitDisplay');
  var mf = document.getElementById('monthlyLimitFill');
  var mr = document.getElementById('monthlyLimitRemain');
  renderLimit(ml, monthExpense, md, mf, mr);
}

function renderLimit(limitVal, spent, displayEl, fillEl, remainEl) {
  if (limitVal > 0) {
    var pct = Math.min((spent / limitVal) * 100, 100);
    displayEl.textContent = fmtMoney(spent) + ' / ' + fmtMoney(limitVal);
    fillEl.style.width = pct + '%';
    if (pct >= 100) {
      fillEl.style.background = '#e74c3c';
      remainEl.textContent = '⚠️ 已超支 ' + fmtMoney(spent - limitVal);
    } else if (pct >= 80) {
      fillEl.style.background = '#f39c12';
      remainEl.textContent = '剩余 ' + fmtMoney(limitVal - spent);
    } else {
      fillEl.style.background = '#27ae60';
      remainEl.textContent = '剩余 ' + fmtMoney(limitVal - spent);
    }
  } else {
    displayEl.textContent = '未配置';
    fillEl.style.width = '0%';
    remainEl.textContent = '点击设置';
  }
}

// ============ 限额弹窗 ============
function openLimitModal() {
  document.getElementById('dailyLimitInput').value = getDailyLimit() || '';
  document.getElementById('limitModal').classList.add('show');
  setTimeout(function() { document.getElementById('dailyLimitInput').focus(); }, 100);
}
function saveDailyLimit() {
  var v = parseFloat(document.getElementById('dailyLimitInput').value);
  if (!v || v <= 0) { showToast('请输入有效金额'); return; }
  setDailyLimit(v);
  closeModal('limitModal');
  showToast('✅ 每日限额已更新');
  renderTodaySummary();
}

function openMonthlyLimitModal() {
  document.getElementById('monthlyLimitInput').value = getMonthlyLimit() || '';
  document.getElementById('monthlyLimitModal').classList.add('show');
  setTimeout(function() { document.getElementById('monthlyLimitInput').focus(); }, 100);
}
function saveMonthlyLimit() {
  var v = parseFloat(document.getElementById('monthlyLimitInput').value);
  if (!v || v <= 0) { showToast('请输入有效金额'); return; }
  setMonthlyLimit(v);
  closeModal('monthlyLimitModal');
  showToast('✅ 月度限额已更新');
  renderTodaySummary();
}

// ============ 流水 - 按月折叠下拉 ============
function toggleSortR() {
  currentSortR = currentSortR === 'desc' ? 'asc' : 'desc';
  var btn = document.getElementById('sortBtnR');
  if (btn) btn.textContent = currentSortR === 'desc' ? '🔽 最新' : '🔼 最早';
  renderMonthFold();
}

function getFilteredRecordsR() {
  var filtered = records.slice();
  var ft = document.getElementById('filterTypeR');
  if (ft && ft.value !== 'all') {
    filtered = filtered.filter(function(r) { return r.type === ft.value; });
  }
  filtered.sort(function(a, b) {
    if (currentSortR === 'desc') return b.date.localeCompare(a.date) || (b.id - a.id);
    else return a.date.localeCompare(b.date) || (a.id - b.id);
  });
  return filtered;
}

function renderMonthFold() {
  var filtered = getFilteredRecordsR();
  var list = document.getElementById('monthFoldList');
  var summary = document.getElementById('periodSummary');

  var et = filtered.filter(function(r) { return r.type === 'expense'; }).reduce(function(s, r) { return s + r.amount; }, 0);
  var it = filtered.filter(function(r) { return r.type === 'income'; }).reduce(function(s, r) { return s + r.amount; }, 0);

  if (summary) {
    summary.innerHTML =
      '<div class="period-summary-item"><span class="ps-val" style="color:#e74c3c">' + fmtMoney(et) + '</span><span class="ps-lbl">支出</span></div>' +
      '<div class="period-summary-item"><span class="ps-val" style="color:#07c160">' + fmtMoney(it) + '</span><span class="ps-lbl">收入</span></div>' +
      '<div class="period-summary-item"><span class="ps-val">' + fmtMoney(it - et) + '</span><span class="ps-lbl">结余</span></div>' +
      '<div class="period-summary-item"><span class="ps-val">' + filtered.length + '</span><span class="ps-lbl">笔数</span></div>';
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">📭 暂无匹配的记录</div>';
    return;
  }

  var monthGroups = {};
  filtered.forEach(function(r) {
    var mk = getMonthKey(r.date);
    if (!monthGroups[mk]) monthGroups[mk] = [];
    monthGroups[mk].push(r);
  });

  var today = getToday();
  var wd = ['周日','周一','周二','周三','周四','周五','周六'];

  list.innerHTML = Object.keys(monthGroups).sort().reverse().map(function(mk) {
    var mRecords = monthGroups[mk];
    var me = mRecords.filter(function(r) { return r.type === 'expense'; }).reduce(function(s, r) { return s + r.amount; }, 0);
    var mi = mRecords.filter(function(r) { return r.type === 'income'; }).reduce(function(s, r) { return s + r.amount; }, 0);
    var monthId = 'month-fold-' + mk.replace('-','');

    var dateGroups = {};
    mRecords.forEach(function(r) {
      if (!dateGroups[r.date]) dateGroups[r.date] = [];
      dateGroups[r.date].push(r);
    });

    var bodyHTML = Object.keys(dateGroups).sort().reverse().map(function(dk) {
      var dayRecords = dateGroups[dk];
      var de = dayRecords.filter(function(r) { return r.type === 'expense'; }).reduce(function(s, r) { return s + r.amount; }, 0);
      var di = dayRecords.filter(function(r) { return r.type === 'income'; }).reduce(function(s, r) { return s + r.amount; }, 0);
      var isToday = dk === today;
      var dt = new Date(dk);
      var dayName = wd[dt.getDay()];

      var header = '<div class="date-group-header">' +
        '<div class="date-group-left">' +
        '<span class="date-group-date">' + dk + ' ' + dayName + (isToday ? '<span class="today-badge">今天</span>' : '') + '</span>' +
        '</div>' +
        '<div class="date-group-subtotal">' +
        '<span class="dg-sub-expense">支出 ' + fmtMoney(de) + '</span>' +
        '<span class="dg-sub-income">收入 ' + fmtMoney(di) + '</span>' +
        '</div></div>';

      var items = dayRecords.map(function(r) {
        var map = r.type === 'expense' ? EXPENSE_MAP : INCOME_MAP;
        var cat = map[r.category] || { icon: '📦', name: r.category };
        var rowClass = r.type === 'expense' ? 'expense-record' : 'income-record';
        var amtClass = r.type === 'expense' ? 'expense-amount' : 'income-amount';
        var sign = r.type === 'expense' ? '-' : '+';
        return '<div class="record-item ' + rowClass + '">' +
          '<span class="record-icon">' + cat.icon + '</span>' +
          '<div class="record-info"><div class="record-cat-row">' +
          '<span class="record-cat">' + cat.name + '</span>' +
          (r.note ? '<span class="record-note-tag">📑 ' + r.note + '</span>' : '') +
          '</div></div>' +
          '<span class="record-amount ' + amtClass + '">' + sign + fmtMoney(r.amount) + '</span>' +
          '<button class="record-delete" onclick="deleteRecord(' + r.id + ')">🗑</button></div>';
      }).join('');

      return header + items;
    }).join('');

    return '<div class="month-fold-item open" id="' + monthId + '">' +
      '<div class="month-fold-header" onclick="toggleMonthFold(\'' + monthId + '\')">' +
      '<div class="month-fold-title">📮 ' + mk + '</div>' +
      '<div class="month-fold-summary">' +
      '<span class="mfs-expense">支出 ' + fmtMoney(me) + '</span>' +
      '<span class="mfs-income">收入 ' + fmtMoney(mi) + '</span>' +
      '<span class="mfs-count">' + mRecords.length + '笔</span>' +
      '</div>' +
      '<span class="month-fold-arrow">▼</span>' +
      '</div>' +
      '<div class="month-fold-body">' + bodyHTML + '</div>' +
      '</div>';
  }).join('');
}

function toggleMonthFold(monthId) {
  var el = document.getElementById(monthId);
  if (el) el.classList.toggle('open');
}

function deleteRecord(id) {
  if (!confirm('确定删除这条记录吗？')) return;
  records = records.filter(function(r) { return r.id !== id; });
  saveRecords();
  showToast('🗑 已删除');
  refreshAll();
}

// ============ 图表（分析页） ============
var pieChart, lineChart, barChart;

function destroyCharts() {
  if (typeof Chart === 'undefined') return;
  [pieChart, lineChart, barChart].forEach(function(c) {
    try { c.destroy(); } catch(e) {}
  });
  pieChart = lineChart = barChart = null;
}

function populateChartMonth() {
  var months = [];
  var seen = {};
  records.forEach(function(r) {
    var mk = getMonthKey(r.date);
    if (!seen[mk]) { seen[mk] = true; months.push(mk); }
  });
  months.sort();
  var cur = getCurrentMonth();
  if (!seen[cur]) months.push(cur);
  months.sort();
  var sel = document.getElementById('chartMonth');
  if (sel) sel.innerHTML = months.map(function(m) {
    return '<option value="' + m + '" ' + (m === cur ? 'selected' : '') + '>' + m + '</option>';
  }).join('');
}

function renderCharts() {
  if (typeof Chart === 'undefined') { return; }
  destroyCharts();

  var sel = document.getElementById('chartMonth');
  if (!sel) return;
  var month = sel.value;
  var monthRecords = records.filter(function(r) { return getMonthKey(r.date) === month; });
  var expenseRecords = monthRecords.filter(function(r) { return r.type === 'expense'; });
  var incomeRecords = monthRecords.filter(function(r) { return r.type === 'income'; });

  var et = expenseRecords.reduce(function(s, r) { return s + r.amount; }, 0);
  var it = incomeRecords.reduce(function(s, r) { return s + r.amount; }, 0);
  var days = [];
  var seen = {};
  monthRecords.forEach(function(r) { if (!seen[r.date]) { seen[r.date] = true; days.push(r.date); } });
  var avg = et / (days.length || 1);

  var se = document.getElementById('statExpense'), si = document.getElementById('statIncome');
  var sb = document.getElementById('statBalance'), sa = document.getElementById('statAvg');
  if (se) se.textContent = fmtMoney(et);
  if (si) si.textContent = fmtMoney(it);
  if (sb) sb.textContent = fmtMoney(it - et);
  if (sa) sa.textContent = fmtMoney(avg);

  var catTotals = {};
  expenseRecords.forEach(function(r) { catTotals[r.category] = (catTotals[r.category] || 0) + r.amount; });
  var cl = Object.keys(catTotals);
  var cv = Object.values(catTotals);

  if (cl.length > 0) {
    var isCyber = document.body.classList.contains('theme-pink');
    var bgColors = isCyber
      ? ['#e91e8c','#c2185b','#39ff14','#00e676','#ff4081','#f50057','#76ff03','#b2ff59','#ff80ab','#ea80fc','#84ffff','#18ffff'].slice(0, cl.length)
      : EXPENSE_COLORS.slice(0, cl.length);
    pieChart = new Chart(document.getElementById('pieChart').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: cl.map(function(id) { return (EXPENSE_MAP[id] || {}).name || id; }),
        datasets: [{
          data: cv,
          backgroundColor: bgColors,
          borderWidth: isCyber ? 2 : 3,
          borderColor: isCyber ? '#1a0a14' : '#fff',
          hoverBorderWidth: isCyber ? 4 : 4,
          hoverBorderColor: isCyber ? '#39ff14' : '#fff',
          borderRadius: isCyber ? 0 : 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '55%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 }, color: isCyber ? '#ccc' : '#606266' }
          },
          tooltip: {
            backgroundColor: isCyber ? '#2d0a1e' : undefined,
            titleColor: isCyber ? '#39ff14' : undefined,
            bodyColor: isCyber ? '#fff' : undefined,
            borderColor: isCyber ? '#39ff14' : undefined,
            borderWidth: isCyber ? 1 : 0,
            callbacks: { label: function(ctx) {
              var total = cv.reduce(function(a,b) { return a+b; }, 0);
              var pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
              return ctx.label + ': ' + fmtMoney(ctx.raw) + ' (' + pct + '%)';
            }}
          }
        }
      }
    });
  }

  var dateData = {};
  monthRecords.forEach(function(r) {
    if (!dateData[r.date]) dateData[r.date] = { expense: 0, income: 0 };
    if (r.type === 'expense') dateData[r.date].expense += r.amount;
    else dateData[r.date].income += r.amount;
  });
  var sortedDates = Object.keys(dateData).sort();
  var ev = sortedDates.map(function(d) { return dateData[d].expense; });
  var iv = sortedDates.map(function(d) { return dateData[d].income; });
  var dl = sortedDates.map(function(d) { return d.substring(8); });

  if (sortedDates.length > 0) {
    var isCyber2 = document.body.classList.contains('theme-pink');
    lineChart = new Chart(document.getElementById('lineChart').getContext('2d'), {
      type: 'line',
      data: {
        labels: dl,
        datasets: [
          { label: '支出', data: ev, borderColor: isCyber2 ? '#e91e8c' : '#e74c3c', backgroundColor: isCyber2 ? 'rgba(233,30,140,0.12)' : 'rgba(231,76,60,0.08)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: isCyber2 ? '#e91e8c' : '#e74c3c', borderWidth: isCyber2 ? 3 : 2, pointBorderColor: isCyber2 ? '#39ff14' : undefined, pointBorderWidth: isCyber2 ? 1 : 0 },
          { label: '收入', data: iv, borderColor: isCyber2 ? '#39ff14' : '#07c160', backgroundColor: isCyber2 ? 'rgba(57,255,20,0.08)' : 'rgba(7,193,96,0.08)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: isCyber2 ? '#39ff14' : '#07c160', borderWidth: isCyber2 ? 3 : 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { labels: { color: isCyber2 ? '#ccc' : '#606266', usePointStyle: true } } },
        scales: {
          x: { ticks: { color: isCyber2 ? '#999' : '#909399' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: function(v) { return '\u00A5' + v; }, color: isCyber2 ? '#999' : '#909399' }, grid: { color: isCyber2 ? '#3a1a2a' : '#ebeef5' } }
        }
      }
    });
  }

  if (cl.length > 0) {
    var isCyber3 = document.body.classList.contains('theme-pink');
    var barColors, barBorderColors;
    if (isCyber3) {
      barColors = cl.map(function(_, i) { return i % 2 === 0 ? 'rgba(233,30,140,0.7)' : 'rgba(57,255,20,0.5)'; });
      barBorderColors = cl.map(function(_, i) { return i % 2 === 0 ? '#e91e8c' : '#39ff14'; });
    } else {
      barColors = EXPENSE_COLORS.slice(0, cl.length).map(function(c) { return c + 'BB'; });
      barBorderColors = EXPENSE_COLORS.slice(0, cl.length);
    }
    barChart = new Chart(document.getElementById('barChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: cl.map(function(id) { return (EXPENSE_MAP[id] || {}).name || id; }),
        datasets: [{
          label: '支出金额',
          data: cv,
          backgroundColor: barColors,
          borderColor: barBorderColors,
          borderWidth: isCyber3 ? 2 : 1,
          borderRadius: isCyber3 ? 6 : 10,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: isCyber3 ? '#999' : '#909399' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: function(v) { return '\u00A5' + v; }, color: isCyber3 ? '#999' : '#909399' }, grid: { color: isCyber3 ? '#3a1a2a' : '#ebeef5' } }
        }
      }
    });
  }
}

// ============ 日志系统（含4位独立密码） ============
function renderDiaryPage() {
  var today = getToday();
  var wd = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  document.getElementById('diaryDate').textContent = '📮 ' + today + ' ' + wd[new Date().getDay()];

  var todayDiary = diaries.find(function(d) { return d.date === today; });
  // 始终清空输入框和表情选择，已保存的内容显示在历史列表中
  document.getElementById('diaryContent').value = '';
  if (todayDiary) {
    document.querySelectorAll('.mood-btn').forEach(function(b) {
      b.classList.toggle('selected', b.dataset.mood === todayDiary.mood);
    });
  } else {
    document.querySelectorAll('.mood-btn').forEach(function(b) { b.classList.remove('selected'); });
  }

  document.querySelectorAll('.mood-btn').forEach(function(b) {
    b.onclick = function() {
      document.querySelectorAll('.mood-btn').forEach(function(x) { x.classList.remove('selected'); });
      this.classList.add('selected');
    };
  });

  renderDiaryMonthSummary();
  renderDiaryList();
}

function renderDiaryList() {
  var list = document.getElementById('diaryList');
  var sorted = diaries.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty-state">📭 还没有写过日志哦~</div>';
    return;
  }
  list.innerHTML = sorted.map(function(d) {
    return '<div class="diary-item" onclick="openDiaryWithPwd(\'' + d.date + '\')">' +
      '<div class="diary-item-header">' +
      '<span class="diary-item-mood">' + (d.mood || '📑') + '</span>' +
      '<span class="diary-item-date">📮 ' + d.date + ' 🔐</span>' +
      '<button class="diary-item-delete" onclick="event.stopPropagation();deleteDiary(\'' + d.date + '\')">🗑 删除</button>' +
      '</div>' +
      '<div class="diary-item-content">🔐 点击输入密码查看</div></div>';
  }).join('');
}

function saveDiary() {
  var mb = document.querySelector('.mood-btn.selected');
  var mood = mb ? mb.dataset.mood : '📑';
  var content = document.getElementById('diaryContent').value.trim();
  var today = getToday();
  var idx = diaries.findIndex(function(d) { return d.date === today; });
  if (idx >= 0) {
    diaries[idx].mood = mood;
    diaries[idx].content = content;
  } else {
    diaries.push({ date: today, mood: mood, content: content, createdAt: new Date().toISOString() });
  }
  saveDiaryData();
  showToast('✅ 心情日志已保存');

  // 保存后自动清空输入框和已选表情
  document.getElementById('diaryContent').value = '';
  document.querySelectorAll('.mood-btn').forEach(function(b) { b.classList.remove('selected'); });

  renderDiaryList();
}

function deleteDiary(date) {
  if (!confirm('确定删除 ' + date + ' 的日志吗？')) return;
  diaries = diaries.filter(function(d) { return d.date !== date; });
  saveDiaryData();
  showToast('🗑 日志已删除');
  renderDiaryPage();
}

var diaryPwdInput = '';
var diaryPwdTargetDate = '';

function openDiaryWithPwd(date) {
  diaryPwdTargetDate = date;
  diaryPwdInput = '';
  document.getElementById('diaryPwdDate').textContent = date;
  var dots = document.querySelectorAll('#diaryPwdDots .pwd-dot');
  dots.forEach(function(d) { d.classList.remove('filled', 'error'); });
  document.getElementById('diaryPwdError').textContent = '';
  document.getElementById('diaryPwdModal').classList.add('show');
  renderDiaryPwdKeypad();
}

function renderDiaryPwdKeypad() {
  var pad = document.getElementById('diaryPwdKeypad');
  var nums = [1,2,3,4,5,6,7,8,9,'del',0,''];
  pad.innerHTML = nums.map(function(n) {
    if (n === '') return '<button class="keypad-btn empty"></button>';
    if (n === 'del') return '<button class="keypad-btn del" onclick="diaryPwdKeyPress(\'del\')">⌫</button>';
    return '<button class="keypad-btn" onclick="diaryPwdKeyPress(\'' + n + '\')">' + n + '</button>';
  }).join('');
}

function diaryPwdKeyPress(key) {
  var dots = document.querySelectorAll('#diaryPwdDots .pwd-dot');
  var errEl = document.getElementById('diaryPwdError');

  if (key === 'del') {
    if (diaryPwdInput.length > 0) {
      diaryPwdInput = diaryPwdInput.slice(0, -1);
      dots[diaryPwdInput.length].classList.remove('filled', 'error');
    }
    errEl.textContent = '';
    return;
  }

  if (diaryPwdInput.length >= 4) return;

  diaryPwdInput += key;
  dots[diaryPwdInput.length - 1].classList.add('filled');
  errEl.textContent = '';

  if (diaryPwdInput.length === 4) {
    setTimeout(function() {
      if (diaryPwdInput === diaryPassword) {
        closeModal('diaryPwdModal');
        showDiaryContent(diaryPwdTargetDate);
      } else {
        diaryPwdInput = '';
        dots.forEach(function(d) { d.classList.add('error'); d.classList.remove('filled'); });
        errEl.textContent = '❌ 密码错误，请重新输入';
        vibrateDevice([100, 50, 100]);
        setTimeout(function() {
          dots.forEach(function(d) { d.classList.remove('error'); });
          errEl.textContent = '';
        }, 600);
      }
    }, 150);
  }
}

function showDiaryContent(date) {
  var diary = diaries.find(function(d) { return d.date === date; });
  if (!diary) return;
  document.getElementById('diaryViewContent').innerHTML =
    '<div class="diary-view-mood">' + (diary.mood || '📑') + '</div>' +
    '<div class="diary-view-date">📮 ' + date + '</div>' +
    '<div class="diary-view-text">' + (diary.content || '(无内容)') + '</div>';
  document.getElementById('diaryViewModal').classList.add('show');
}

// ============ 导出 ============
function exportAll() {
  var sorted = records.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  if (sorted.length === 0) { showToast('没有数据可导出'); return; }
  var BOM = '\uFEFF';
  var headers = ['日期', '类型', '分类', '金额', '备注'];
  var rows = sorted.map(function(r) {
    var map = r.type === 'expense' ? EXPENSE_MAP : INCOME_MAP;
    var cat = map[r.category] || {};
    return [r.date, r.type === 'expense' ? '支出' : '收入', cat.name || r.category, r.amount.toFixed(2), r.note || ''].join(',');
  }).join('\n');
  var blob = new Blob([BOM + headers.join(',') + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = '我的账本_全部数据.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('📜 导出成功');
}

// ============ FAB ============
function scrollToAdd() {
  if (currentPageName !== 'home') switchPage('home');
  setTimeout(function() {
    document.querySelector('.quick-add-card').scrollIntoView({ behavior: 'smooth' });
    setTimeout(function() {
      var firstCat = document.querySelector('#page-home .cat-btn');
      if (firstCat) firstCat.click();
    }, 400);
  }, 300);
}

// ============ 初始化 ============
function initDatePicker() {
  var di = document.getElementById('recordDate');
  di.value = getToday();
  di.max = getToday();
}

function refreshAll() {
  renderTodaySummary();
  if (currentPageName === 'records') renderMonthFold();
}

async function initApp() {
  loadSidebarTitle();
  loadDandelionTheme();
  initDatePicker();
  setType('expense');
  renderCatGrid();
  populateChartMonth();
  renderTodaySummary();
  document.getElementById('sidebarUserName').textContent = currentUser;
  document.getElementById('sidebarUserInfo').style.display = 'flex';
}

// ============ 超限顶部横幅 ============
function showOverlimitBanner(warnings) {
  var banner = document.getElementById('overlimitBanner');
  var text = document.getElementById('overlimitBannerText');
  if (!banner || !text) return;
  var msgs = warnings.map(function(w) {
    return (w.type === 'daily' ? '今日' : '本月') + '超支 ' + fmtMoney(w.over);
  });
  text.textContent = msgs.join('；');
  banner.style.display = 'flex';
  clearTimeout(banner._hideTid);
  banner._hideTid = setTimeout(function() {
    banner.style.display = 'none';
  }, 5000);
}

function dismissOverlimitBanner() {
  var banner = document.getElementById('overlimitBanner');
  if (banner) banner.style.display = 'none';
}

// ============ 日志当月汇总 ============
function renderDiaryMonthSummary() {
  var container = document.getElementById('diaryMonthSummary');
  if (!container) return;
  var currentMonth = getCurrentMonth();
  var monthDiaries = diaries.filter(function(d) {
    return getMonthKey(d.date) === currentMonth;
  });
  if (monthDiaries.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  var moodCounts = {};
  monthDiaries.forEach(function(d) {
    var m = d.mood || '📑';
    moodCounts[m] = (moodCounts[m] || 0) + 1;
  });
  var sorted = Object.keys(moodCounts).sort(function(a, b) { return moodCounts[b] - moodCounts[a]; });
  container.innerHTML = '<span class="diary-summary-label">本月日志：</span>' +
    sorted.map(function(m) { return '<span class="diary-summary-tag">' + m + ' ×' + moodCounts[m] + '</span>'; }).join('') +
    '<span class="diary-summary-tag" style="background:var(--primary-light);color:var(--primary)">共 ' + monthDiaries.length + ' 篇</span>';
}

// ============ 启动 ============
async function boot() {
  await initLoginPassword();
  renderAccountList();
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('sidebarUserInfo').style.display = 'none';
  showToast('☁️ 云端同步已就绪');
}

boot();
