# 0001 构建产物 `lib/` 随源码入库

- 状态：已采纳（2026-11-04）
- 取代：此前「`lib/` 由 build 生成、不入库、只走 `link:` 安装」的做法

## 背景

上游仓库用 `github:` URL 装进 profile 时，pnpm 按 `package.json` 的 `files` 打包安装副本；`files` 只有 `lib/`、`cordis.patch.yml`、`README.md`，而 `lib/` 被 `.gitignore` 忽略、从未提交，安装副本里就没有入口 `lib/index.js`，宿主加载时报：

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'.../node_modules/dsh-request-header-fix/lib/index.js'
```

`package.json` 也没有 `prepare`，pnpm 对 git 依赖不会自动构建。三条证据（`.gitignore` 含 `lib/`、无 `prepare`、`files` 挡掉 `src/`/`scripts/`）任一不成立都不会失败，当时三条同时成立，所以 `github:` 装法必然缺入口。同生态的 `dsh-mcp`、`dsh-notify-windows` 都把 `lib/` 提交进仓库，`github:` 安装即可用。

## 决定

把 `lib/index.js` 与 `lib/client.js` 纳入版本管理，与生成它们的 `src/` 改动同一次提交；`.gitignore` 不再忽略 `lib/`。`lib/` 仍然只由 `npm run build` 生成，不手改。

不采用另两条路线的理由：

- 加 `prepare` 构建：pnpm 11 对 git 依赖的 `prepare` 要求 `allowBuilds` 构建审批，审批键含解析后的 codeload URL + commit sha，每次升级到新 commit 都要重新批准；安装时还要先装 devDependencies（esbuild）再构建，更慢更脆。
- GitHub Release 发 tarball：多一条发布流程，安装 URL 带版本号，升级要改地址。

## 后果

- `github:` / tarball 安装开箱可用，不触发构建审批，安装副本里没有 `src/`、`scripts/` 也不影响运行。
- 生成物入库：改 `src/` 后必须 `npm run build` 并把 `lib/` 一起提交，否则安装到的是旧产物。交付门（typecheck + build + probe）与 `git status` 的 `lib/` 改动是提醒；README「开发」「安装」写明这条约束。
- 构建产物随提交出现在 diff 里，审阅 `lib/` 只看它与 `src/` 是否同源（build 自检会挡住接线错误）。
