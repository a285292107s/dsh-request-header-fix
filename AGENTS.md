# AGENTS.md

为 DeepSeek Harness(DSH)做「请求头修正」独立插件:host 在 `llm/stream` 里按勾选给模型请求补 `x-opencode-session: <会话 UUID>`,browser 在设置弹窗里加「请求头修正」分区;默认全关,安装与回退只改 profile。仓库只有一位维护者,AI 辅助开发,单个 npm 包(不是 workspace)。

当前阶段(2026-11-03):代码已落地(`src/` 真源、`lib/` 双产物由 build 生成),README 已建立并承接长期行为/环境/排查;`任务清单.md` 转为历史任务书,不再逐条执行。已用 `link:` 装进 `web` profile(`dsh.profile.bundles` 含本包、`- id: request-header-fix` Loader 行在位,profile 里已有一项勾选 `mydeepseek` → `deepseek-v4.1f-opencode`);已建公开仓库 `https://github.com/a285292107s/dsh-request-header-fix`(main,`lib/` 不入库,提交邮箱用 GitHub noreply,本机路径已脱敏);真机验收仍未做。

## 优先级与冲突

用户即时指令 > 本文件 > README/ADR(现行行为契约) > 任务清单(历史任务书,只作已落地事实参考) > 参考仓库;冲突按高者执行,并指出冲突点,不静默选一边。事实与代码不符时以代码为准:可按关键字重定位(行号会漂移),但不改结论、不扩大范围,把偏差报给我。

## 安全与边界

唯一权威;禁令不可逆,先于任何"怎么做"的考虑。任务清单 §8 只是指向本节的指针。这个会话就跑在你要保护的那个 `dsh web` 上,同一个 `DSH_HOME` 下会话、设置、profile 全共享。

本机路径:DSH 安装目录 `C:\Users\<user>\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh`;DSH_HOME `C:\Users\<user>\.dsh`;参考仓库 `C:\Users\<user>\Desktop\dsh-rabbit-model-picker`。

- ❌ 写以上三处;✅ 只读可以(含 `profiles\node_modules` 里的契约源码)。
- ❌ 启动/停止/重启任何 `dsh web` 或 node,不起第二个实例(换端口也不行);我的实例退出只取证告知。
- ❌ 发真实模型请求;❌ publish,`private: true` 保持。
- ❌ 刷新/点击我的页面、改真实设置;browser 产物由我验收,你交步骤与产物证据。
- ✅ 只在任务目录内创建/修改文件;`npm install`、`npm run build`、`npm run typecheck`、`node scripts/probe.mjs`(附录 A 探针)可以跑。
- 真机项(分区排位、勾选是否即时生效、`auto: false`、冲突重试、中转站日志里的头)由我验;你只写步骤和"未验证"清单,不为让检查变绿改真实环境。
- 事故与理由:参考仓库 `docs/agent-safety.md` R0–R6;规则以本节为准。

## 问与做

- 问的判据:回退成本大于一次往返成本。范围、取舍、"完成"的样子、改契约或交互形态 → 先问;细节未明 → 说明假设直接做。
- 可自决:模块内命名、纯函数拆分、不破坏契约的实现顺序。
- 必须先问:改契约(见下)、安装/重启/建仓/提交。
- 读代码能得出结论就不跑检查;不套套路、不投机抽象、不加没人要的开关、不做预防性动作(多读文档、多开 worktree、为小改动建 PLAN/goal/todo)。

## 交付门

- 顺序:实现 → `npm run typecheck` + `npm run build`(含自检) + `node scripts/probe.mjs` → 带结果汇报 → 真机等我确认。**真机验收是硬规则,只由我做。**
- 自检含负向验证:故意改错 wrapper id 必须失败,改回必须通过;这是要求,不算"写测试"。
- 门失败:停下、取证(命令 + 输出)、报告;不改探针、不改检查、不改环境换绿。
- 不写测试(单元、集成、验收、UI 样式);我要求过的一次性验证除外。
- 汇报:改了什么、为什么、怎么验、风险与限制;没实测的写"未验证/缺口",不写"已解决"。

## 细节在哪

- 现行行为、边界、安装排查:README(「行为与边界」「开关写到哪里」「故障排查」「验证状态」)。任务清单 §3–§7 与附录 B–D 是历史规格,只在追溯决定时读,不逐条执行;§2 是已核实事实,直接采信不重调研(行号会漂移,按关键字重定位)。
- 契约决定(注入匹配、开关实时读、ALS 槽、fetch 补丁、分区 id/order、写入语义、bundle 形态、external 打包)已定,改一条 = 改决定,先问;口径见 README「行为与边界」「开关写到哪里」,实现出处见任务清单 §3.2、§4.2–§4.4。
- 视觉与文案没有机器门:交付前按任务清单 §4.3 第 7 条与附录 D(令牌)逐条自检。
- 代码约定、构建产物、提交、写作:见 `docs/CONVENTIONS.md`。
- 外部契约、参考仓库、社区插件:见 `docs/REFERENCES.md`。
- 长期归宿:README(行为与边界/环境/排查)与 `docs/adr/`(尚无 ADR,方向级取舍第一次出现时建目录);分家规则见 `docs/CONVENTIONS.md`。

## 非目标与代价

不是代理、不是通用请求头编辑器、不 fork/改 DSH、不发布 npm、不自持会话 id、不写自己的持久化;范围要变先问。勾选后所选 provider/中转站会收到会话 UUID(这正是功能),默认全关;README 已写清代价与关闭方式。

## 维护本文件

只收不可从代码/README 推断、违反有代价、有门或有人确认的规则;一次性步骤不进;过期即删。任务清单已是历史任务书,不再追改;长期决定进 README/ADR,环境事实(安装状态、勾选)只写在本页「当前阶段」,随变随改。最后核对:2026-11-03。
