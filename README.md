# 我的账本 - 个人记账应用

## 项目介绍

**我的账本**是一款基于 Web 的个人记账应用，采用单页应用（SPA）架构，支持多用户账户管理、收支记录、数据可视化分析、心情日志等功能。所有数据通过 Supabase 云端数据库存储，实现跨设备同步。

### 主要功能

- **多账户系统**：支持多个独立用户，每个用户有独立的记账数据
- **6位数字密码登录**：安全便捷的密码验证机制
- **快速记账**：一键记录支出/收入，支持快捷金额按钮
- **流水明细**：按时间查看收支记录，支持按类别筛选
- **数据分析**：
  - 消费占比环形图（Chart.js）
  - 收支趋势折线图
  - 类别排行柱状图
- **心情日志**：每日记录心情（emoji选择），按月汇总统计
- **月度限额**：设置日/月支出上限，超限震动警告
- **主题切换**：三种配色方案（玫红/浅蓝/浅黄）
- **云端同步**：Supabase 实时同步，多端数据一致

---

## 技术框架

| 技术 | 说明 |
|------|------|
| **前端** | 纯 HTML5 + CSS3 + JavaScript（ES6+） |
| **UI框架** | 原生 CSS 变量 + Flexbox/Grid 响应式布局 |
| **图表库** | Chart.js（CDN 引入） |
| **后端/数据库** | Supabase（PostgreSQL 云数据库） |
| **认证** | 自定义哈希密码系统 |
| **部署平台** | Cloudflare Pages（静态站点托管） |
| **版本控制** | GitHub |

### 技术架构

```
┌─────────────────────────────────────┐
│         浏览器（前端 SPA）           │
│  ┌─────────┐ ┌──────┐ ┌──────────┐ │
│  │ index.html ││ CSS  │ │ Chart.js │ │
│  │ (HTML+JS) ││ 内联  │ │ (CDN)    │ │
│  └─────────┘ └──────┘ └──────────┘ │
│              ↓ fetch (REST API)     │
├─────────────────────────────────────┤
│        Supabase 云端数据库          │
│  ┌──────────┬──────────┬──────────┐ │
│  │ accounts │ records  │ diaries  │ │
│  │ (账户表) │(记录表)  │(日志表)  │ │
│  └──────────┴──────────┴──────────┘ │
│       部署: Cloudflare Pages         │
└─────────────────────────────────────┘
```

### 数据库设计

- **accounts 表**：存储用户账户信息（username, password_hash, created_at）
- **records 表**：存储每条收支记录（username, record_id, data JSON, created_at, updated_at）
- **diaries 表**：存储心情日志（username, date, data JSON, created_at）
- **user_settings 表**：存储用户偏好设置（username, key, value）

---

## 运行说明

### 方式一：在线访问（推荐）

直接在浏览器中打开已部署的网站：

```
https://022340508.anluwodejiaxiang.eu.cc/
```

无需安装任何软件，即可使用全部功能。

### 方式二：本地运行

1. **获取源代码**
   ```bash
   git clone https://github.com/xiaoruirui170/6.4.git
   cd 6.4
   ```

2. **打开文件**
   - 直接用浏览器打开 `index.html` 即可运行
   
   > 注意：本地 `file://` 协议下可能无法连接 Supabase 云端数据库，
   > 建议使用在线版本以获得完整功能体验。

### 使用流程

1. 打开页面后进入登录界面
2. 点击「创建账户」输入用户名（初始密码为 `123456`）
3. 点击刚创建的账户，输入 6 位数字密码登录
4. 登录后即可使用记账、查看分析、写日志等全部功能
5. 所有数据自动保存到云端，下次登录自动恢复

---

## 项目文件结构

```
6.4/
├── index.html              # 主程序（包含 HTML + CSS + JavaScript 全部代码）
├── styles.css              # CSS 样式文件（独立拆分版）
├── app.js                  # JavaScript 逻辑文件（独立拆分版）
├── README.md               # 项目说明文档（Markdown 格式）
└── README_preview.html     # 项目说明文档（HTML 格式，可打印为 PDF）
```

本项目主文件 `index.html` 为**单文件架构**，将 HTML 结构、CSS 样式和 JavaScript 逻辑全部集成在一个文件中，方便部署和分发。同时提供独立的 `styles.css` 和 `app.js` 文件方便查看源码。

---

## 开发信息

- **项目名称**：我的账本
- **作者**：xiaoruirui170
- **GitHub 地址**：https://github.com/xiaoruirui170/6.4
- **在线地址**：https://022340508.anluwodejiaxiang.eu.cc/
- **Supabase 项目**：xiaoruirui170's Project
- **最后更新**：2025年6月7日
