# AI Employee Prototype App / AI 员工系统原型

AI Employee Prototype App is a local prototype for multi-platform content operations, AI video generation, customer messaging, merchant onboarding, product selection, publishing plans, creator cooperation, team permissions, and business analytics.

AI 员工系统原型是一个本地运行的多平台经营工作台，覆盖内容搜索、AI 视频生成、客户管理、商户入驻、商品选品、发布计划、达人合作、团队权限和经营分析。

## Features / 功能

- Multi-platform content search / 多平台内容搜索
- AI script and storyboard generation / AI 脚本与分镜生成
- Local voice and video rendering / 本地语音与视频生成
- AI video provider configuration / AI 视频供应商配置
- OpenAI, Aliyun Wanxiang/Kling, Volcengine Seedance, Tencent TokenHub, and Baidu Qianfan video adapters / OpenAI、通义万相、可灵、火山方舟 Seedance、腾讯 TokenHub、百度千帆视频适配器
- Customer messaging and local platform message gateway / 客户聊天与本地平台消息网关
- Customer AI reply configuration and knowledge base / 客户 AI 回复配置与企业知识库
- Publishing plans and platform queue status / 发布计划与平台队列状态
- AI task center backend, approval requests, knowledge retrieval, platform capability records, and ROI metrics / AI 任务中心后端、审批、知识库检索、平台能力记录和 ROI 指标
- Product selection with multi-platform links / 商品选品与多平台链接
- Creator cooperation process / 达人合作流程
- Merchant onboarding and simulated review code / 商户入驻与审核 Code 模拟
- Team members, roles, audit chart, and audit detail / 团队成员、角色、操作日志图表与详情
- Douyin OAuth configuration foundation / 抖音 OAuth 配置底座

## Requirements / 环境要求

Install these before running the project:

运行前需要安装：

- Node.js 18 or later / Node.js 18 或更高版本
- npm
- Windows PowerShell is recommended for local voice rendering / 本地语音生成建议使用 Windows PowerShell

The project uses `@ffmpeg-installer/ffmpeg`, so FFmpeg will be installed by npm.

项目使用 `@ffmpeg-installer/ffmpeg`，执行 `npm install` 后会自动安装 FFmpeg 依赖。

## Install / 安装

```powershell
git clone https://github.com/lgpassword/ai-employee-prototype-app.git
cd ai-employee-prototype-app
npm install
```

If you are running from an existing local directory:

如果你已经在本地目录中：

```powershell
cd D:\github\ai-employee-prototype-app
npm install
```

## Start / 启动

```powershell
npm start
```

Default local URL:

默认访问地址：

```text
http://127.0.0.1:3201
```

## Validate / 检查

```powershell
npm run check
```

This command checks the syntax of backend modules, services, and frontend JavaScript.

该命令会检查后端模块、服务层和前端 JavaScript 语法。

## Demo Accounts / 演示账号

```text
Admin / 管理员: admin / admin123
Personal / 个人用户: user / user123
Merchant / 商户用户: merchant / merchant123
```

## Project Structure / 项目结构

```text
.
├── .github/
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── .planning/
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   └── phases/
├── docs/
│   ├── API_REFERENCE.md
│   ├── AI_EMPLOYEE_MODIFICATION_GUIDE.md
│   ├── CO_CREATION_INVITE.md
│   ├── CODE_MAP.md
│   └── GITHUB_RELEASE.md
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── src/
│   ├── server.js
│   ├── store.js
│   ├── db/
│   │   ├── index.js
│   │   ├── state.js
│   │   └── json-store.js
│   ├── modules/
│   └── services/
├── .gitignore
├── LICENSE
├── package.json
├── package-lock.json
└── README.md
```

See:

- `docs/CODE_MAP.md` for file-by-file responsibilities and flow descriptions.
- `.planning/ROADMAP.md` for GSD phase planning based on the modification guide.
- `docs/API_REFERENCE.md` for API and backend method mapping.
- `docs/CO_CREATION_INVITE.md` for co-creation invitation, operation flow, modules, and contribution directions.
- `docs/GITHUB_RELEASE.md` for GitHub publishing and branch protection.

文档说明：

- `docs/CODE_MAP.md`：每个文件的作用和业务链路。
- `.planning/ROADMAP.md`：基于修改指导文档拆分的 GSD 阶段规划。
- `docs/API_REFERENCE.md`：接口与后端方法映射。
- `docs/CO_CREATION_INVITE.md`：邀请共创、操作流程、业务链路、模块能力和共创方向。
- `docs/GITHUB_RELEASE.md`：GitHub 上传和主分支保护。

## Runtime Data / 运行数据

These directories are intentionally ignored by Git:

以下目录不会上传到 Git：

```text
node_modules/
.local/
public/generated/
.env
.env.*
```

Why:

原因：

- `node_modules/`: installed dependencies; restore with `npm install`.
- `.local/`: local logs, OAuth cache, runtime data, possible secrets. The transitional business snapshot is `.local/store.json`.
- `public/generated/`: generated videos, audio, clips, storyboard artifacts.
- `.env`: local API keys and secrets.

当前过渡持久化层会在服务启动时读取 `.local/store.json`，并在 API 请求结束后保存业务状态。全局登录 `session` 不会写入快照。

后端业务模块统一通过 `src/db/index.js` 调用数据，`src/db/state.js` 只保存当前运行时状态和默认演示数据，`src/store.js` 仅保留为旧路径兼容层。

## AI Provider Configuration / AI 供应商配置

You can configure providers inside the app:

可以在系统界面中配置：

- Script/storyboard model / 脚本与分镜模型
- Voice model / 配音模型
- Video generation provider / 视频生成供应商
- Customer AI reply model / 客户 AI 回复模型
- Enterprise knowledge base / 企业知识库

Secrets are kept locally and should not be committed to GitHub.

密钥只应保存在本地，不要提交到 GitHub。

## Platform Messaging Gateway / 平台消息网关

The app includes a local platform messaging gateway:

系统包含本地平台消息网关：

```text
GET  /api/platform-messaging/status
POST /api/platform-messaging/inbound
POST /api/conversations/:id/platform-reply
```

Authorization does not block the business flow. If a platform is not authorized, messages enter the local platform queue. After official authorization and message API permissions are available, the same adapter layer can send to the real platform.

授权不会阻断业务链路。未授权时消息会进入本地平台队列；完成真实平台授权和消息接口权限后，同一适配层可以切换为官方接口下发。

## GitHub Publishing / 上传 GitHub

```powershell
cd D:\github\ai-employee-prototype-app
git remote add origin https://github.com/lgpassword/ai-employee-prototype-app.git
git branch -M main
git push -u origin main
```

See `docs/GITHUB_RELEASE.md` for branch protection and release notes.

主分支保护和开源发布说明见 `docs/GITHUB_RELEASE.md`。

## Branch Protection / 主分支保护

The repository includes:

项目已包含：

```text
.github/CODEOWNERS
.github/pull_request_template.md
```

For this personal GitHub repository, only the owner has write access by default. Keep collaborators without write permission, enable branch protection for `main`, and disable force pushes and branch deletion.

对于个人 GitHub 仓库，默认只有所有者拥有写权限。不要添加具备写权限的协作者，同时为 `main` 启用分支保护，禁止强制推送和删除分支。

## License / 开源协议

MIT License. See `LICENSE`.

MIT 开源协议，详见 `LICENSE`。

## Common Issues / 常见问题

### Can another computer run this project directly? / 其他电脑能直接运行吗？

Yes, after installing Node.js and dependencies:

可以，但需要先安装 Node.js 和依赖：

```powershell
npm install
npm start
```

### Are generated videos uploaded to GitHub? / 生成的视频会上传吗？

No. `public/generated/` is ignored.

不会。`public/generated/` 已被忽略。

### Are API keys uploaded? / API Key 会上传吗？

No. `.env` and `.local/` are ignored.

不会。`.env` 和 `.local/` 已被忽略。
