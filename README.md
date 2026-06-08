# 大数据技术期末项目报告

**学生姓名：** 曾瑞  
**学　　号：** 022340508  
**项目名称：** 我的账本 - 个人记账 Web 应用  
**开发类型：** ☑ 网页端项目 □ 桌面应用 □ 移动端应用 □ 全栈项目 □ 本地项目  
**完成时间：** 2026年6月5日

---

## 期末项目完整提交要素清单

必查项：

1. ✅ 完整项目源码：可直接运行的完整项目文件夹，包含所有页面、样式、脚本文件
2. ✅ 完整 README + 项目报告：全部模块内容完整填写
3. ✅ 项目运行说明：明确标注开发环境、工具版本、项目启动步骤
4. ✅ 项目运行截图：包含首页、核心功能、交互效果等实拍截图
5. ✅ 核心代码说明：选取项目重难点功能代码，搭配文字解析
6. ✅ 项目自查文档：明确项目完成度、已实现功能、不足与优化方向

---

## 项目工具、资源与附件清单

| 资源类别 | 实际使用内容 | 用途说明 |
|---------|-------------|---------|
| LLM 工具 | CodeBuddy（内置 AI 助手） | 辅助需求梳理、代码优化、Bug 排查、报告撰写 |
| IDE 开发工具 | CodeBuddy IDE + VS Code | 项目编写、代码调试、文件管理、语法检测 |
| GitHub 仓库 | https://github.com/xiaoruirui170/6.4 | 项目版本管理、代码备份、迭代记录留存 |
| 自定义 Website | https://xiaoruirui170.github.io/6.4/ | 项目在线访问地址 |
| 云服务商 | Supabase | 云端数据库 + 用户认证服务 |
| 程序包附件 | 源代码文件夹、README.md | 源码包 + 项目介绍说明 |

---

## 摘要

本项目「我的账本」是一款基于 Web 的个人记账应用，采用纯 HTML+CSS+JavaScript 原生技术开发，通过 Supabase BaaS 平台提供云端数据库与用户认证服务。

项目使用 Supabase Auth 实现邮箱密码注册登录，支持收支记账、数据可视化分析（Chart.js）、心情日志、日月限额管理等功能。采用本地优先（Local-First）数据策略，localStorage 缓存确保秒级响应，后台通过 Supabase REST API 异步同步到 PostgreSQL 云数据库，实现多设备数据一致。

样式系统使用 CSS 变量配合 body.theme 类选择器实现三套主题换肤，含赛博朋克风格暗色主题。通过 Flexbox 响应式布局适配桌面端与移动端。

---

## 一、项目概述

### 1.1 项目背景与意义

在日常学习生活中，个人记账是培养理财习惯、合理规划开支的重要方式。然而目前市面上的手机记账 App 普遍存在广告多、功能臃肿、隐私收集等问题，使用体验不佳。因此本项目选用「我的账本」这一轻量级、高隐私的纯 Web 记账应用，旨在替代传统手机记账工具，帮助用户便捷记录日常收支、分析消费结构。

项目作为 Web 前端课程综合性大作业，涵盖完整的全栈开发流程，将 HTML/CSS/JavaScript 理论知识转化为实际工程能力，通过前端页面开发、数据处理可视化、云端数据库操作、响应式布局设计等核心知识点，具有较好的课程实践价值和综合训练意义。

### 1.2 项目开发目标

- **基础目标：** 实现邮箱注册登录、12 类支出/6 类收入快速记账、按月流水明细查询、类别筛选和时间排序；三个数据可视化图表（Doughnut 环形图、Line 折线图、Bar 柱状图）；Emoji 心情日志及月度汇总统计。
- **进阶目标：** 日月额度限额与超限震动提醒；蒲公英主题三套配色切换；侧边栏标题可自定义编辑并云端持久化。
- **后期改进：** 解决 Supabase API 数据获取延迟问题、Chart.js 切换月份图表叠加需先调用 destroy()、异步顺序混乱最终改用 async/await 解决。

### 1.3 项目运行环境

| 环境类型 | 具体内容 |
|---------|---------|
| 硬件环境 | PC 或移动设备浏览器 |
| 系统环境 | Windows/macOS/Linux/iOS/Android（跨平台） |
| 开发工具 | CodeBuddy IDE + VS Code |
| 运行环境 | Chrome/Edge/Safari/Firefox 浏览器 |
| 数据存储 | Supabase Cloud PostgreSQL + localStorage 本地缓存 |

---

## 二、关键技术与开发栈

### 2.1 核心开发技术

| 技术 | 版本/说明 |
|------|----------|
| HTML5 | 页面结构与语义化标签 |
| CSS3 | CSS 变量系统、Flexbox/Grid 响应式布局、大圆角设计风格 |
| JavaScript | ES6+，async/await 异步编程、fetch API、事件委托 |
| Chart.js | v4.4（CDN 引入），Doughnut/Line/Bar 三种图表 |
| Supabase | BaaS 平台，提供 Auth 认证 + PostgreSQL 数据库 |
| @supabase/supabase-js | v2（CDN 引入），前端 JS 客户端 SDK |

### 2.2 辅助开发技术/工具

| 工具 | 用途 |
|------|------|
| Git + GitHub | 版本控制与代码托管 |
| CodeBuddy AI | 代码生成、Bug 排查、文档编写 |
| jsDelivr CDN | 第三方库引入 |
| GitHub Pages | 静态站点托管 |
| Supabase SQL Editor | 表结构与 RLS 策略配置 |

---

## 三、项目需求分析

### 3.1 功能性需求

1. 用户注册与登录（邮箱 + 密码，Supabase Auth 认证）
2. 快速记账（12 类支出、6 类收入，快捷金额按钮）
3. 流水明细查询（按月折叠展示，类型筛选和时间排序切换）
4. 数据可视化分析（消费占比环形图、收支趋势折线图、类别排行柱状图）
5. 心情日志（6 种 Emoji + 文字记录，按月汇总，4 位密码保护）
6. 日/月支出限额设置与超限横幅警告
7. 蒲公英主题三套配色切换（赛博玫红/浅蓝/浅黄）
8. 侧边栏自定义标题编辑
9. 收支记录 CSV 导出
10. 云端数据同步（多设备登录同一账号数据一致）

### 3.2 非功能性需求

- **易用性：** 纯浏览器打开即用，无需安装；登录注册不超过 3 步；Toast 提示反馈所有操作。
- **兼容性：** 响应式布局适配桌面端和移动端；主流浏览器均正常显示。
- **稳定性：** localStorage 本地缓存秒级加载，离线可查看历史；Supabase 云端持久化；upsert 避免重复写入。
- **安全性：** Supabase RLS 行级安全策略；心情日志额外 4 位密码保护。

---

## 四、项目总体设计

### 4.1 整体架构设计

本项目采用单页应用（SPA）架构，前后端分离开发模式。前端为纯静态 HTML/CSS/JavaScript 三文件结构（index.html + styles.css + app.js），无构建工具依赖，通过 CDN 引入第三方库。后端服务完全由 Supabase BaaS 平台提供，包含 Auth 认证服务和 PostgreSQL 云数据库。

数据采用本地优先（Local-First）策略：读写优先操作 localStorage 实现秒级响应，后台异步通过 Supabase REST API 与云端双向同步。UI 采用 CSS 变量主题系统，通过 root 变量 + body.theme 类选择器实现全局换肤。

### 4.2 功能模块设计

- **模块一：认证登录模块** —— 负责用户注册、登录、登出及会话管理。基于 Supabase Auth 实现，提供 doLogin()、doRegister()、doLogout() 功能及 boot() 自动恢复会话。
- **模块二：记账业务模块** —— 核心业务逻辑，包含快速记账、流水查询、类别筛选排序、限额检查与超限警告、CSV 导出。
- **模块三：数据可视化模块** —— 基于 Chart.js v4.4 实现三张图表，支持按月份切换。
- **模块四：云端同步模块** —— 管理 Supabase 云端数据库读写与同步策略，本地与云端智能合并去重。
- **模块五：心情日志模块** —— 今日心情记录，6 种 Emoji 选择，日志历史列表查看，4 位密码保护。
- **模块六：设置与主题模块** —— 日/月限额配置、三套主题切换、标题编辑、密码修改。

### 4.3 页面/路由结构设计

```
项目根目录/
├── index.html          (主入口，~3200行)
├── styles.css          (独立样式文件，~1485行)
├── app.js              (独立逻辑文件，~1243行)
├── README.md           (项目报告)
└── 源代码/             (源码备份)
    ├── index.html
    ├── styles.css
    └── app.js

index.html 内部结构:
├── <head>
│   ├── meta viewport (响应式适配)
│   ├── CDN: supabase-js@2 + chart.js@4.4
│   └── 内嵌完整 CSS 样式
├── <body>
│   ├── <!-- 侧边栏 --> (#sidebar)
│   │   ├── Logo/标题(可编辑) + 用户邮箱显示
│   │   └── 导航菜单: 首页/流水/分析/日志/设置
│   ├── <!-- 主内容区 --> (#main)
│   │   ├── #page-home      （首页：记账表单 + 今日摘要）
│   │   ├── #page-list      （流水：筛选 + 流水列表）
│   │   ├── #page-analysis  （分析：Chart.js 图表）
│   │   ├── #page-diary     （日志：emoji 心情日志）
│   │   ├── #page-settings  （设置：主题/限额/导出）
│   │   └── #loginOverlay   （登录遮罩层）
│   └── 浮动按钮(FAB): 快捷记账
└── <script> 内嵌完整 JavaScript 业务逻辑
```

页面切换通过 showPage() 函数控制显示/隐藏，登录态由 currentUser 变量判断。

---

## 五、核心功能实现与代码说明

### 功能一：Supabase Auth 邮箱认证系统

**实现思路：**

使用 Supabase 客户端 SDK 的 Auth 模块替代旧版自建用户名密码体系。用户通过邮箱和密码注册/登录，Supabase 服务端验证凭据后返回 JWT 会话 token，前端将 session 存储于 localStorage 中，下次访问时通过 getSession() 自动恢复登录态。

**核心代码：**

```javascript
// 初始化 Supabase 客户端
var SUPABASE_URL = 'https://bmfwgxfrdtjfourwtwhl.supabase.co';
var SUPABASE_KEY = 'sb_publishable_FPbyCVlUq7Qy4nKUtscm8g_PhqBS01t';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 登录函数
async function doLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var pwd = document.getElementById('loginPassword').value;
  if (!email || !pwd) { errEl.textContent = '请输入邮箱和密码'; return; }
  if (pwd.length < 6) { errEl.textContent = '密码不能少于6位'; return; }
  var { data, error } = await sb.auth.signInWithPassword({
    email: email, password: pwd
  });
  if (error) { errEl.textContent = '❌ ' + error.message; return; }
  await onAuthSuccess(data.user);
}

// 注册函数
async function doRegister() {
  var { data, error } = await sb.auth.signUp({
    email: email, password: pwd
  });
  if (error) { /* 错误处理 */ }
  if (data.user && !data.session) {
    alert('注册成功！请检查邮箱确认注册');
  }
}
```

**实现效果：**

用户打开网页即看到登录界面，输入邮箱密码点击「登录」，或首次使用点击「注册」。登录成功后侧边栏显示邮箱，刷新页面无需重复登录，多设备使用同一账号可同步所有数据。

### 功能二：本地优先（Local-First）云端双向数据同步

**实现思路：**

采用"本地写入优先 + 后台异步同步"策略。每次数据变更时立即写入 localStorage 保证秒级响应，同时异步调用 Supabase upsert API 推送云端。应用启动时先读本地缓存渲染（秒开），后台从云端拉取最新数据做智能合并——以 createdAt 时间戳去重取并集。

**核心代码：**

```javascript
async function syncUserDataFromCloud() {
  var { data: recData } = await sb.from('records')
    .select('*').eq('user_id', currentUser)
    .order('created_at', { ascending: false });
  var cloudRecords = recData.map(function(r) { return r.data; });
  var merged = {};
  records.forEach(function(r) { merged[r.id] = r; });
  cloudRecords.forEach(function(r) {
    if (!merged[r.id] || r.updatedAt > merged[r.id].updatedAt) {
      merged[r.id] = r;
    }
  });
  records = Object.values(merged);
}

async function saveRecordsToCloud() {
  localStorage.setItem('ledger_' + currentUser + '_records',
    JSON.stringify(records));
  var rows = records.map(function(r) {
    return {
      user_id: currentUser, record_id: r.id, data: r,
      created_at: r.createdAt, updated_at: r.updatedAt || r.createdAt
    };
  });
  await sb.from('records').upsert(rows, { onConflict: 'record_id' });
}
```

**实现效果：**

任何网络环境下都能流畅记账，即使断网也能查看和新增记录；联网后自动同步到云端，多设备数据一致。

### 功能三：基于 Chart.js 的消费数据分析可视化

**实现思路：**

利用 Chart.js 三种图表对当月收支进行可视化。根据选中月份过滤记录后分别聚合数据：(1) 按 category 分组汇总金额占比 → 环形图；(2) 按日期汇总当日收支净额 → 折线图；(3) 按 category 分组汇总金额 → 柱状图。切换月份前必须调用 destroyCharts() 销毁旧实例防止叠加。

**核心代码：**

```javascript
function renderCharts() {
  destroyCharts();  // 必须先销毁旧实例
  var month = document.getElementById('chartMonth').value;
  var monthRecords = records.filter(function(r) {
    return getMonthKey(r.date) === month;
  });
  var expenseRecords = monthRecords.filter(function(r) {
    return r.type === 'expense';
  });
  var catMap = {};
  expenseRecords.forEach(function(r) {
    catMap[r.category] = (catMap[r.category] || 0) + Number(r.amount);
  });
  doughnutChart = new Chart(document.getElementById('doughnutChart'), {
    type: 'doughnut', data: {
      labels: Object.keys(catMap),
      datasets: [{ data: Object.values(catMap),
        backgroundColor: EXPENSE_COLORS }]
    }
  });
}

function destroyCharts() {
  [doughnutChart, lineChart, barChart].forEach(function(c) {
    if (c) c.destroy();
  });
}
```

**实现效果：**

分析页面清晰展示本月消费分布、每日收支走势、类别金额排名，支持切换月份进行对比分析。

---

## 六、项目运行效果展示

### 数据库表结构

| 表名 | 字段 | 说明 |
|------|------|------|
| records | user_id(UUID) + record_id(BIGINT) + data(JSONB) + timestamps | 收支记录 |
| diaries | user_id(UUID) + diary_date(TEXT) + data(JSONB) + timestamps | 心情日志 |
| user_settings | user_id(UUID) + key(TEXT) + value(TEXT) | 用户设置 |

### 主题系统

| 主题 | 主色调 | 风格 |
|------|--------|------|
| 🌸 赛博玫红 | #e91e8c | 深色暗黑 + 荧光绿特效 + 扫描线动画 |
| 🩵 浅蓝 | #5b9bd5 | 清新明亮风格 |
| 🌼 浅黄 | #f0c040 | 温暖柔和风格 |

---

## 七、项目测试与问题解决

### 7.1 功能测试

- ✅ 注册新账号 → 登录成功 → 侧边栏显示邮箱
- ✅ 新增记录 → 流水实时更新 → 刷新数据仍在
- ✅ 切换主题 → 全局配色立即生效
- ✅ 设置限额 → 超限 → 顶部红色横幅警告
- ✅ 心情日志 → 密码保护 → 需验证密码
- ✅ 分析页三图表正确渲染 → 切换月份数据跟随
- ✅ 同一账号多设备登录 → 数据自动同步

### 7.2 开发问题与解决方案

**问题 1：Supabase RLS 策略导致 400 Bad Request**

- **现象：** 登录后操作报错 `user_settings 400 Bad Request` 和 `POST 失败`
- **原因：** 数据库表保留旧版 `username` 列（NOT NULL 约束）和旧 RLS 策略，新版代码只传 `user_id`(UUID) 导致 INSERT 缺必填字段
- **解决：** Supabase SQL Editor 执行 `ALTER TABLE DROP COLUMN username`，重建 RLS 策略 `USING (user_id = auth.uid())`

**问题 2：Chart.js 切换月份时图表叠加重叠**

- **现象：** 切换月份后新图表叠在旧图表上面
- **原因：** Canvas 上绑定了旧 Chart 实例未释放，new Chart() 时两套图层共存
- **解决：** `renderCharts()` 开头先调用 `destroyCharts()` 逐一 `.destroy()` 销毁后再重新创建

**问题 3：async/await 异步顺序混乱**

- **现象：** 页面打开瞬间空白或数据缺失，过一会才显示
- **原因：** 多个 async 函数并行执行但互相依赖（需先拿到 user_id 才能查库）
- **解决：** 采用"先读缓存渲染界面 + 后台异步同步"两阶段策略，`onAuthSuccess()` 中先读 localStorage 展示，再 `syncUserDataFromCloud()` 后台拉取合并后二次渲染

---

## 八、项目总结与心得

### 8.1 项目总结

本项目「我的账本」v6 已按预期完成全部功能开发。Supabase Auth 邮箱认证稳定运行，12 类收支快速记账与流水查询功能完备，Chart.js 可视化图表效果良好，蒲公英三套主题运行正常，云端同步保证多设备数据一致。

**项目优点：**
- 纯原生技术栈零构建依赖，浏览器打开即用
- Local-First 策略保证离线可用
- SPA 架构体验流畅
- 代码结构清晰、模块分明

**存在不足：**
- 未引入 PWA 支持离线完全使用（依赖 CDN 资源）
- CSV 导出仅 UTF-8 BOM 编码，Excel 中可能乱码
- 日志密码 localStorage 存储安全性待提升

**后续优化：**
- 引入 Service Worker 实现离线支持
- 增加年度报表
- 接入账单导入功能
- 加强密码加密

### 8.2 学习心得

通过本次开发，我深刻体会到了 BaaS 平台（如 Supabase）带来的效率提升——不需自己搭建服务器和 API，几行代码就能完成认证和数据持久化。

最大收获是学会独立排查问题：遇到 400 错误用浏览器 Network 面板看请求 payload，再用 SQL Editor 检查表结构和 RLS 策略定位根因。CodeBuddy AI 工具大幅提升了开发效率，特别是在重复性 HTML/CSS 模板代码和文档撰写方面。

也认识到代码规范的重要性——async 函数没加 await 导致数据竞争 bug，统一改为 async/await 链式调用后才彻底解决，这让我更加重视异步编程的正确姿势。

---

## 九、参考文献

1. Supabase 官方文档 — https://supabase.com/docs
2. Chart.js 官方文档 — https://www.chartjs.org/docs/
3. MDN Web Docs — https://developer.mozilla.org/
4. GitHub 仓库 — https://github.com/xiaoruirui170/6.4
5. CodeBuddy AI 助手 — https://www.codebuddy.ai

---

## 十、提交要素自查清单

- ✅ 项目源码完整齐全，无文件缺失、无报错，可正常启动运行
- ✅ 项目报告所有模块已完整填写，内容贴合个人开发项目
- ✅ README.md、配套运行说明、技术说明等内容齐全
- ✅ 核心代码解析、问题与解决方案内容真实具体，无空项
- ✅ 整体项目功能完整，达到课程期末项目考核要求

---

**我的账本 v6** | 曾瑞 022340508  
GitHub: https://github.com/xiaoruirui170/6.4  
在线地址: https://xiaoruirui170.github.io/6.4/
