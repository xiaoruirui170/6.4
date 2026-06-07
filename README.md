# 我的账本 - 个人记账应用 (v6)

## 项目介绍

**我的账本**是一款基于 Web 的个人记账应用，采用单页应用（SPA）架构，使用 **Supabase Auth 邮箱密码登录**，支持收支记录、数据可视化分析、心情日志等功能。所有数据通过 Supabase 云端数据库存储，实现跨设备同步。

### 主要功能

- **邮箱注册/登录**：使用 Supabase Auth，支持邮箱密码注册登录，自动会话保持
- **快速记账**：一键记录支出/收入，12 个支出类别 + 6 个收入类别，支持快捷金额按钮
- **流水明细**：按时间查看收支记录，支持按类型筛选、排序切换、单条删除
- **数据分析**：
  - 消费占比环形图（Chart.js Doughnut）
  - 每日收支趋势折线图
  - 类别排行柱状图
- **心情日志**：每日记录心情（6 种 emoji 选择），按月汇总统计，4 位独立密码保护
- **日/月限额**：可设置每日/每月支出上限，超限横幅警告
- **蒲公英主题**：三套配色方案：
  - 🌸 赛博玫红（深色暗黑 + 荧光绿特效 + 扫描线动画）
  - 🩵 浅蓝（清新明亮）
  - 🌼 浅黄（温暖柔和）
- **自定义标题**：侧边栏标题可编辑，云端同步
- **CSV 导出**：全部收支记录可导出为 CSV 文件
- **云端同步**：Supabase 数据库实时同步，多端数据一致
- **响应式布局**：桌面端左右分栏，移动端侧边栏抽屉式滑出

---

## 技术框架

| 技术 | 说明 |
|------|------|
| **前端** | 纯 HTML5 + CSS3 + JavaScript（ES6+） |
| **UI 框架** | 原生 CSS 变量 + Flexbox/Grid 响应式布局 |
| **图表库** | Chart.js v4.4（CDN 引入） |
| **后端/数据库** | Supabase（PostgreSQL 云数据库） |
| **认证** | Supabase Auth（邮箱 + 密码） |
| **版本控制** | GitHub |

### 技术架构

```
┌─────────────────────────────────────────────────┐
│              浏览器（前端 SPA）                   │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │index.html│ │styles.css│ │   app.js       │   │
│  │(HTML结构) │ │(CSS样式)  │ │(JS业务逻辑)    │   │
│  └──────────┘ └──────────┘ └───────────────┘   │
│         Chart.js (CDN)   Supabase SDK (CDN)     │
│              ↓ fetch (REST API)                 │
├─────────────────────────────────────────────────┤
│            Supabase 云端服务                     │
│  ┌──────────────┬──────────┬──────────────────┐ │
│  │    Auth      │ Database │   (PostgreSQL)   │ │
│  │  (邮箱认证)   │┌────────┼────────┐         │ │
│  │              ││records │ diaries│         │ │
│  │              ││(记录表) │(日志表) │         │ │
│  │              │├────────┴────────┤         │ │
│  │              ││  user_settings  │         │ │
│  │              ││   (用户设置表)   │         │ │
│  └──────────────┴┴─────────────────┴─────────┘ │
└─────────────────────────────────────────────────┘
```

### 数据库设计

- **records 表**：存储收支记录
  - `user_id` UUID - 用户 ID（关联 Supabase Auth）
  - `record_id` BIGINT - 记录唯一 ID（upsert 冲突键）
  - `data` JSONB - 记录完整数据
  - `created_at` TIMESTAMPTZ - 创建时间
  - `updated_at` TIMESTAMPTZ - 更新时间

- **diaries 表**：存储心情日志
  - `user_id` UUID - 用户 ID
  - `diary_date` TEXT - 日志日期（YYYY-MM-DD，upsert 冲突键）
  - `data` JSONB - 日志完整数据
  - `created_at` TIMESTAMPTZ - 创建时间
  - `updated_at` TIMESTAMPTZ - 更新时间

- **user_settings 表**：存储用户偏好设置
  - `user_id` UUID - 用户 ID
  - `key` TEXT - 设置键名（如 `daily_limit`、`monthly_limit`、`title`、`theme`）
  - `value` TEXT - 设置值

> **注意**：v6 已移除旧版 `accounts` 表，认证完全由 Supabase Auth 管理。

---

## 运行说明

### 方式一：GitHub Pages 访问

```
https://xiaoruirui170.github.io/6.4/
```

### 方式二：本地运行

```bash
git clone https://github.com/xiaoruirui170/6.4.git
cd 6.4
# 直接用浏览器打开 index.html 即可
```

> 注意：本地通过 `file://` 协议打开时可能无法连接 Supabase 云端数据库，建议使用在线版本。

### 使用流程

1. 打开页面，输入邮箱和密码
2. 首次使用点击「注册」创建账号（密码不少于 6 位）
3. 已有账号点击「登录」
4. 登录后即可使用记账、查看分析、写日志等全部功能
5. 所有数据自动保存到云端，多设备登录同一账号自动同步

---

## 项目文件结构

```
6.4/
├── index.html              # 主程序（HTML 结构 + 内嵌 CSS/JS）
├── styles.css              # 独立 CSS 样式文件
├── app.js                  # 独立 JavaScript 业务逻辑文件
├── README.md               # 项目说明文档（Markdown）
└── README_preview.html     # 项目说明文档（HTML 版）
```

---

## 更新日志

### v6 (2025.06)
- 🔐 **认证系统重构**：从自定义用户名+6位数字密码 → Supabase Auth 邮箱登录
- 🆔 用户标识从 `username` (TEXT) 改为 `user_id` (UUID)
- 🗑️ 移除 `accounts` 自建账户表，认证由 Supabase Auth 管理
- 📊 数据库表增加 `updated_at` 时间戳字段
- 🎨 玫红主题升级为赛博朋克风格（深色背景 + 荧光绿 + 扫描线动画）
- 🖥️ 代码拆分：`index.html` + `app.js` + `styles.css` 三文件结构
- 📈 新增限额超限横幅警告
- 🌼 新增首页蒲公英装饰动画
- 📝 日志页新增当月心情汇总统计

---

## 开发信息

- **项目名称**：我的账本
- **作者**：xiaoruirui170
- **GitHub**：https://github.com/xiaoruirui170/6.4
- **Supabase 项目**：xiaoruirui170's Project
- **最后更新**：2025年6月7日
