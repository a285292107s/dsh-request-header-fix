# 参考资料

- `任务清单.md`:本次规格与已核实事实;§2 不重调研。
- `..\dsh-rabbit-model-picker`(只读):`scripts/build-client.mjs` 客户端构建包装与自检、`src/client/contract.ts` 与 `modelConfigStore.ts` remote 契约与冲突重试、`src/client/designSystem.ts` 令牌映射、`docs/agent-safety.md` 安全纪律。只借结构与写法,不抄 `--zmd-*` 命名、座位遮蔽与页面设计。
- DSH 契约源码:按包名搜,不认死基址——包在两棵树里(`...\dsh\node_modules\@deepseek-ai\` 与 `~/.dsh/profiles/node_modules\@deepseek-ai\`),版本一致但包集合不同。`settings.section` 在 `dsh-cordis-client-runner/lib/client.js`;`llm/stream` 在 `dsh-llm/lib/types/index.js`;`ModelCatalog` 在 `dsh-api-session-controller/lib/types/`;设置命名空间、`volatile`、`mutate`/`settings/conflict` 在 `dsh-settings/lib/index.js`。
- 社区同类插件 `https://github.com/Coco-king/dsh-x-opencode-session`:只借鉴结构。
