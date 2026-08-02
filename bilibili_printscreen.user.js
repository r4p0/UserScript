// ==UserScript==
// @name         bilibili_printscreen
// @version      0.0.1
// @match        *://www.bilibili.com/video/*
// @match        *://live.bilibili.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @updateURL    https://r4p0.github.io/UserScript/bilibili_printscreen.meta.js
// @downloadURL  https://r4p0.github.io/UserScript/bilibili_printscreen.user.js
// ==/UserScript==

(() => {
  // src/naming.js
  var DEFAULT_TEMPLATE = "[${bvid}]${title}_${time}.png";
  var FALLBACK_TEMPLATE = "${time}.png";
  var cache = /* @__PURE__ */ new Map();
  function renderFileName(template, ctx) {
    var _a, _b, _c;
    const t = typeof template === "string" && template.trim() !== "" ? template : DEFAULT_TEMPLATE;
    try {
      const out = String((_a = getRender(t)(ctx)) != null ? _a : "");
      if (out.trim() !== "") return out;
    } catch (e) {
    }
    try {
      const out = String((_b = getRender(DEFAULT_TEMPLATE)(ctx)) != null ? _b : "");
      if (out.trim() !== "") return out;
    } catch (e) {
    }
    return String((_c = getRender(FALLBACK_TEMPLATE)(ctx)) != null ? _c : "");
  }
  function getRender(template) {
    let render = cache.get(template);
    if (!render) {
      const escaped = template.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
      render = new Function("ctx", `with(ctx) { return \`${escaped}\`; }`);
      cache.set(template, render);
    }
    return render;
  }
  function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+$/g, "");
  }
  function truncateFileName(name, maxLen = 150) {
    if (name.length <= maxLen) return name;
    const extIdx = name.lastIndexOf(".");
    const keepExt = extIdx > 0 && name.length - extIdx <= 10;
    if (!keepExt) return name.slice(0, maxLen);
    const ext = name.slice(extIdx);
    return name.slice(0, maxLen - ext.length) + ext;
  }

  // src/settings.js
  var KEYS = {
    actions: "bps.actions",
    template: "bps.template",
    shortcut: "bps.shortcut"
  };
  var DEFAULT_SETTINGS = {
    actions: "download+copy",
    template: DEFAULT_TEMPLATE,
    shortcut: { ctrl: true, shift: false, alt: true, meta: false, key: "s" }
  };
  function createSettings(api) {
    return {
      KEYS,
      getActions() {
        const v = api.getValue(KEYS.actions, DEFAULT_SETTINGS.actions);
        return ["download", "copy", "download+copy"].includes(v) ? v : DEFAULT_SETTINGS.actions;
      },
      setActions(mode) {
        api.setValue(KEYS.actions, mode);
      },
      getTemplate() {
        const v = api.getValue(KEYS.template, DEFAULT_SETTINGS.template);
        return typeof v === "string" && v.trim() !== "" ? v : DEFAULT_SETTINGS.template;
      },
      setTemplate(t) {
        api.setValue(KEYS.template, t);
      },
      getShortcut() {
        const v = api.getValue(KEYS.shortcut, DEFAULT_SETTINGS.shortcut);
        return v && typeof v === "object" && typeof v.key === "string" ? { ...DEFAULT_SETTINGS.shortcut, ...v } : { ...DEFAULT_SETTINGS.shortcut };
      },
      setShortcut(s) {
        api.setValue(KEYS.shortcut, s);
      }
    };
  }

  // src/actions.js
  function createActions(api) {
    return {
      run(mode, blob, filename) {
        const results = { copied: false, downloaded: false };
        if (mode === "copy" || mode === "download+copy") {
          api.setClipboard(blob, { type: "image/png" });
          results.copied = true;
        }
        if (mode === "download" || mode === "download+copy") {
          api.download(blob, filename);
          results.downloaded = true;
        }
        return results;
      }
    };
  }

  // src/ui.js
  function createUi(api, settings) {
    let toastTimer = null;
    let dialog = null;
    let onCaptureKey = null;
    function toast(msg) {
      let el = document.getElementById("bps-toast");
      if (!el) {
        el = document.createElement("div");
        el.id = "bps-toast";
        el.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483646;background:rgba(0,0,0,.85);color:#fff;padding:10px 16px;border-radius:6px;font:13px/1.5 sans-serif;max-width:360px;pointer-events:none;opacity:0;transition:opacity .2s;";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = "1";
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        el.style.opacity = "0";
      }, 2500);
    }
    function openSettings(ctx) {
      closeSettings();
      const bg = document.createElement("div");
      bg.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.4);";
      const box = document.createElement("div");
      box.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#fff;color:#222;border-radius:8px;padding:20px 24px;width:480px;max-width:90vw;box-shadow:0 8px 30px rgba(0,0,0,.3);font:14px/1.6 sans-serif;";
      box.innerHTML = `
      <h3 style="margin:0 0 12px;font-size:16px;">B\u7AD9\u622A\u56FE\u8BBE\u7F6E</h3>
      <label style="display:block;margin-bottom:6px;">\u6587\u4EF6\u540D\u6A21\u677F\uFF08\u53EF\u7528\u53D8\u91CF ${"${bvid}"} ${"${title}"} ${"${time}"}\uFF0C\u652F\u6301\u4EFB\u610F JS \u8868\u8FBE\u5F0F\uFF09</label>
      <input id="bps-tpl" type="text" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font:13px monospace;">
      <div id="bps-preview" style="margin:8px 0;color:#666;font-size:13px;"></div>
      <label style="display:block;margin:12px 0 6px;">\u622A\u56FE\u5FEB\u6377\u952E\uFF08\u70B9\u51FB\u6309\u94AE\u540E\u6309\u4E0B\u65B0\u7EC4\u5408\u952E\uFF0CEsc \u53D6\u6D88\uFF09</label>
      <button id="bps-cap" type="button" style="padding:6px 14px;border:1px solid #999;border-radius:4px;background:#f5f5f5;cursor:pointer;">Ctrl+Alt+S</button>
      <div style="margin-top:16px;text-align:right;">
        <button id="bps-cancel" type="button" style="padding:6px 16px;border:1px solid #999;border-radius:4px;background:#f5f5f5;cursor:pointer;margin-right:8px;">\u53D6\u6D88</button>
        <button id="bps-save" type="button" style="padding:6px 16px;border:none;border-radius:4px;background:#00a1d6;color:#fff;cursor:pointer;">\u4FDD\u5B58</button>
      </div>`;
      bg.appendChild(box);
      document.body.appendChild(bg);
      dialog = { bg, box };
      const tplInput = box.querySelector("#bps-tpl");
      const preview = box.querySelector("#bps-preview");
      const capBtn = box.querySelector("#bps-cap");
      tplInput.value = settings.getTemplate();
      capBtn.textContent = formatShortcut(settings.getShortcut());
      function updatePreview() {
        const name = truncateFileName(sanitizeFileName(renderFileName(tplInput.value, ctx)));
        preview.textContent = `\u9884\u89C8\uFF1A${name}`;
      }
      tplInput.addEventListener("input", updatePreview);
      updatePreview();
      let newShortcut = null;
      function startCapture() {
        if (onCaptureKey) return;
        newShortcut = null;
        capBtn.textContent = "\u8BF7\u6309\u4E0B\u65B0\u5FEB\u6377\u952E\u2026";
        capBtn.style.borderColor = "#00a1d6";
        onCaptureKey = (e) => {
          if (e.key === "Escape") {
            endCapture();
            return;
          }
          if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
          e.preventDefault();
          e.stopPropagation();
          newShortcut = { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey, key: e.key.toLowerCase() };
          capBtn.textContent = formatShortcut(newShortcut);
          endCapture();
        };
        window.addEventListener("keydown", onCaptureKey, true);
      }
      function endCapture() {
        if (!onCaptureKey) return;
        window.removeEventListener("keydown", onCaptureKey, true);
        onCaptureKey = null;
        capBtn.style.borderColor = "#999";
      }
      capBtn.addEventListener("click", startCapture);
      box.querySelector("#bps-cancel").addEventListener("click", closeSettings);
      box.querySelector("#bps-save").addEventListener("click", () => {
        settings.setTemplate(tplInput.value);
        if (newShortcut) settings.setShortcut(newShortcut);
        closeSettings();
        toast("\u8BBE\u7F6E\u5DF2\u4FDD\u5B58");
      });
    }
    function closeSettings() {
      if (onCaptureKey) {
        window.removeEventListener("keydown", onCaptureKey, true);
        onCaptureKey = null;
      }
      if (dialog) {
        dialog.bg.remove();
        dialog = null;
      }
    }
    return { toast, openSettings };
  }
  function formatShortcut(sc) {
    const parts = [];
    if (sc.ctrl) parts.push("Ctrl");
    if (sc.alt) parts.push("Alt");
    if (sc.shift) parts.push("Shift");
    if (sc.meta) parts.push("Meta");
    parts.push(sc.key.toUpperCase());
    return parts.join("+");
  }

  // src/screenshot.js
  async function captureFrame(video, canvas = document.createElement("canvas")) {
    if (!video || !(video instanceof HTMLVideoElement) || video.readyState < 2) {
      throw new Error("\u89C6\u9891\u5C1A\u672A\u52A0\u8F7D");
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) throw new Error("\u89C6\u9891\u5C1A\u672A\u52A0\u8F7D");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("\u622A\u56FE\u5931\u8D25")), "image/png");
    });
    return { blob, width: w, height: h };
  }

  // src/context.js
  function extractBvid(url) {
    const m = url.match(/\/video\/(BV[0-9A-Za-z]+)/);
    return m ? m[1] : null;
  }
  function extractRoomId(url) {
    const m = url.match(/live\.bilibili\.com\/(\d+)/);
    return m ? m[1] : null;
  }
  function cleanVideoTitle(title) {
    return title.replace(/_哔哩哔哩_bilibili$/, "").trim();
  }
  function cleanLiveTitle(title) {
    return title.replace(/ - 哔哩哔哩直播，二次元弹幕直播平台$/, "").trim();
  }
  function buildContext({ url, title, now = Date.now() }) {
    const isLive = /live\.bilibili\.com/.test(url);
    const bvid = isLive ? extractRoomId(url) || "" : extractBvid(url) || "";
    const t = isLive ? cleanLiveTitle(title) : cleanVideoTitle(title);
    return { bvid, title: t, time: formatTime(now) };
  }
  function formatTime(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  // src/main.js
  function createMain(api) {
    const settings = createSettings(api);
    const actions = createActions(api);
    const ui = createUi(api, settings);
    const getCtx = () => buildContext({ url: location.href, title: document.title });
    let lastUrl = location.href;
    const navTimer = setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
      }
    }, 500);
    async function takeScreenshot() {
      const video = document.querySelector("video");
      if (!video) {
        ui.toast("\u672A\u627E\u5230\u89C6\u9891\u5143\u7D20");
        return;
      }
      try {
        const { blob } = await captureFrame(video);
        const ctx = getCtx();
        const filename = truncateFileName(sanitizeFileName(renderFileName(settings.getTemplate(), ctx)));
        actions.run(settings.getActions(), blob, filename);
        ui.toast(`\u5DF2\u622A\u56FE\uFF1A${filename}`);
      } catch (err) {
        ui.toast(err && err.message ? err.message : "\u622A\u56FE\u5931\u8D25");
      }
    }
    function onKeydown(e) {
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/i.test(el.tagName)) return;
      const sc = settings.getShortcut();
      if (e.ctrlKey === sc.ctrl && e.shiftKey === sc.shift && e.altKey === sc.alt && e.metaKey === sc.meta && (e.key || "").toLowerCase() === sc.key) {
        e.preventDefault();
        takeScreenshot();
      }
    }
    api.registerMenuCommand("\u622A\u56FE\u52A8\u4F5C\uFF1A\u4E0B\u8F7D", () => settings.setActions("download"));
    api.registerMenuCommand("\u622A\u56FE\u52A8\u4F5C\uFF1A\u590D\u5236", () => settings.setActions("copy"));
    api.registerMenuCommand("\u622A\u56FE\u52A8\u4F5C\uFF1A\u4E0B\u8F7D+\u590D\u5236", () => settings.setActions("download+copy"));
    api.registerMenuCommand("\u6253\u5F00\u8BBE\u7F6E", () => ui.openSettings(getCtx()));
    window.addEventListener("keydown", onKeydown, true);
    return {
      destroy() {
        clearInterval(navTimer);
        window.removeEventListener("keydown", onKeydown, true);
      },
      takeScreenshot
    };
  }

  // src/boot.js
  var gmApi = {
    getValue: (key, def) => GM_getValue(key, def),
    setValue: (key, val) => GM_setValue(key, val),
    registerMenuCommand: (name, fn) => GM_registerMenuCommand(name, fn),
    setClipboard: async (blob, info) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      } catch (e) {
        GM_setClipboard(blob, { ...info, type: "image/png" });
      }
    },
    download(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1e3);
    }
  };
  createMain(gmApi);
})();
