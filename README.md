# AI 员工系统原型

英文文档见：[README_EN.md](README_EN.md)

AI 员工系统原型是一个本地运行的多平台经营工作台，覆盖内容搜索、AI 视频生成、客户管理、商户入驻、商品选品、发布计划、达人合作、团队权限和经营分析。

## 项目定位

本项目用于验证“AI 超级员工”在商户经营中的完整工作链路：从内容发现、选题分析、脚本分镜、视频与语音生成，到定时发布、客户消息处理和经营复盘。项目可以本地直接运行，并通过供应商配置逐步接入真实 AI 模型、视频模型、语音模型和平台开放接口。

代码按职责拆分：`public/` 负责前端界面，`src/modules/` 负责业务接口，`src/services/` 负责 AI、视频、语音和平台适配，`src/db/` 负责统一数据访问。

## 功能

- 多平台内容搜索
- AI 脚本与分镜生成
- 本地语音与视频生成
- AI 视频供应商配置
- OpenAI、通义万相、可灵、火山方舟 Seedance、腾讯 TokenHub、百度千帆视频适配器
- 客户聊天与本地平台消息网关
- 客户 AI 回复配置与企业知识库
- 发布计划与平台队列状态
- AI 任务中心后端、审批、知识库检索、平台能力记录和 ROI 指标
- 商品选品与多平台链接
- 达人合作流程
- 商户入驻与审核 Code 模拟
- 团队成员、角色、操作日志图表与详情
- 抖音 OAuth 配置底座

## 界面截图

| 数据仪表板 | 内容搜索 |
| --- | --- |
| ![数据仪表板](docs/screenshots/01-dashboard.png) | ![内容搜索](docs/screenshots/02-content-search.png) |

| AI 视频生成 | 客户管理 |
| --- | --- |
| ![AI 视频生成](docs/screenshots/03-ai-video.png) | ![客户管理](docs/screenshots/04-customer-management.png) |

| 经营分析 | 系统配置 |
| --- | --- |
| ![经营分析](docs/screenshots/05-operations-analytics.png) | ![系统配置](docs/screenshots/06-settings.png) |

## 核心链路

1. 按平台搜索与分类内容。
2. 选择商品或场景，生成脚本与分镜。
3. 用户确认并编辑 AI 输出后再生成。
4. 选择配音和视频供应商，本地或通过供应商生成。
5. 创建发布计划并查看平台队列状态。
6. 通过可配置 AI 和企业知识库回复客户消息。
7. 复盘经营指标、ROI、审批和操作日志。

## 环境要求

运行前需要安装：

- Node.js 18 或更高版本
- npm
- 本地语音生成建议使用 Windows PowerShell

项目使用 `@ffmpeg-installer/ffmpeg`，执行 `npm install` 后会自动安装 FFmpeg 依赖。

## 安装

```powershell
git clone https://github.com/lgpassword/ai-employee-prototype-app.git
cd ai-employee-prototype-app
npm install
```

如果你已经在本地目录中：

```powershell
cd D:\github\ai-employee-prototype-app
npm install
```

## 启动

```powershell
npm start
```

默认访问地址：

```text
http://127.0.0.1:3201
```

## 检查

```powershell
npm run check
```

该命令会检查后端模块、服务层和前端 JavaScript 语法。

## 演示账号

```text
管理员: admin / admin123
个人用户: user / user123
商户用户: merchant / merchant123
```

## 项目结构

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
│   ├── GITHUB_RELEASE.md
│   └── screenshots/
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
├── README.md
└── README_EN.md
```

文档说明：

- `docs/CODE_MAP.md`：每个文件的作用和业务链路。
- `.planning/ROADMAP.md`：基于修改指导文档拆分的 GSD 阶段规划。
- `docs/API_REFERENCE.md`：接口与后端方法映射。
- `docs/CO_CREATION_INVITE.md`：邀请共创、操作流程、业务链路、模块能力和共创方向。
- `docs/GITHUB_RELEASE.md`：GitHub 上传和主分支保护。

## 运行数据

以下目录不会上传到 Git：

```text
node_modules/
.local/
public/generated/
.env
.env.*
```

原因：

- `node_modules/`：安装依赖目录，可通过 `npm install` 恢复。
- `.local/`：本地日志、OAuth 缓存、运行数据和可能的密钥。过渡业务快照是 `.local/store.json`。
- `public/generated/`：生成的视频、音频、片段和分镜产物。
- `.env`：本地 API Key 和密钥。

当前过渡持久化层会在服务启动时读取 `.local/store.json`，并在 API 请求结束后保存业务状态。全局登录 `session` 不会写入快照。

后端业务模块统一通过 `src/db/index.js` 调用数据，`src/db/state.js` 只保存当前运行时状态和默认演示数据，`src/store.js` 仅保留为旧路径兼容层。

## AI 供应商配置

可以在系统界面中配置：

- 脚本与分镜模型
- 配音模型
- 视频生成供应商
- 客户 AI 回复模型
- 企业知识库

密钥只应保存在本地，不要提交到 GitHub。

## 平台消息网关

系统包含本地平台消息网关：

```text
GET  /api/platform-messaging/status
POST /api/platform-messaging/inbound
POST /api/conversations/:id/platform-reply
```

授权不会阻断业务链路。未授权时消息会进入本地平台队列；完成真实平台授权和消息接口权限后，同一适配层可以切换为官方接口下发。

## 上传 GitHub

```powershell
cd D:\github\ai-employee-prototype-app
git remote add origin https://github.com/lgpassword/ai-employee-prototype-app.git
git branch -M main
git push -u origin main
```

主分支保护和开源发布说明见 `docs/GITHUB_RELEASE.md`。

## 主分支保护

项目已包含：

```text
.github/CODEOWNERS
.github/pull_request_template.md
```

对于个人 GitHub 仓库，默认只有所有者拥有写权限。不要添加具备写权限的协作者，同时为 `main` 启用分支保护，禁止强制推送和删除分支。

## 开源协议

MIT 开源协议，详见 `LICENSE`。

## 常见问题

### 其他电脑能直接运行吗？

可以，但需要先安装 Node.js 和依赖：

```powershell
npm install
npm start
```

### 生成的视频会上传吗？

不会。`public/generated/` 已被忽略。

### API Key 会上传吗？

不会。`.env` 和 `.local/` 已被忽略。
