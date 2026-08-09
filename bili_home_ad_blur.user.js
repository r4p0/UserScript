// ==UserScript==
// @name         Bilibili Home Ad Blur
// @name:zh-CN   B站主页广告毛玻璃模糊
// @namespace    https://r4p0.github.io/
// @version      0.0.1
// @description  Apply frosted-glass blur to commercial/promoted video covers on the Bilibili home feed, restore on hover
// @description:zh-CN  对 B站主页瀑布流中的商业广告与推广视频封面叠加白雾毛玻璃效果，鼠标悬停恢复正常
// @author       r4p0
// @homepageURL  https://github.com/r4p0/UserScript
// @supportURL   https://github.com/r4p0/UserScript/issues
// @updateURL    https://r4p0.github.io/UserScript/bili_home_ad_blur.meta.js
// @downloadURL  https://r4p0.github.io/UserScript/bili_home_ad_blur.user.js
// @match        https://www.bilibili.com/
// @match        https://www.bilibili.com/?*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // 识别商业广告 / 推广视频：封面跳转链接指向 cm.bilibili.com（含站内恰饭推广）
  // 纯 CSS :has() 选择器实时生效，动态加载的新卡片自动套用，无需 MutationObserver
  const CSS = `
.bili-video-card:has(a[href*="cm.bilibili.com"]) .bili-video-card__image::after,
.bili-video-card:has(a[data-target-url]) .bili-video-card__image::after {
  content: "广告";
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  backdrop-filter: blur(20px) saturate(0.35) brightness(1.25);
  -webkit-backdrop-filter: blur(20px) saturate(0.35) brightness(1.25);
  background: rgba(255, 255, 255, 0.55);
  color: rgba(0, 0, 0, 0.3);
  font-size: 18px;
  letter-spacing: 0.35em;
  text-indent: 0.35em;
  transition: opacity 0.25s ease;
  pointer-events: none;
}
.bili-video-card:has(a[href*="cm.bilibili.com"]):hover .bili-video-card__image::after,
.bili-video-card:has(a[data-target-url]):hover .bili-video-card__image::after {
  opacity: 0;
}
`;

  function inject() {
    const style = document.createElement('style');
    style.setAttribute('data-bili-home-ad-blur', '');
    style.textContent = CSS;
    (document.head || document.documentElement || document).appendChild(style);
  }

  // document-start 时 document.head 可能尚未解析，documentElement 一定存在
  if (document.head) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  }
})();
