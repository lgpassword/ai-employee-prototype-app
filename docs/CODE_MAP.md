# Code Map / 代码地图

This document explains what each source file contains, what it does, and which business flow it belongs to.

本文档说明每个源码文件包含什么、有什么作用、属于哪条业务链路。

## Root Files / 根目录文件

| File | Purpose | Flow |
| --- | --- | --- |
| `package.json` | Project metadata, scripts, dependencies, license. | Install, start, validation. |
| `package-lock.json` | Locked dependency tree for reproducible installs. | Dependency installation. |
| `.gitignore` | Excludes dependencies, secrets, local runtime files, generated media. | GitHub publishing safety. |
| `README.md` | Main bilingual setup and usage guide. | Onboarding and deployment. |
| `LICENSE` | MIT open-source license. | Open-source release. |

## Frontend / 前端

| File | Contains | Role | Main Flow |
| --- | --- | --- | --- |
| `public/index.html` | Login screen, application shell, sidebar, header, modal containers. | Provides the single-page app structure. | User login, navigation, modal rendering. |
| `public/app.js` | Page rendering functions, API client, event handlers, modal logic, customer chat UI, AI video UI, settings panels. | Frontend controller for all product screens. | Login, dashboard, content search, AI video generation, customer messaging, merchant onboarding, team management. |
| `public/styles.css` | Layout, responsive rules, cards, charts, forms, chat area, modal styling. | Visual system and page responsiveness. | All UI flows. |

## Backend Entry / 后端入口

| File | Contains | Role | Main Flow |
| --- | --- | --- | --- |
| `src/server.js` | HTTP server, static file serving, JSON helpers, API route dispatch. | Connects frontend requests to business modules. | All API flows, session guard, platform messaging routes. |
| `src/store.js` | Compatibility re-export for the old store path. | Keeps older imports from breaking while new modules use `src/db/index.js`. | Transitional migration only. |

## Data Layer / 数据层

| File | Contains | Role | Main Flow |
| --- | --- | --- | --- |
| `src/db/index.js` | Database facade, state proxy, ID generation, platform display helper. | Single call entry for business modules that need data. | Backend modules call `db.*`, `nextId()`, and `platformName()` from here. |
| `src/db/state.js` | Runtime users, accounts, settings, conversations, dashboards, platform onboarding data. | Current in-process database state and default seed data. | Session, quota, platform data, customer messages. |
| `src/db/json-store.js` | Local JSON snapshot loader/saver, deep merge helper, persistence status. | Transitional persistence adapter before SQLite/PostgreSQL repository migration. | Server startup loads `.local/store.json`; API responses save business state without persisting global session. |

## Backend Modules / 后端业务模块

| File | Contains | Role | Main Flow |
| --- | --- | --- | --- |
| `src/modules/accounts.js` | Platform account list, connect account, toggle status. | Platform account management. | Settings > Platform accounts. |
| `src/modules/analytics.js` | Operations metrics, funnel, platform share, suggestions. | Business analytics data provider. | Operations dashboard. |
| `src/modules/approvals.js` | Approval request list, approve, reject, task status updates. | Human approval workflow for high-risk AI actions. | Task center and approval center. |
| `src/modules/content.js` | Content list, platform search state, latest content search, import content. | Multi-platform content search. | Content search > AI video extraction. |
| `src/modules/creators.js` | Creator catalog, creator detail, cooperation process. | Creator collaboration workflow. | Product selection > Creator cooperation. |
| `src/modules/dashboard.js` | Overview metrics and connected platform status. | Home dashboard provider. | Dashboard. |
| `src/modules/douyin.js` | Douyin OAuth config, authorize URL, callback, token refresh, account sync, video search adapter. | Douyin integration layer. | Settings > Douyin authorization; content search adapter. |
| `src/modules/finance.js` | Finance dashboard data. | Settlement and finance view. | Finance page. |
| `src/modules/live.js` | Live room metrics and trend data. | Live operations view. | Live dashboard. |
| `src/modules/messages.js` | Conversation list, platform inbound messages, platform reply gateway, AI reply suggestion, customer profile update. | Customer messaging and platform communication gateway. | Customer management > inbound/outbound messages. |
| `src/modules/knowledge.js` | Structured knowledge entries, upsert, keyword retrieval. | RAG-style source lookup for customer replies and AI tasks. | Customer AI and enterprise knowledge base. |
| `src/modules/onboarding.js` | Session login, user quota, merchant onboarding, material upload status, review simulation, authorization code simulation. | User access and merchant onboarding. | Login, quota, merchant admission. |
| `src/modules/platforms.js` | Platform capability matrix and platform sync records. | Tracks real/simulated platform capabilities and sync attempts. | Platform integration and audit trail. |
| `src/modules/orders.js` | Orders, inventory, after-sales summary, order detail, ship action. | Order and inventory management. | Orders page. |
| `src/modules/products.js` | Product catalog, product filters, multi-platform product links. | Product selection and platform analysis. | Product selection > external product links. |
| `src/modules/publishing.js` | Hot content insights, publish windows, publish plan creation, platform publishing queue status. | Content publishing planner. | Publishing schedule and automatic publishing queue. |
| `src/modules/sales.js` | Sales metrics and product ranking. | Sales analysis view. | Sales page. |
| `src/modules/settings.js` | Knowledge base, text model, voice model, video provider settings, secret masking. | System and AI provider configuration. | Settings modal, AI video model config, customer AI config. |
| `src/modules/team.js` | Roles, members, audit logs, add member, update role. | Team permission management. | Team page. |
| `src/modules/tasks.js` | AI tasks, steps, tool calls, approval creation, cost records, agent logs. | AI employee task center backend. | AI goal -> task steps -> approval -> logs -> ROI. |
| `src/modules/video.js` | AI video draft creation, script/storyboard generation, voice rendering, video rendering orchestration. | AI video workflow coordinator. | AI video generation > render video and voice. |

## Services / 服务层

| File | Contains | Role | Main Flow |
| --- | --- | --- | --- |
| `src/services/ai-video-service.js` | OpenAI, Aliyun Wanxiang/Kling, Volcengine Seedance, Tencent TokenHub, Baidu Qianfan video provider adapters, polling, remote clip download. | Real AI video clip generation adapter. | AI video rendering with provider clips. |
| `src/services/scenario-research.js` | Usage scenario rules, online search parsing, scenario generation. | Product usage scenario analysis. | AI video > scenario analysis. |
| `src/services/text-generation-service.js` | Text model chat completion calls, prompt building, JSON extraction. | AI script/storyboard generation adapter. | AI video > script and storyboard generation. |
| `src/services/tts-service.js` | Local Windows TTS, OpenAI/Qwen/Doubao voice adapters, SSML generation. | Voice generation adapter. | AI video > voice generation. |
| `src/services/video-renderer.js` | FFmpeg commands, media probing, segment rendering, subtitle/scene text files, final video composition. | Local video rendering engine. | AI video > final MP4 generation. |

## Runtime Directories / 运行目录

| Path | Purpose | GitHub Policy |
| --- | --- | --- |
| `.local/` | Local logs, OAuth cache, temporary runtime data. | Ignored. Do not upload. |
| `node_modules/` | Installed dependencies. | Ignored. Recreate with `npm install`. |
| `public/generated/` | Generated videos, audio, AI clips, temporary storyboard files. | Ignored. Recreate at runtime. |

## Main Business Flows / 主要业务链路

### 1. Login and Access / 登录与额度

`public/app.js` -> `POST /api/session/login` -> `src/modules/onboarding.js` -> `src/db/index.js` -> `src/db/state.js` -> `src/db/json-store.js`

### 2. Content Search / 内容搜索

`public/app.js` -> `GET /api/contents/latest` -> `src/modules/content.js` -> optional `src/modules/douyin.js`

### 3. AI Video Generation / AI 视频生成

`public/app.js` -> `POST /api/videos` -> `src/modules/video.js` -> `src/services/text-generation-service.js` -> editable script/storyboard -> `POST /api/videos/render` or `POST /api/videos/render-jobs` -> `src/services/tts-service.js` + `src/services/video-renderer.js` + optional `src/services/ai-video-service.js`

### 4. Customer Messaging / 客户消息

Inbound platform message:

`POST /api/platform-messaging/inbound` -> `src/modules/messages.js` -> `src/db/index.js` -> `src/db/state.js`

Outbound reply:

`public/app.js` -> `POST /api/conversations/:id/platform-reply` -> `src/modules/messages.js` -> local platform queue or official adapter.

### 5. Publishing / 内容发布

`public/app.js` -> `GET /api/publishing/insights` / `POST /api/publishing/plans` -> `src/modules/publishing.js`

### 6. Merchant Onboarding / 商户入驻

`public/app.js` -> `/api/onboarding/merchant/*` -> `src/modules/onboarding.js`

### 7. Team Permissions / 团队权限

`public/app.js` -> `/api/team` / `/api/team/members` -> `src/modules/team.js`
