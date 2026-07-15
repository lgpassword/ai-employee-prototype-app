# AI Employee Prototype App

AI 员工系统原型，用于多平台内容搜索、AI 视频生成、发布计划、商品选品、达人合作、客户管理、商户入驻、团队权限和平台消息通信链路验证。

## 技术栈

- Node.js 原生 HTTP 服务
- 原生 HTML / CSS / JavaScript 前端
- 内存数据仓储
- FFmpeg 本地视频/音频合成依赖

## 目录结构

```text
.
├── package.json
├── package-lock.json
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── src/
    ├── server.js
    ├── store.js
    ├── modules/
    │   ├── accounts.js
    │   ├── analytics.js
    │   ├── content.js
    │   ├── creators.js
    │   ├── dashboard.js
    │   ├── douyin.js
    │   ├── finance.js
    │   ├── live.js
    │   ├── messages.js
    │   ├── onboarding.js
    │   ├── orders.js
    │   ├── products.js
    │   ├── publishing.js
    │   ├── sales.js
    │   ├── settings.js
    │   ├── team.js
    │   └── video.js
    └── services/
        ├── ai-video-service.js
        ├── scenario-research.js
        ├── text-generation-service.js
        ├── tts-service.js
        └── video-renderer.js
```

## 不上传到 GitHub 的内容

以下内容由 `.gitignore` 排除：

- `node_modules/`：依赖目录，使用 `npm install` 重新安装。
- `.local/`：本地日志、授权缓存和运行数据。
- `.env` / `.env.*`：本地密钥配置。
- `public/generated/`：AI 视频、音频和分镜生成结果。

## 安装

```powershell
npm install
```

## 启动

```powershell
npm start
```

默认地址：

```text
http://127.0.0.1:3201
```

## 检查

```powershell
npm run check
```

## 演示账号

```text
管理员: admin / admin123
个人用户: user / user123
商户用户: merchant / merchant123
```

## 平台消息链路

客户管理页已经接入本地平台消息网关：

- `GET /api/platform-messaging/status`
- `POST /api/platform-messaging/inbound`
- `POST /api/conversations/:id/platform-reply`

未授权平台不会阻断业务链路，消息会进入本地平台队列；完成真实平台授权和消息接口权限后，可以在同一适配层替换为官方接口下发。
