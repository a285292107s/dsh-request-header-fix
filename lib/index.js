import z from "@deepseek-ai/schemastery";

function readSelectedModels(config) {
  const field = isRecord(config) ? config["headerFix"] : void 0;
  const getter = isRecord(field) ? field["get"] : void 0;
  const live = typeof getter === "function" ? Reflect.apply(getter, field, []) : field;
  if (!isRecord(live)) return {};
  const selected = {};
  for (const [provider, models] of Object.entries(live)) {
    if (!Array.isArray(models)) continue;
    selected[provider] = models.filter((model) => typeof model === "string");
  }
  return selected;
}
function isModelSelected(selection, provider, model) {
  const models = selection[provider];
  return models !== void 0 && models.includes(model);
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

import { AsyncLocalStorage } from "node:async_hooks";
var SLOT = Symbol.for("dsh.request-header-fix.als");
function storage() {
  const slot = globalThis;
  const existing = slot[SLOT];
  if (existing !== void 0) return existing;
  const created = new AsyncLocalStorage();
  slot[SLOT] = created;
  return created;
}
function currentStamp() {
  return storage().getStore();
}
function withSession(stamp, iterable) {
  const als = storage();
  const iterator = iterable[Symbol.asyncIterator]();
  const step = (operation) => als.run(stamp, operation);
  const wrapped = {
    next: () => step(() => iterator.next()),
    return: (value) => step(() => iterator.return === void 0 ? Promise.resolve({ done: true, value: void 0 }) : iterator.return(value)),
    throw: (error) => step(() => iterator.throw === void 0 ? Promise.reject(error) : iterator.throw(error)),
    [Symbol.asyncIterator]() {
      return this;
    }
  };
  return wrapped;
}

var HEADER = "x-opencode-session";
function installFetchShim(readConfig, logger) {
  const previous = globalThis.fetch;
  const patched = async (input, init) => {
    const stamp = currentStamp();
    if (stamp === void 0) return previous(input, init);
    let forward = { input, init };
    try {
      if (isModelSelected(readSelectedModels(readConfig()), stamp.provider, stamp.model)) {
        const headers = new Headers(input instanceof Request ? input.headers : void 0);
        if (init?.headers !== void 0) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
        headers.set(HEADER, stamp.sessionId);
        forward = { input, init: { ...init, headers } };
      }
    } catch (error) {
      logger?.warn?.(`request-header-fix: ${error instanceof Error ? error.message : String(error)}`);
      forward = { input, init };
    }
    return previous(forward.input, forward.init);
  };
  globalThis.fetch = patched;
  return () => {
    if (globalThis.fetch === patched) globalThis.fetch = previous;
  };
}

var name = "request-header-fix";
var inject = ["settings"];
var Config = z.object({
  headerFix: z.dict(z.array(z.string())).default({}).volatile()
});
function apply(ctx, config) {
  ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber), "request-header-fix: hide auto config form");
  ctx.effect(() => {
    const restore = installFetchShim(() => config, ctx.logger);
    ctx.logger?.info?.("request-header-fix: fetch shim installed");
    return () => {
      restore();
      ctx.logger?.info?.("request-header-fix: fetch shim removed");
    };
  }, "request-header-fix: fetch shim");
  ctx.on(
    "llm/stream",
    (options, next) => {
      const stamp = stampOf(options);
      return stamp === void 0 ? next() : withSession(stamp, next());
    },
    { global: true, prepend: true }
  );
}
function stampOf(options) {
  if (options === null || typeof options !== "object") return void 0;
  const candidate = options;
  const { provider, model, sessionId } = candidate;
  if (typeof provider !== "string" || typeof model !== "string") return void 0;
  if (typeof sessionId !== "string" || sessionId.length === 0) return void 0;
  return { provider, model, sessionId };
}
export {
  Config,
  apply,
  inject,
  name
};
