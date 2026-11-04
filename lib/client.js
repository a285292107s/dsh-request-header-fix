window.__ModuleLoader__.load({
  id: "dsh-request-header-fix",
  factory: (require) => {
    var module = { exports: {} }; var exports = module.exports;
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    
    var index_exports = {};
    __export(index_exports, {
      apply: () => apply,
      inject: () => inject
    });
    module.exports = __toCommonJS(index_exports);
    
    var en = {
      nav: "Request header fix",
      title: "Request header fix",
      description: "Selected models attach x-opencode-session to their requests, carrying the current session ID. Useful for relays that forward to OpenCode.",
      searchPlaceholder: "Search providers or models",
      searchLabel: "Search providers or models",
      loading: "Loading…",
      loadFailed: "Failed to load: ",
      unavailable: "Settings service is unavailable.",
      hostMissing: "Host half is not loaded. Restart dsh web.",
      empty: "No model providers have been added yet.",
      noResults: "No matching providers or models.",
      readonlyHint: "Settings are read-only, so the switches cannot be changed.",
      selectedCount: "Selected {selected} / {total}",
      selectAll: "Select all",
      clear: "Clear",
      toggleProvider: "Expand or collapse {provider}",
      noModels: "No models available right now",
      providerFailed: "Model catalog failed to load: {message}",
      writeFailed: "Write failed: ",
      retry: "Retry",
      switchLabel: "Attach the session ID header for {model}"
    };
    var zh = {
      nav: "请求头修正",
      title: "请求头修正",
      description: "勾选的模型会在请求中附加 x-opencode-session，值为当前会话 ID。适用于会转发到 OpenCode 的中转站。",
      searchPlaceholder: "搜索提供商或模型",
      searchLabel: "搜索提供商或模型",
      loading: "加载中…",
      loadFailed: "加载失败：",
      unavailable: "设置服务不可用。",
      hostMissing: "宿主半边未加载，请重启 dsh web",
      empty: "还没有已添加的模型提供商。",
      noResults: "没有匹配的提供商或模型。",
      readonlyHint: "当前设置是只读的，无法修改开关。",
      selectedCount: "已选 {selected} / {total}",
      selectAll: "全选",
      clear: "清空",
      toggleProvider: "展开或收起 {provider}",
      noModels: "当前没有可用模型",
      providerFailed: "模型目录加载失败：{message}",
      writeFailed: "写入失败：",
      retry: "重试",
      switchLabel: "为 {model} 附加会话 ID 请求头"
    };
    function interpolate(template, params) {
      if (params === void 0) return template;
      return template.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
    }
    function fallbackTranslate() {
      return (key, params) => {
        const dictionary = activeLocale() === "zh" ? zh : en;
        return interpolate(dictionary[key] ?? key, params);
      };
    }
    function activeLocale() {
      if (typeof document === "undefined") return "en";
      return document.documentElement.lang.trim().toLowerCase().startsWith("zh") ? "zh" : "en";
    }
    
    var SETTINGS_NS = "request-header-fix";
    var ACCOUNT_PROVIDER = "deepseek-account";
    var INVALIDATING_EVENTS = ["settings/document-updated", "llm/adapters-updated"];
    var EMPTY = {
      status: "idle",
      error: null,
      writable: false,
      hostMissing: false,
      namespace: null,
      revision: 0,
      selection: {},
      groups: [],
      pendingRows: {},
      pendingGroups: {},
      rowErrors: {},
      groupErrors: {}
    };
    function rowKey(provider, modelId) {
      return `${provider}/${modelId}`;
    }
    function enableModel(current, modelId) {
      return [.../* @__PURE__ */ new Set([...current, modelId])];
    }
    function disableModel(current, modelId) {
      return current.filter((id) => id !== modelId);
    }
    function opsFor(provider, modelIds) {
      if (modelIds.length === 0) return [{ op: "unset", path: ["headerFix", provider] }];
      return [{ op: "set", path: ["headerFix", provider], value: modelIds }];
    }
    function countSelected(models, selected) {
      return models.reduce((count, model) => selected.includes(model.id) ? count + 1 : count, 0);
    }
    function filterProviders(groups, query) {
      const needle = query.trim().toLowerCase();
      if (needle === "") return groups;
      const filtered = [];
      for (const group of groups) {
        if (includesText(needle, group.displayName) || includesText(needle, group.provider)) {
          filtered.push(group);
          continue;
        }
        const models = group.models.filter((model) => includesText(needle, model.name) || includesText(needle, model.id));
        if (models.length === 0) continue;
        filtered.push({ ...group, models, selectedCount: countSelected(models, group.selected) });
      }
      return filtered;
    }
    var HeaderFixStore = class {
      constructor(faces) {
        this.faces = faces;
      }
      snapshot = EMPTY;
      listeners = /* @__PURE__ */ new Set();
      generation = 0;
      writeQueue = Promise.resolve();
      subscribe = (listener) => {
        this.listeners.add(listener);
        return () => {
          this.listeners.delete(listener);
        };
      };
      getSnapshot = () => this.snapshot;
      start = () => {
        const on = this.faces()?.on;
        if (on === void 0) return () => {
        };
        const disposers = INVALIDATING_EVENTS.map((event) => on(event, () => {
          const status = this.snapshot.status;
          if (status === "idle" || status === "loading") return;
          void this.load();
        }));
        return () => {
          for (const dispose of disposers) dispose();
        };
      };
      async load() {
        const generation = ++this.generation;
        this.patch({ status: "loading", error: null });
        const faces = this.faces();
        if (faces === null) {
          if (generation !== this.generation) return;
          this.patch({
            status: "error",
            error: null,
            hostMissing: false,
            namespace: null,
            revision: 0,
            selection: {},
            groups: []
          });
          return;
        }
        let described;
        let providers;
        let catalog;
        try {
          const [settingsAnswer, providersAnswer, catalogAnswer] = await Promise.all([
            faces.settings.describe(),
            faces.llm.listConfigurableProviders(),
            faces.session.modelCatalog()
          ]);
          if (generation !== this.generation) return;
          if (!settingsAnswer.ok) {
            this.patch({ status: "error", error: settingsAnswer.error.message });
            return;
          }
          if (!providersAnswer.ok) {
            this.patch({ status: "error", error: providersAnswer.error.message });
            return;
          }
          if (!catalogAnswer.ok) {
            this.patch({ status: "error", error: catalogAnswer.error.message });
            return;
          }
          described = settingsAnswer.value;
          providers = providersAnswer.value;
          catalog = catalogAnswer.value;
        } catch (error) {
          if (generation !== this.generation) return;
          this.patch({ status: "error", error: messageOf(error) });
          return;
        }
        const namespaceView = locateNamespace(described);
        if (namespaceView === void 0) {
          this.patch({
            status: "ready",
            error: null,
            hostMissing: true,
            writable: described.writable,
            namespace: null,
            revision: 0,
            selection: {},
            groups: []
          });
          return;
        }
        const namespaces = /* @__PURE__ */ new Map();
        for (const view of described.namespaces) namespaces.set(view.ns, view);
        const selection = readSelection(namespaceView.value);
        const groups = buildGroups(providers, namespaces, catalog, selection);
        this.patch({
          status: "ready",
          error: null,
          hostMissing: false,
          writable: described.writable,
          namespace: namespaceView.ns,
          revision: namespaceView.revision,
          selection,
          groups,
          rowErrors: {},
          groupErrors: {}
        });
      }
      async setModel(provider, modelId, enabled) {
        const row = rowKey(provider, modelId);
        const snapshot = this.snapshot;
        if (snapshot.namespace === null) return;
        if (snapshot.pendingRows[row] === true || snapshot.pendingGroups[provider] === true) return;
        this.patch({
          pendingRows: { ...snapshot.pendingRows, [row]: true },
          rowErrors: withoutKey(snapshot.rowErrors, row)
        });
        await this.enqueue(async () => {
          const latest = this.snapshot;
          if (latest.namespace === null) {
            this.failRow(row, "");
            return;
          }
          const current = latest.selection[provider] ?? [];
          const next = enabled ? enableModel(current, modelId) : disableModel(current, modelId);
          const outcome = await this.write(latest.namespace, latest.revision, opsFor(provider, next));
          if (!outcome.ok) {
            this.failRow(row, outcome.message);
            return;
          }
          await this.load();
          this.clearRow(row);
        });
      }
      async selectAllModels(provider) {
        const snapshot = this.snapshot;
        if (snapshot.namespace === null) return;
        if (snapshot.pendingGroups[provider] === true || hasPendingRow(snapshot, provider)) return;
        const group = snapshot.groups.find((view) => view.provider === provider);
        if (group === void 0 || group.models.length === 0) return;
        const modelIds = group.models.map((model) => model.id);
        this.patch({
          pendingGroups: { ...snapshot.pendingGroups, [provider]: true },
          groupErrors: withoutKey(snapshot.groupErrors, provider)
        });
        await this.enqueue(async () => {
          const latest = this.snapshot;
          if (latest.namespace === null) {
            this.failGroup(provider, "");
            return;
          }
          const outcome = await this.write(latest.namespace, latest.revision, opsFor(provider, modelIds));
          if (!outcome.ok) {
            this.failGroup(provider, outcome.message);
            return;
          }
          await this.load();
          this.clearGroup(provider);
        });
      }
      async clearProvider(provider) {
        const snapshot = this.snapshot;
        if (snapshot.namespace === null) return;
        if (snapshot.pendingGroups[provider] === true || hasPendingRow(snapshot, provider)) return;
        this.patch({
          pendingGroups: { ...snapshot.pendingGroups, [provider]: true },
          groupErrors: withoutKey(snapshot.groupErrors, provider)
        });
        await this.enqueue(async () => {
          const latest = this.snapshot;
          if (latest.namespace === null) {
            this.failGroup(provider, "");
            return;
          }
          const outcome = await this.write(latest.namespace, latest.revision, opsFor(provider, []));
          if (!outcome.ok) {
            this.failGroup(provider, outcome.message);
            return;
          }
          await this.load();
          this.clearGroup(provider);
        });
      }
      enqueue(task) {
        const run = this.writeQueue.then(task, task);
        this.writeQueue = run.then(() => void 0, () => void 0);
        return run;
      }
      async write(namespace, revision, ops) {
        const faces = this.faces();
        if (faces === null) return { ok: false, message: "" };
        if (ops.length === 0) return { ok: true };
        try {
          let answer = await faces.settings.mutate(namespace, ops, revision);
          if (!answer.ok && answer.error.code === "settings/conflict") {
            const described = await faces.settings.describe();
            const fresh = described.ok ? locateNamespace(described.value) : void 0;
            if (fresh !== void 0) answer = await faces.settings.mutate(fresh.ns, ops, fresh.revision);
          }
          if (answer.ok) return { ok: true };
          return { ok: false, message: answer.error.message };
        } catch (error) {
          return { ok: false, message: messageOf(error) };
        }
      }
      patch(patch) {
        this.publish({ ...this.snapshot, ...patch });
      }
      publish(next) {
        this.snapshot = next;
        for (const listener of this.listeners) listener();
      }
      failRow(row, message) {
        const latest = this.snapshot;
        this.publish({
          ...latest,
          pendingRows: withoutKey(latest.pendingRows, row),
          rowErrors: { ...latest.rowErrors, [row]: message }
        });
      }
      clearRow(row) {
        this.patch({ pendingRows: withoutKey(this.snapshot.pendingRows, row) });
      }
      failGroup(provider, message) {
        const latest = this.snapshot;
        this.publish({
          ...latest,
          pendingGroups: withoutKey(latest.pendingGroups, provider),
          groupErrors: { ...latest.groupErrors, [provider]: message }
        });
      }
      clearGroup(provider) {
        this.patch({ pendingGroups: withoutKey(this.snapshot.pendingGroups, provider) });
      }
    };
    function hasPendingRow(snapshot, provider) {
      const prefix = `${provider}/`;
      return Object.keys(snapshot.pendingRows).some((key) => key.startsWith(prefix));
    }
    function includesText(needle, value) {
      return value.toLowerCase().includes(needle);
    }
    function messageOf(error) {
      return error instanceof Error ? error.message : String(error);
    }
    function withoutKey(record, key) {
      const next = {};
      for (const [entryKey, entryValue] of Object.entries(record)) {
        if (entryKey !== key) next[entryKey] = entryValue;
      }
      return next;
    }
    function fieldAt(value, key) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
      return value[key];
    }
    function hasPath(value, path) {
      let current = value;
      for (const step of path) {
        if (current === null || typeof current !== "object" || Array.isArray(current)) return false;
        const record = current;
        if (!(step in record)) return false;
        current = record[step];
      }
      return current !== void 0;
    }
    function readSelection(value) {
      const field = fieldAt(value, "headerFix");
      if (field === null || typeof field !== "object" || Array.isArray(field)) return {};
      const selection = {};
      for (const [provider, models] of Object.entries(field)) {
        if (!Array.isArray(models)) continue;
        selection[provider] = models.filter((id) => typeof id === "string");
      }
      return selection;
    }
    function locateNamespace(described) {
      const direct = described.namespaces.find((namespace) => namespace.ns === SETTINGS_NS);
      if (direct !== void 0) return direct;
      return described.namespaces.find((namespace) => schemaMentionsHeaderFix(namespace.schema));
    }
    function schemaMentionsHeaderFix(schema) {
      if (schema === void 0) return false;
      try {
        const serialized = JSON.stringify(schema);
        return serialized !== void 0 && serialized.includes('"headerFix"');
      } catch {
        return false;
      }
    }
    function buildGroups(providers, namespaces, catalog, selection) {
      const groupsById = /* @__PURE__ */ new Map();
      for (const group of catalog.groups) groupsById.set(group.id, group);
      const failuresById = /* @__PURE__ */ new Map();
      for (const failure of catalog.failures) failuresById.set(failure.id, failure);
      const views = [];
      for (const provider of providers) {
        if (provider.provider === ACCOUNT_PROVIDER) continue;
        const namespace = namespaces.get(provider.settingsNs);
        if (namespace === void 0) continue;
        if (provider.settingsPath.length > 0 && !hasPath(namespace.value, provider.settingsPath)) continue;
        const group = groupsById.get(provider.provider);
        const failure = failuresById.get(provider.provider);
        const models = group === void 0 ? [] : group.models.map((model) => ({ id: model.id, name: model.name }));
        const selected = selection[provider.provider] ?? [];
        views.push({
          provider: provider.provider,
          displayName: provider.displayName,
          selected,
          models,
          selectedCount: countSelected(models, selected),
          failure: failure === void 0 ? null : failure.message,
          modelsUnavailable: group === void 0 && failure === void 0
        });
      }
      return views;
    }
    
    var STYLE_ID = "dsh-request-header-fix-styles";
    var CSS = `
    .rhf-root {
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: var(--dsw-alias-label-primary);
      font-size: 14px;
      line-height: 22px;
    }
    
    .rhf-header {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .rhf-title {
      margin: 0;
      color: var(--dsw-alias-label-primary);
      font-size: 16px;
      line-height: 24px;
      font-weight: 500;
    }
    
    .rhf-description {
      margin: 0;
      color: var(--dsw-alias-label-tertiary);
      font-size: 13px;
      line-height: 20px;
    }
    
    .rhf-tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .rhf-search {
      width: 100%;
      max-width: 320px;
    }
    
    .rhf-card {
      border: 0.5px solid var(--dsw-alias-settings-card-stroke);
      border-radius: var(--dsw-radius-lg);
      background: var(--dsw-alias-settings-card-fill);
    }
    
    .rhf-group-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 16px;
    }
    
    .rhf-group-head-bordered {
      border-bottom: 0.5px solid var(--dsw-alias-border-l2);
    }
    
    .rhf-group-toggle {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex: 1;
      min-width: 0;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    
    .rhf-group-toggle:focus-visible {
      outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
      outline-offset: 2px;
      border-radius: var(--dsw-radius-sm);
    }
    
    .rhf-chevron {
      flex: none;
      align-self: center;
      color: var(--dsw-alias-label-tertiary);
      transform: rotate(-90deg);
      transition: transform 120ms ease;
    }
    
    .rhf-chevron-open {
      transform: rotate(0deg);
    }
    
    .rhf-group-name {
      color: var(--dsw-alias-label-primary);
      font-size: 14px;
      line-height: 20px;
      font-weight: 500;
    }
    
    .rhf-group-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .rhf-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    
    .rhf-provider-id {
      color: var(--dsw-alias-label-dimmed);
      font-size: 11px;
      line-height: 16px;
    }
    
    .rhf-count {
      margin-left: auto;
      color: var(--dsw-alias-label-secondary);
      font-size: 12px;
      line-height: 18px;
      font-variant-numeric: tabular-nums;
    }
    
    .rhf-text-button {
      border: none;
      border-radius: var(--dsw-radius-sm);
      background: transparent;
      color: var(--dsw-alias-label-secondary);
      font-size: 12px;
      line-height: 18px;
      padding: 2px 6px;
      cursor: pointer;
    }
    
    .rhf-text-button:hover:not(:disabled) {
      background: var(--dsw-alias-interactive-bg-hover);
      color: var(--dsw-alias-label-primary);
    }
    
    .rhf-text-button:disabled {
      color: var(--dsw-alias-label-dimmed);
      cursor: not-allowed;
    }
    
    .rhf-text-button:focus-visible {
      outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
      outline-offset: 1px;
    }
    
    .rhf-button {
      align-self: flex-start;
      border: 0.5px solid var(--dsw-alias-border-l3);
      border-radius: var(--dsw-radius-md);
      background: transparent;
      color: var(--dsw-alias-label-primary);
      font-size: 12px;
      line-height: 18px;
      padding: 4px 12px;
      cursor: pointer;
    }
    
    .rhf-button:hover:not(:disabled) {
      background: var(--dsw-alias-interactive-bg-hover);
    }
    
    .rhf-button:disabled {
      color: var(--dsw-alias-label-dimmed);
      cursor: not-allowed;
    }
    
    .rhf-button:focus-visible {
      outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color);
      outline-offset: 2px;
    }
    
    .rhf-rows {
      display: flex;
      flex-direction: column;
    }
    
    .rhf-row-block + .rhf-row-block {
      border-top: 0.5px solid var(--dsw-alias-border-l2);
    }
    
    .rhf-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
    }
    
    .rhf-row-labels {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    
    .rhf-row-name {
      color: var(--dsw-alias-label-primary);
      font-size: 14px;
      line-height: 20px;
    }
    
    .rhf-model-id {
      color: var(--dsw-alias-label-tertiary);
      font-size: 11px;
      line-height: 16px;
    }
    
    .rhf-row-error {
      margin: 0;
      padding: 0 16px 10px;
      color: var(--dsw-alias-state-error-primary);
      font-size: 12px;
      line-height: 18px;
    }
    
    .rhf-group-error {
      margin: 0;
      padding: 8px 16px;
      border-bottom: 0.5px solid var(--dsw-alias-border-l2);
      color: var(--dsw-alias-state-error-primary);
      font-size: 12px;
      line-height: 18px;
    }
    
    .rhf-muted {
      margin: 0;
      padding: 10px 16px;
      color: var(--dsw-alias-label-tertiary);
      font-size: 12px;
      line-height: 18px;
    }
    
    .rhf-empty {
      margin: 0;
      color: var(--dsw-alias-label-tertiary);
      font-size: 13px;
      line-height: 20px;
    }
    
    .rhf-notice {
      margin: 0;
      padding: 10px 12px;
      border: 0.5px solid var(--dsw-alias-border-l3);
      border-radius: var(--dsw-radius-md);
      background: var(--dsw-alias-bg-module-platform);
      color: var(--dsw-alias-label-secondary);
      font-size: 13px;
      line-height: 20px;
    }
    
    .rhf-error {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border: 0.5px solid var(--dsw-alias-state-error-primary);
      border-radius: var(--dsw-radius-md);
    }
    
    .rhf-error-text {
      margin: 0;
      color: var(--dsw-alias-state-error-primary);
      font-size: 12px;
      line-height: 18px;
    }
    
    .rhf-groups {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    `;
    function injectStyles() {
      if (typeof document === "undefined") return () => {
      };
      document.getElementById(STYLE_ID)?.remove();
      const element = document.createElement("style");
      element.id = STYLE_ID;
      element.textContent = CSS;
      document.head.append(element);
      return () => {
        if (element.isConnected) element.remove();
      };
    }
    
    var import_react = require("react");
    var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
    var import_jsx_runtime = require("react/jsx-runtime");
    function Section({ t, store }) {
      const snapshot = (0, import_react.useSyncExternalStore)(store.subscribe, store.getSnapshot);
      const [query, setQuery] = (0, import_react.useState)("");
      const [expanded, setExpanded] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
      const groups = (0, import_react.useMemo)(() => filterProviders(snapshot.groups, query), [snapshot.groups, query]);
      const searching = query.trim() !== "";
      (0, import_react.useEffect)(() => {
        void store.load();
      }, [store]);
      const toggle = (provider) => {
        setExpanded((current) => {
          const next = new Set(current);
          if (next.has(provider)) next.delete(provider);
          else next.add(provider);
          return next;
        });
      };
      const hostMissing = snapshot.hostMissing;
      const failed = snapshot.status === "error";
      const initialLoading = !hostMissing && !failed && snapshot.groups.length === 0 && (snapshot.status === "idle" || snapshot.status === "loading");
      const readOnly = !hostMissing && !failed && snapshot.status === "ready" && !snapshot.writable;
      let body;
      if (failed) {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rhf-error", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-error-text", children: t("loadFailed") + (snapshot.error ?? t("unavailable")) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "rhf-button", onClick: () => {
            void store.load();
          }, children: t("retry") })
        ] });
      } else if (hostMissing) {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-notice", children: t("hostMissing") });
      } else if (initialLoading) {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-empty", children: t("loading") });
      } else if (snapshot.groups.length === 0) {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-empty", children: t("empty") });
      } else if (groups.length === 0) {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-empty", children: t("noResults") });
      } else {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rhf-groups", children: groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          ProviderCard,
          {
            group,
            snapshot,
            store,
            t,
            expanded: searching || expanded.has(group.provider),
            onToggle: () => {
              toggle(group.provider);
            }
          },
          group.provider
        )) });
      }
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rhf-root", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rhf-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "rhf-title", children: t("title") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-description", children: t("description") })
        ] }),
        snapshot.groups.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rhf-tools", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.Input,
          {
            className: "rhf-search",
            type: "search",
            value: query,
            placeholder: t("searchPlaceholder"),
            "aria-label": t("searchLabel"),
            onChange: (event) => {
              setQuery(event.currentTarget.value);
            }
          }
        ) }) : null,
        readOnly ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-notice", children: t("readonlyHint") }) : null,
        body
      ] });
    }
    function ProviderCard({ group, snapshot, store, t, expanded, onToggle }) {
      const groupPending = snapshot.pendingGroups[group.provider] === true;
      const locked = !snapshot.writable || groupPending;
      const groupError = snapshot.groupErrors[group.provider];
      const rowsVisible = expanded && group.models.length > 0;
      const bodyVisible = rowsVisible || group.failure !== null || groupError !== void 0 || group.modelsUnavailable;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "rhf-card", "aria-label": group.displayName, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: bodyVisible ? "rhf-group-head rhf-group-head-bordered" : "rhf-group-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: "rhf-group-toggle",
              "aria-expanded": expanded,
              "aria-label": t("toggleProvider", { provider: group.displayName }),
              onClick: onToggle,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  import_dsh_client_ui_primitives.IconChevronDownOutlineRegular,
                  {
                    className: expanded ? "rhf-chevron rhf-chevron-open" : "rhf-chevron",
                    size: 14,
                    "aria-hidden": "true"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "rhf-group-name", children: group.displayName }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "rhf-mono rhf-provider-id", children: group.provider }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "rhf-count", children: t("selectedCount", { selected: String(group.selectedCount), total: String(group.models.length) }) })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rhf-group-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "rhf-text-button",
                disabled: locked || group.models.length === 0,
                onClick: () => {
                  void store.selectAllModels(group.provider);
                },
                children: t("selectAll")
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "rhf-text-button",
                disabled: locked || group.models.length === 0 || group.selected.length === 0,
                onClick: () => {
                  void store.clearProvider(group.provider);
                },
                children: t("clear")
              }
            )
          ] })
        ] }),
        group.failure !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-group-error", children: t("providerFailed", { message: group.failure }) }) : null,
        groupError !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-group-error", children: writeErrorText(t, groupError) }) : null,
        group.modelsUnavailable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-muted", children: t("noModels") }) : null,
        rowsVisible ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "rhf-rows", children: group.models.map((model) => {
          const row = rowKey(group.provider, model.id);
          const rowPending = snapshot.pendingRows[row] === true;
          const rowError = snapshot.rowErrors[row];
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rhf-row-block", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rhf-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "rhf-row-labels", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "rhf-row-name", children: model.name }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "rhf-mono rhf-model-id", children: model.id })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                import_dsh_client_ui_primitives.Switch,
                {
                  checked: group.selected.includes(model.id),
                  disabled: !snapshot.writable || groupPending || rowPending,
                  label: t("switchLabel", { model: model.name }),
                  title: !snapshot.writable ? t("readonlyHint") : void 0,
                  onChange: (next) => {
                    void store.setModel(group.provider, model.id, next);
                  }
                }
              )
            ] }),
            rowError !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "rhf-row-error", children: writeErrorText(t, rowError) }) : null
          ] }, model.id);
        }) }) : null
      ] });
    }
    function writeErrorText(t, message) {
      return message === "" ? t("unavailable") : t("writeFailed") + message;
    }
    
    var inject = ["slots", "remote", "remote.settings", "remote.llm", "remote.session"];
    function apply(ctx) {
      const locale = ctx.get("locale");
      const t = locale === void 0 ? fallbackTranslate() : locale.bind(SETTINGS_NS);
      if (locale !== void 0) ctx.effect(() => locale.register(SETTINGS_NS, { en, zh }), "rhf: locale dictionaries");
      ctx.effect(() => injectStyles(), "rhf: styles");
      const store = new HeaderFixStore(() => {
        const settings = ctx.get("remote.settings");
        const llm = ctx.get("remote.llm");
        const session = ctx.get("remote.session");
        const remote = ctx.get("remote");
        if (settings === void 0 || llm === void 0 || session === void 0) return null;
        if (remote === void 0) return { settings, llm, session };
        return {
          settings,
          llm,
          session,
          on: (event, listener) => remote.$on(event, listener)
        };
      });
      ctx.effect(() => store.start(), "rhf: document invalidation");
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: SETTINGS_NS,
        order: 12,
        label: () => t("nav"),
        locale: SETTINGS_NS,
        inject: () => ({ t, store })
      }, Section));
    }
    
    return module.exports;
  },
});
