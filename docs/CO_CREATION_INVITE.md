# Co-Creation Invitation / 邀请共创说明

## 1. Project Vision / 项目愿景

AI Employee Prototype App is an open-source prototype for building an AI-powered multi-platform business assistant.

AI 员工系统原型希望把内容运营、客户管理、AI 视频生成、商户入驻、发布计划、选品分析、达人合作和经营分析整合到一个可持续演进的工作台中。

The project is currently a local prototype. It focuses on clear flows, modular responsibilities, and a complete business loop before connecting production databases and official platform APIs.

当前项目是本地原型，重点不是一次性做成大型生产系统，而是先把职责、链路、模块边界和业务闭环搭清楚，再逐步接入真实数据库和平台官方接口。

## 2. Who Can Join / 适合谁参与

This project welcomes contributors interested in:

- AI video generation
- multi-platform content operations
- customer messaging automation
- e-commerce merchant tools
- platform API integration
- UI/UX for business workbenches
- local-first prototype architecture

欢迎以下方向的共创者：

- AI 视频生成
- 多平台内容运营
- 客户消息自动化
- 电商商户经营工具
- 抖音、快手、小红书等平台接口接入
- 业务工作台 UI/UX
- 本地优先的原型架构

## 3. What the Program Already Has / 当前已具备的内容

### 3.1 Login and Access Control / 登录与使用权限

The app already includes:

- personal user and merchant user selection
- local demo accounts
- account expiry date
- quota control for content search, video drafts, and video rendering
- admin access panel

已经具备：

- 个人用户 / 商户用户选择
- 本地演示账号
- 账号到期时间
- 内容搜索额度、脚本草稿额度、视频生成额度
- 管理员权限配置面板

### 3.2 Multi-Platform Content Search / 多平台内容搜索

The app can search and display content grouped by platform:

- Douyin
- Kuaishou
- WeChat Channels
- Xiaohongshu

当前内容搜索支持按平台分组展示：

- 抖音
- 快手
- 视频号
- 小红书

Each platform can return up to 10 latest content items in the prototype flow. The main page shows platform summaries, and detail lists open in modal dialogs.

每个平台在原型链路中最多返回 10 条最新内容。主页面展示平台摘要，完整内容通过弹窗查看。

### 3.3 AI Video Generation / AI 视频生成

The AI video workflow includes:

1. enter product copy
2. analyze usage scenarios
3. generate script and storyboard
4. allow user editing
5. open render confirmation dialog
6. generate voice
7. render local MP4 video
8. show final video and audio result

AI 视频生成链路包括：

1. 输入产品文案
2. 分析使用场景
3. 生成脚本与分镜
4. 允许用户编辑
5. 弹出生成确认框
6. 生成语音
7. 渲染本地 MP4 视频
8. 展示视频与声音结果

Supported provider configuration areas:

- script/storyboard model
- voice model
- video generation provider

支持配置：

- 脚本/分镜模型
- 配音模型
- 视频生成供应商

### 3.4 Customer Management and Messaging / 客户管理与聊天

The customer management page includes:

- platform conversation list
- latest message preview
- unread/new message badge
- AI reply suggestion
- customer AI configuration
- enterprise knowledge base configuration
- platform jump button
- text reply
- emoji insertion
- local image/video sending entry
- local platform messaging gateway

客户管理页已经具备：

- 平台会话列表
- 最新消息摘要
- 新消息提示
- AI 回复建议
- 客户 AI 配置
- 企业知识库配置
- 跳转对应平台
- 文本回复
- 表情插入
- 本地图片/视频发送入口
- 本地平台消息网关

Important design rule:

Authorization does not block the business flow. If a platform is not authorized, outbound messages enter the local platform queue. After authorization and official API permission are ready, the same gateway can switch to official adapters.

重要设计规则：

授权不阻断业务链路。未授权时，消息进入本地平台队列；完成授权和官方接口权限后，同一消息网关可以切换到官方适配器。

### 3.5 Publishing Plan / 发布计划

The publishing module includes:

- hot content insight
- best publish time analysis
- content duration analysis
- upload video file name
- copywriting
- scheduled publish time
- multi-platform selection
- automatic publish queue status

发布计划模块包含：

- 爆款内容洞察
- 最佳发布时间分析
- 视频时长分析
- 上传视频文件名
- 发布文案
- 定时发布时间
- 多平台选择
- 自动发布队列状态

### 3.6 Product Selection / 商品选品

The product module includes:

- product list
- product hot score
- GMV
- sales count
- commission rate
- risk label
- multi-platform analysis
- 10 external links per platform in product detail

商品选品模块包含：

- 商品列表
- 商品热度
- GMV
- 销量
- 佣金比例
- 风险标签
- 多平台分析
- 每个平台 10 条外部链接

### 3.7 Creator Cooperation / 达人合作

The creator cooperation flow includes:

1. creator list
2. creator detail
3. platform contact method
4. cooperation start
5. cooperation steps
6. quote and schedule
7. sample delivery and content review
8. publish and review

达人合作链路包括：

1. 达人列表
2. 达人详情
3. 平台联系渠道
4. 发起合作
5. 合作流程步骤
6. 报价与排期
7. 寄样与内容审核
8. 发布与复盘

### 3.8 Merchant Onboarding / 商户入驻

Merchant onboarding includes:

- merchant basic information
- platform material summary
- platform material upload dialog
- simulated review submission
- simulated review approval
- authorization code generation after approval

商户入驻包括：

- 商户基础信息
- 平台资料摘要
- 平台资料上传弹窗
- 模拟提交审核
- 模拟审核通过
- 审核通过后生成授权 Code

### 3.9 Team Permissions / 团队权限

The team module includes:

- member list
- add member
- role selection
- role permission display
- audit log chart
- audit log detail dialog

团队权限模块包括：

- 成员列表
- 添加成员
- 角色选择
- 角色权限展示
- 操作日志图表
- 操作日志详情弹窗

### 3.10 System Configuration / 系统配置

The settings entry is placed in the top-right gear icon. It includes:

- user quota and access
- platform accounts
- Douyin authorization
- customer AI reply config
- enterprise knowledge base
- text model config
- voice model config
- video provider config

系统配置入口在右上角齿轮中，包含：

- 用户额度与权限
- 平台账号
- 抖音授权
- 客户 AI 回复配置
- 企业知识库
- 文本模型配置
- 配音模型配置
- 视频供应商配置

## 4. Full Operation Flow / 完整操作流程

### 4.1 First Run / 首次运行

```powershell
git clone https://github.com/lgpassword/ai-employee-prototype-app.git
cd ai-employee-prototype-app
npm install
npm start
```

Open:

```text
http://127.0.0.1:3201
```

### 4.2 Login / 登录

Use one of the demo accounts:

```text
admin / admin123
user / user123
merchant / merchant123
```

使用演示账号登录后，系统会根据身份展示个人能力或商户能力。

### 4.3 Merchant Flow / 商户经营流程

Recommended path:

1. Login as merchant.
2. Complete merchant onboarding material status.
3. Configure AI providers.
4. Search platform content.
5. Extract copy into AI video generation.
6. Generate script and storyboard.
7. Edit script and shots.
8. Render video and voice.
9. Create publishing plan.
10. Select products and view platform links.
11. Start creator cooperation.
12. Manage customer conversations.
13. Review operations analytics.

推荐商户链路：

1. 以商户身份登录。
2. 完成商户入驻资料状态。
3. 配置 AI 供应商。
4. 搜索平台内容。
5. 提取文案到 AI 视频生成。
6. 生成脚本与分镜。
7. 编辑脚本与镜头。
8. 生成视频与声音。
9. 创建发布计划。
10. 进行商品选品和多平台链接分析。
11. 发起达人合作。
12. 管理客户会话。
13. 查看经营分析。

### 4.4 Customer Message Flow / 客户消息链路

Inbound:

```text
platform message -> /api/platform-messaging/inbound -> messages.js -> store.conversations -> customer management page
```

入站：

```text
平台消息 -> /api/platform-messaging/inbound -> messages.js -> store.conversations -> 客户管理页
```

Outbound:

```text
customer management page -> /api/conversations/:id/platform-reply -> messages.js -> local platform queue or official adapter
```

出站：

```text
客户管理页 -> /api/conversations/:id/platform-reply -> messages.js -> 本地平台队列或官方适配器
```

### 4.5 AI Video Flow / AI 视频链路

```text
copy -> scenario analysis -> script/storyboard -> user edit -> render dialog -> voice generation -> video rendering -> result preview
```

```text
文案 -> 场景分析 -> 脚本/分镜 -> 用户编辑 -> 生成确认 -> 语音生成 -> 视频渲染 -> 结果预览
```

## 5. Architecture / 架构说明

The project uses a simple single-process architecture:

项目采用简单的单进程架构：

```text
Browser UI
  -> public/app.js
  -> src/server.js
  -> src/modules/*
  -> src/services/*
  -> src/store.js
```

Current storage is in memory. This keeps the prototype easy to run and easy to modify. A production version should replace `src/store.js` with a database layer.

当前使用内存数据，便于本地运行和快速修改。生产版本应将 `src/store.js` 替换为数据库层。

## 6. Co-Creation Directions / 共创方向

Recommended areas for contributors:

欢迎共创的方向：

1. Replace in-memory store with SQLite/PostgreSQL.
2. Connect real Douyin/Kuaishou/Xiaohongshu message APIs.
3. Add real media upload storage.
4. Add user registration and password reset.
5. Add automated tests.
6. Add Docker deployment.
7. Improve AI video provider adapters.
8. Add real publish-to-platform adapters.
9. Add customer service workflow and assignment.
10. Improve design system and mobile layout.

## 7. Contribution Rules / 共创规则

Before submitting changes:

提交修改前：

```powershell
npm install
npm run check
npm start
```

Do not commit:

不要提交：

- `.env`
- `.local/`
- `node_modules/`
- `public/generated/`
- generated videos
- API keys
- OAuth tokens

## 8. Current Limitations / 当前限制

This is still a prototype:

当前仍是原型：

- Data is stored in memory.
- Platform APIs are adapter foundations, not all official APIs are connected.
- Generated media is local.
- Authentication is local demo logic.
- Branch protection for personal GitHub repositories cannot restrict push to a named user; only the owner has write access unless collaborators are added.

限制：

- 数据存储在内存中。
- 平台接口目前是适配层底座，并非所有官方接口都已接入。
- 生成媒体保存在本地。
- 登录鉴权是本地演示逻辑。
- GitHub 个人仓库不能按指定用户限制 push；只要不添加写权限协作者，默认只有所有者可写。

## 9. Invitation / 邀请

If you are interested in making AI employees practical for real merchants, this project is open for co-creation.

如果你希望把 AI 员工真正落到商户经营中，欢迎围绕这个项目共创。

You can start by reading:

建议先阅读：

- `README.md`
- `docs/CODE_MAP.md`
- `docs/API_REFERENCE.md`
- `docs/GITHUB_RELEASE.md`

Then choose one module and improve it end to end.

然后选择一个模块，从页面、接口、数据和验证开始完整改进。
