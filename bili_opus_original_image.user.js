// ==UserScript==
// @name         Bilibili Opus Original Image
// @name:zh-CN   B站图文原图替换 (opus)
// @namespace    https://r4p0.github.io/
// @version      0.0.1
// @description  Replace Bilibili opus images with original full-size pictures by stripping the @widthw.ext suffix
// @description:zh-CN  将 bilibili opus 图文中的图片替换为原始尺寸高清原图（去掉 CDN 地址 @ 后缀）
// @author       r4p0
// @homepageURL  https://github.com/r4p0/UserScript
// @supportURL   https://github.com/r4p0/UserScript/issues
// @updateURL    https://r4p0.github.io/UserScript/bili_opus_original_image.meta.js
// @downloadURL  https://r4p0.github.io/UserScript/bili_opus_original_image.user.js
// @match        https://www.bilibili.com/opus/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // 将 B站 CDN 缩略图 URL 还原为原始图片资源
  // 规则: 去掉从 "@" 开始到结尾的部分 (如 @1192w.webp / @1416w_798h_1c.avif)
  function toOriginalUrl(url) {
    if (!url) return url;
    const idx = url.indexOf('@');
    if (idx === -1) return url;
    return url.slice(0, idx);
  }

  function rewritePicture(pic) {
    let changed = false;
    pic.querySelectorAll('source').forEach((s) => {
      const srcset = s.getAttribute('srcset');
      if (srcset && srcset.includes('@')) {
        const orig = toOriginalUrl(srcset);
        if (orig !== srcset) {
          s.setAttribute('srcset', orig);
          changed = true;
        }
      }
    });
    const img = pic.querySelector('img');
    if (img) {
      ['src', 'data-src', 'data-original', 'data-actualsrc'].forEach((attr) => {
        const val = img.getAttribute(attr);
        if (val && val.includes('@')) {
          const orig = toOriginalUrl(val);
          if (orig !== val) {
            img.setAttribute(attr, orig);
            changed = true;
          }
        }
      });
      // 强制重新加载 src (某些浏览器缓存了旧 srcset)
      const newSrc = toOriginalUrl(img.getAttribute('src') || '');
      if (newSrc && img.src !== newSrc) {
        img.src = newSrc;
      }
    }
    return changed;
  }

  function processAll() {
    let count = 0;
    document.querySelectorAll('picture.b-img__inner').forEach((pic) => {
      if (rewritePicture(pic)) count++;
    });
    // 也处理不在 picture 内的裸 img (bfs 域名)
    document.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (/hdslb\.com\/bfs\//.test(src) && src.includes('@')) {
        const orig = toOriginalUrl(src);
        if (orig !== src) {
          img.src = orig;
          count++;
        }
      }
    });
    return count;
  }

  // 初次执行
  let total = processAll();

  // 监听动态加载 (滚动加载更多图片 / SPA 更新)
  const mo = new MutationObserver(() => {
    total += processAll();
  });
  mo.observe(document.body, { childList: true, subtree: true });

  console.log('[bili-opus-original-image] 已替换图片:', total);
})();
