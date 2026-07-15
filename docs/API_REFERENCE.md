# API Reference / 接口与方法说明

## Session / 登录与额度

| Method | Path | Module | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/session` | `onboarding.js` | Read current session. |
| `POST` | `/api/session/login` | `onboarding.js` | Login with username, password, user type. |
| `POST` | `/api/session/logout` | `onboarding.js` | Clear current session. |
| `GET` | `/api/users` | `onboarding.js` | Admin reads account quota and expiry. |
| `POST` | `/api/users/access` | `onboarding.js` | Admin updates quota, expiry, enabled state. |

## Content / 内容搜索

| Method | Path | Module | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/contents` | `content.js` | Read local imported content. |
| `GET` | `/api/contents/latest` | `content.js` | Search latest platform content. |
| `POST` | `/api/contents` | `content.js` | Import content into local workspace. |

## AI Video / AI 视频

| Method | Path | Module | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/videos` | `video.js` | List generated video tasks. |
| `POST` | `/api/videos` | `video.js` | Generate editable script and storyboard. |
| `POST` | `/api/videos/render` | `video.js` | Render video and voice. |
| `GET` | `/api/videos/render-jobs` | `video.js` | List asynchronous video render jobs. |
| `GET` | `/api/videos/render-jobs/:id` | `video.js` | Read one asynchronous video render job. |
| `POST` | `/api/videos/render-jobs` | `video.js` | Queue asynchronous video rendering and return immediately. |
| `GET` | `/api/tasks` | `tasks.js` | List AI employee tasks. |
| `POST` | `/api/tasks` | `tasks.js` | Create an AI employee task with steps, tool calls, cost record, and optional approval. |
| `GET` | `/api/tasks/:id` | `tasks.js` | Read task detail with steps, approvals, tool calls, and costs. |
| `GET` | `/api/agent-logs` | `tasks.js` | List AI tool calls and cost records. |
| `GET` | `/api/approvals` | `approvals.js` | List pending and decided approval requests. |
| `POST` | `/api/approvals/:id/approve` | `approvals.js` | Approve one high-risk AI action. |
| `POST` | `/api/approvals/:id/reject` | `approvals.js` | Reject one high-risk AI action. |
| `GET` | `/api/knowledge` | `knowledge.js` | List structured knowledge entries. |
| `POST` | `/api/knowledge` | `knowledge.js` | Create or update one structured knowledge entry. |
| `GET` | `/api/knowledge/search` | `knowledge.js` | Search knowledge entries for RAG-style evidence. |
| `GET` | `/api/platforms/capabilities` | `platforms.js` | Read platform capability matrix. |
| `GET` | `/api/platforms/sync-records` | `platforms.js` | List platform synchronization records. |
| `POST` | `/api/platforms/sync-records` | `platforms.js` | Record one platform synchronization event. |
| `POST` | `/api/scenarios/analyze` | `scenario-research.js` | Analyze product usage scenarios. |

## Customer Messaging / 客户消息

| Method | Path | Module | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/conversations` | `messages.js` | List customer conversations. |
| `GET` | `/api/conversations/:id` | `messages.js` | Read one conversation. |
| `POST` | `/api/conversations/:id/reply` | `messages.js` | Save local reply. |
| `POST` | `/api/conversations/:id/platform-reply` | `messages.js` | Send through local platform gateway. |
| `POST` | `/api/conversations/:id/adopt-suggestion` | `messages.js` | Send AI suggestion through gateway. |
| `POST` | `/api/conversations/:id/auto-suggestion` | `messages.js` | Generate AI reply suggestion. |
| `POST` | `/api/conversations/:id/profile` | `messages.js` | Update customer tags, group, lifecycle. |
| `GET` | `/api/platform-messaging/status` | `messages.js` | Read platform gateway state. |
| `POST` | `/api/platform-messaging/inbound` | `messages.js` | Receive inbound platform message. |

## Settings / 系统配置

| Method | Path | Module | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/settings` | `settings.js` | Read knowledge base and provider configs. |
| `POST` | `/api/settings/knowledge-base` | `settings.js` | Save enterprise knowledge base. |
| `POST` | `/api/settings/customer-ai` | `settings.js` | Save customer AI reply config. |
| `POST` | `/api/settings/text-provider` | `settings.js` | Save script/storyboard model config. |
| `POST` | `/api/settings/voice-provider` | `settings.js` | Save voice model config. |
| `POST` | `/api/settings/video-provider` | `settings.js` | Save video provider config. |

## Douyin OAuth / 抖音授权

| Method | Path | Module | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/douyin/oauth/status` | `douyin.js` | Read Douyin OAuth status. |
| `POST` | `/api/douyin/oauth/config` | `douyin.js` | Save Douyin app config. |
| `POST` | `/api/douyin/oauth/authorize-url` | `douyin.js` | Build authorize URL. |
| `GET` | `/api/douyin/oauth/callback` | `douyin.js` | Complete OAuth callback. |
| `POST` | `/api/douyin/oauth/refresh` | `douyin.js` | Refresh token. |
| `POST` | `/api/douyin/oauth/sync` | `douyin.js` | Sync account info. |
| `POST` | `/api/douyin/oauth/disconnect` | `douyin.js` | Disconnect authorization. |

## Business Modules / 业务模块

| Method | Path | Module | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard` | `dashboard.js` | Dashboard metrics. |
| `GET` | `/api/operations` | `analytics.js` | Operations analytics. |
| `GET` | `/api/products` | `products.js` | Product list and filters. |
| `GET` | `/api/products/:id` | `products.js` | Product detail and platform links. |
| `GET` | `/api/creators` | `creators.js` | Creator list. |
| `GET` | `/api/creators/:id` | `creators.js` | Creator detail. |
| `POST` | `/api/creators/:id/cooperation` | `creators.js` | Start cooperation process. |
| `GET` | `/api/publishing/insights` | `publishing.js` | Publishing insights and plans. |
| `POST` | `/api/publishing/plans` | `publishing.js` | Create publish plan. |
| `POST` | `/api/publishing/plans/:id/publish` | `publishing.js` | Trigger publish queue. |
| `GET` | `/api/team` | `team.js` | Team members, roles, audit logs. |
| `POST` | `/api/team/members` | `team.js` | Add team member. |
| `POST` | `/api/team/members/:id/role` | `team.js` | Update member role. |

## Method Comment Policy / 方法注释策略

Source files use:

- module-level comments to describe responsibilities;
- JSDoc comments for shared variables, exported functions, gateway methods, and server helpers;
- `docs/CODE_MAP.md` for file-by-file flow explanation;
- this document for API and method linkage.

源码采用：

- 模块级注释说明职责；
- 关键变量、导出函数、网关方法和服务入口使用 JSDoc；
- `docs/CODE_MAP.md` 说明每个文件的职责和链路；
- 本文档说明接口与后端方法对应关系。
