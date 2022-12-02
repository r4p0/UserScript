// ==UserScript==
// @name         去除灰色
// @namespace    https://github.com/r4p0/UserScript
// @version      0.1
// @description  Remover gray filter for all website
// @author       r4p0
// @match        *://***/*
// @supportURL   https://github.com/r4p0/UserScript
// @homepageURL  https://github.com/r4p0/UserScript
// @updateURL    https://r4p0.github.io/UserScript/disable_gray.user.js
// @downloadURL  https://r4p0.github.io/UserScript/disable_gray.user.js
// @run-at       document-end
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    GM_addStyle(`*{filter:unset !important;-webkit-filter:unset !important;}`);
})();
