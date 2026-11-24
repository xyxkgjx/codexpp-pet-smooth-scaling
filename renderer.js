// 小芙及其他原生悬浮宠物的平滑缩放
// 使用 Codex++ 的 /cdp/evaluate 接口，仅在 avatar-overlay 中应用样式。
(() => {
  const api = window.codexPlus;
  if (typeof api?.call !== "function" || typeof api.onCleanup !== "function") {
    throw new Error("需要支持宠物悬浮窗接口的 Codex++ 版本。");
  }

  const styleId = "codex-plus-ext-pet-smooth-scaling";
  const marker = "data-pet-smooth-scaling";
  const owner = `${Date.now()}-${Math.random()}`;
  const selector = "[data-codex-pet-id][data-codex-pet-state]";

  function updateStyle(id, token, spriteSelector, enabled) {
    let style = document.getElementById(id);
    if (!enabled) {
      if (style?.dataset.owner === token) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      style.setAttribute("data-codex-plus-ext", "");
      document.head.append(style);
    }
    style.dataset.owner = token;
    style.textContent = `${spriteSelector} { image-rendering: auto !important; }`;

    const sprite = document.querySelector(spriteSelector);
    return {
      mounted: Boolean(style.sheet),
      rendered: sprite ? getComputedStyle(sprite).imageRendering : null,
    };
  }

  function apply(enabled) {
    const args = [styleId, owner, selector, enabled].map(value => JSON.stringify(value)).join(", ");
    return api.call("/cdp/evaluate", {
      kind: "avatar-overlay",
      expression: `(${updateStyle.toString()})(${args})`,
    });
  }

  let active = true;
  const applied = apply(true);
  api.onCleanup(() => {
    active = false;
    document.documentElement.removeAttribute(marker);
    // 等本次注入结束后再移除，避免热重载时旧实例留下样式。
    void applied.then(() => apply(false)).catch(() => {});
  });
  void applied
    .then(({results}) => {
      if (!active) return;
      const overlays = (results ?? []).filter(result => result.ok && result.value?.mounted);
      if (!overlays.length) throw new Error("悬浮窗没有加载样式。");
      if (overlays.some(result => result.value.rendered === "auto")) {
        document.documentElement.setAttribute(marker, "verified");
      } else if (overlays.some(result => result.value.rendered !== null)) {
        throw new Error("悬浮宠物仍未采用平滑缩放。");
      } else {
        document.documentElement.setAttribute(marker, "waiting");
      }
    })
    .catch(error => {
      if (active) api.fail(new Error(`无法应用宠物平滑缩放。请先显示悬浮宠物，再热重载拓展。${error?.message ? ` ${error.message}` : ""}`));
    });
})();
