# GitHub Release Guide / GitHub 开源发布说明

## Goal / 目标

Publish this project as an open-source GitHub repository while keeping local secrets, generated media, and runtime caches out of version control.

将本项目作为开源 GitHub 仓库发布，同时避免上传本地密钥、生成视频、运行缓存和依赖目录。

## What Should Be Uploaded / 应上传内容

- `src/`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `package.json`
- `package-lock.json`
- `README.md`
- `LICENSE`
- `docs/`
- `.github/`
- `.gitignore`

## What Must Not Be Uploaded / 不应上传内容

- `.env`
- `.env.*`
- `.local/`
- `node_modules/`
- `public/generated/`
- log files

These are already excluded by `.gitignore`.

以上内容已通过 `.gitignore` 排除。

## Publish Commands / 上传命令

Replace the repository URL with your GitHub repository URL.

将仓库地址替换成你的 GitHub 仓库地址。

```powershell
cd D:\github\ai-employee-prototype-app
git remote add origin https://github.com/lgpassword/ai-employee-prototype-app.git
git branch -M main
git push -u origin main
```

## Main Branch Protection / 主分支保护

Requirement: only the project owner should be able to upload code to `main`.

要求：只有项目所有者可以向 `main` 上传代码。

For a personal GitHub repository, GitHub does not support branch push restrictions by individual user. The practical setup is:

个人 GitHub 仓库不支持按个人用户配置分支 push 限制。实际方案是：

- keep the repository under the owner account;
- do not add collaborators with write permission;
- protect `main` from force pushes and deletion;
- use `CODEOWNERS` and pull request templates for future review workflows.

即：

- 仓库放在所有者账号下；
- 不添加拥有写权限的协作者；
- 保护 `main`，禁止强制推送和删除；
- 使用 `CODEOWNERS` 和 PR 模板辅助后续审核流程。

Recommended GitHub settings:

1. Open GitHub repository settings.
2. Go to `Settings` -> `Rules` -> `Rulesets` or `Branches`.
3. Create a rule for branch `main`.
4. Enable:
   - Require a pull request before merging.
   - Require approvals.
   - Do not allow force pushes.
   - Do not allow deletions.
5. Save the rule.

建议 GitHub 设置：

1. 打开 GitHub 仓库设置。
2. 进入 `Settings` -> `Rules` -> `Rulesets` 或 `Branches`。
3. 为 `main` 分支创建保护规则。
4. 开启：
   - 合并前必须创建 Pull Request。
   - 必须审批。
   - 禁止强制推送。
   - 禁止删除分支。
5. 保存规则。

## CODEOWNERS / 代码所有者

`.github/CODEOWNERS` sets the default code owner:

```text
* @lgpassword
```

This helps GitHub request review from the owner automatically. Branch protection must still be enabled in GitHub settings to enforce it.

该文件会让 GitHub 自动要求所有者审核代码。真正限制主分支推送还需要在 GitHub 仓库设置中开启分支保护。

## Verification Before Release / 发布前检查

```powershell
npm install
npm run check
npm start
```

Open:

```text
http://127.0.0.1:3201
```

## Open Source License / 开源协议

This project uses the MIT License. See `LICENSE`.

本项目使用 MIT 开源协议，详见 `LICENSE`。
