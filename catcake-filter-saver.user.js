// ==UserScript==
// @name         catcake-filter-saver
// @namespace    http://r4p0.github.io/
// @version      0.0.1
// @author       r4p0
// @description    Persist cake filtering and sorting preferences for catcake.hoshimi.io
// @description:zh-CN 持久化猫猫糕筛选和排序配置，支持多存档管理
// @match        https://catcake.hoshimi.io/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @updateURL    https://r4p0.github.io/UserScript/catcake-filter-saver.meta.js
// @downloadURL  https://r4p0.github.io/UserScript/catcake-filter-saver.user.js
// @supportURL   https://github.com/r4p0/UserScript/issues
// ==/UserScript==

(function () {
  'use strict';

  // ── 工具 ──────────────────────────────────────────

  const DEBUG = true;

  function log(...args) {
    if (DEBUG) console.log('[CatCakeFilter]', ...args);
  }

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(selector)) return resolve(document.querySelector(selector));
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { observer.disconnect(); resolve(el); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      if (timeout) setTimeout(() => { observer.disconnect(); reject(new Error('超时')); }, timeout);
    });
  }

  // ── 存储层 ──────────────────────────────────────────

  function loadDefault() {
    return GM_getValue('default', []);
  }

  function saveDefault(cakes) {
    GM_setValue('default', cakes);
  }

  function loadSnapshots() {
    return GM_getValue('snapshotList', {});
  }

  function saveSnapshot(name, cakes) {
    const snapshots = loadSnapshots();
    snapshots[name] = cakes;
    GM_setValue('snapshotList', snapshots);
  }

  function deleteSnapshot(name) {
    const snapshots = loadSnapshots();
    delete snapshots[name];
    GM_setValue('snapshotList', snapshots);
  }

  function getDontAskOverwrite() {
    return GM_getValue('dontAskOverwrite', false);
  }

  function setDontAskOverwrite(v) {
    GM_setValue('dontAskOverwrite', v);
  }

  function getProfileNames() {
    return Object.keys(loadSnapshots());
  }

  // ── 排序切换 ──────────────────────────────────────────

  let currentSortMode = 'pinyin';

  const GAME_ORDER = [
    '垃圾糕','冰糕','糯米团','天使圣代','重力酥','星辰拿铁','蓝莓罐子',
    '蜂蜜骰子','芝麻酥','墨镜猫咪','萤绒绒','游戏糕手','红豆牛奶',
    '蝶豆花慕斯','雪顶椰椰','白桃布丁','薄荷提拉咪','白玉青团',
    '花见团子','盹盹咪','太卜糍','幸运点心','捣乱专家','藤萝饼',
    '拉姆之友','谐乐小喵','纯白的孩子'
  ];

  let gameOrderCache = {};
  let gameOrderCacheBuilt = false;

  function resolveCakes() {
    if (typeof CAKES !== 'undefined') return CAKES;
    const wc = typeof unsafeWindow !== 'undefined' ? unsafeWindow.CAKES : undefined;
    if (wc) return wc;
    return typeof window !== 'undefined' && window.CAKES ? window.CAKES : undefined;
  }

  function buildGameOrderCache() {
    if (gameOrderCacheBuilt) return;
    gameOrderCacheBuilt = true;
    const cakes = resolveCakes();
    log('resolveCakes:', typeof cakes, cakes?.length);
    if (!cakes) return;
    GAME_ORDER.forEach(name => {
      const i = cakes.findIndex(c => c.cake === name);
      log('  GAME_ORDER name:', name, 'len:', name.length, 'codes:', Array.from(name).map(c=>c.charCodeAt(0)), '→ idx:', i);
      if (i !== -1) gameOrderCache[name] = i;
    });
    log('GAME_ORDER 缓存已构建, 条目数:', Object.keys(gameOrderCache).length);
  }

  function getGameIndex(name) {
    if (!gameOrderCacheBuilt) buildGameOrderCache();
    return gameOrderCache[name];
  }

  function setCakeGridLayout(mode) {
    const modalGrid = document.getElementById('cake-search-grid');
    if (modalGrid) {
      modalGrid.style.gridTemplateColumns = mode === 'game' ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)';
      log('modal grid 列数:', mode === 'game' ? 5 : 4);
    }
    const pageGrid = document.querySelector('.lb-list');
    if (pageGrid) {
      pageGrid.style.gridTemplateColumns = mode === 'game' ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)';
    }
  }

  function reorderModalGrid(mode) {
    const grid = document.getElementById('cake-search-grid');
    if (!grid) return;
    const items = Array.from(grid.children);
    if (items.length === 0) return;

    if (mode === 'game') {
      log('按 GAME_ORDER 重排筛选网格');
      const sorted = GAME_ORDER.map(name => {
        const i = getGameIndex(name);
        if (i === undefined || i === -1) return null;
        return document.getElementById('sopt-' + i);
      }).filter(Boolean);
      const remaining = items.filter(el => !sorted.includes(el));
      sorted.forEach(el => grid.appendChild(el));
      remaining.forEach(el => grid.appendChild(el));
    } else {
      log('按 CAKES 顺序重排筛选网格');
      items.sort((a, b) => {
        const aId = parseInt(a.id.replace('sopt-', ''), 10);
        const bId = parseInt(b.id.replace('sopt-', ''), 10);
        return aId - bId;
      });
      items.forEach(el => grid.appendChild(el));
    }
  }

  function reorderPageGrid(mode) {
    const container = document.querySelector('.lb-list');
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.lb-item.top'));
    if (items.length === 0) return;

    if (mode === 'game') {
      const sorted = GAME_ORDER.map(name => {
        return items.find(el => el.textContent.includes(name));
      }).filter(Boolean);
      const remaining = items.filter(el => !sorted.includes(el));
      sorted.forEach(el => container.appendChild(el));
      remaining.forEach(el => container.appendChild(el));
    } else {
      items.sort((a, b) => {
        const getIdx = (el) => {
          const name = GAME_ORDER.find(n => el.textContent.includes(n));
          return name ? (getGameIndex(name) ?? 999) : 999;
        };
        return getIdx(a) - getIdx(b);
      });
      items.forEach(el => container.appendChild(el));
    }
  }

  function manageFilterTabs(mode) {
    const filterTabs = document.getElementById('cake-search-filter-tabs');
    if (!filterTabs) return;
    const tabs = filterTabs.querySelectorAll('.ftab');
    for (let i = 1; i < tabs.length; i++) {
      tabs[i].style.display = mode === 'pinyin' ? '' : 'none';
    }
    log('性别筛选按钮:', mode === 'pinyin' ? '显示' : '隐藏');
    if (mode === 'game') {
      tabs.forEach(t => t.classList.remove('active'));
      if (tabs[0]) {
        tabs[0].classList.add('active');
        if (typeof setCakeSearchFilter === 'function') {
          setCakeSearchFilter('全部', tabs[0]);
        }
      }
    }
  }

  function injectSortToggle() {
    const filterTabs = document.getElementById('cake-search-filter-tabs');
    if (!filterTabs) return;
    const filterRow = filterTabs.closest('.filter-row');
    if (!filterRow) return;
    const sortNote = filterRow.querySelector('.sort-note');
    if (sortNote) sortNote.remove();
    document.querySelectorAll('#sort-toggle-btn').forEach(el => el.remove());
    const btn = document.createElement('button');
    btn.id = 'sort-toggle-btn';
    btn.className = 'ftab';
    btn.textContent = '按角色名拼音首字母排序 \u25bc';
    btn.addEventListener('click', function () {
      if (currentSortMode === 'pinyin') {
        currentSortMode = 'game';
        btn.textContent = '游戏内默认顺序 \u25bc';
        log('排序切换 → game');
        setCakeGridLayout('game');
        reorderModalGrid('game');
        reorderPageGrid('game');
        manageFilterTabs('game');
      } else {
        currentSortMode = 'pinyin';
        btn.textContent = '按角色名拼音首字母排序 \u25bc';
        log('排序切换 → pinyin');
        setCakeGridLayout('pinyin');
        reorderModalGrid('pinyin');
        reorderPageGrid('pinyin');
        manageFilterTabs('pinyin');
      }
    });
    filterRow.appendChild(btn);
  }

  // ── 保存弹窗 ──────────────────────────────────────────

  function getCurrentCakes(fromModal) {
    if (fromModal && typeof searchCakeSel !== 'undefined') {
      return searchCakeSel;
    }
    if (typeof searchCakes !== 'undefined') {
      return searchCakes;
    }
    return [];
  }

  function refreshProfileBar() {
    const oldBar = document.querySelector('.profile-bar');
    if (oldBar) oldBar.remove();
    injectProfileBar();
  }

  function showSaveDialog(fromModal = false) {
    const overlay = document.createElement('div');
    overlay.className = 'mbg open';
    overlay.id = 'cf-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'modal add-modal';
    const header = document.createElement('div');
    header.className = 'modal-header';
    const title = document.createElement('h2');
    title.textContent = '保存筛选配置';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-x-btn';
    const body = document.createElement('div');
    body.className = 'modal-body';
    const field = document.createElement('div');
    field.className = 'field';
    const label = document.createElement('label');
    label.textContent = '存档名称';
    const input = document.createElement('input');
    input.id = 'cf-name-input';
    input.type = 'text';
    input.placeholder = '输入存档名称...';
    const names = getProfileNames();
    const existingLabel = document.createElement('p');
    existingLabel.textContent = '已有存档：';
    existingLabel.style.cssText = 'margin:16px 0 8px;font-size:13px;color:var(--text2);';
    const existingContainer = document.createElement('div');
    existingContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;';
    names.forEach(name => {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.className = 'stab';
      btn.addEventListener('click', () => { input.value = name; input.focus(); });
      existingContainer.appendChild(btn);
    });
    const footer = document.createElement('div');
    footer.className = 'modal-footer-bar';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-c';
    cancelBtn.textContent = '取消';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-s';
    saveBtn.textContent = '保存';
    function closeDialog() { overlay.remove(); }
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
    saveBtn.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) return;
      log('保存存档:', name);
      const cakes = getCurrentCakes(fromModal);
      const snapshots = loadSnapshots();
      if (name in snapshots && !getDontAskOverwrite()) {
        showOverwriteConfirm(name, () => {
          saveSnapshot(name, cakes);
          overlay.remove();
          refreshProfileBar();
        });
      } else {
        saveSnapshot(name, cakes);
        overlay.remove();
        refreshProfileBar();
      }
    });
    field.appendChild(label);
    field.appendChild(input);
    body.appendChild(field);
    if (names.length > 0) {
      body.appendChild(existingLabel);
      body.appendChild(existingContainer);
    }
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    header.appendChild(title);
    header.appendChild(closeBtn);
    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    input.focus();
  }

  function showOverwriteConfirm(name, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'mbg open';
    overlay.id = 'cf-confirm-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'modal add-modal';
    const header = document.createElement('div');
    header.className = 'modal-header';
    const title = document.createElement('h2');
    title.textContent = '覆盖确认';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-x-btn';
    const body = document.createElement('div');
    body.className = 'modal-body';
    const msgField = document.createElement('div');
    msgField.className = 'field';
    const msg = document.createElement('p');
    msg.textContent = '"' + name + '" 已存在，是否覆盖？';
    msg.style.cssText = 'margin:0;font-size:15px;color:var(--text);';
    const checkField = document.createElement('div');
    checkField.className = 'field';
    const checkboxRow = document.createElement('label');
    checkboxRow.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);cursor:pointer;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const checkboxText = document.createTextNode('不再提示');
    const footer = document.createElement('div');
    footer.className = 'modal-footer-bar';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-c';
    cancelBtn.textContent = '取消';
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-s';
    confirmBtn.textContent = '覆盖';
    function closeDialog() { overlay.remove(); }
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
    confirmBtn.addEventListener('click', () => {
      if (checkbox.checked) setDontAskOverwrite(true);
      onConfirm();
      overlay.remove();
    });
    checkboxRow.appendChild(checkbox);
    checkboxRow.appendChild(checkboxText);
    msgField.appendChild(msg);
    checkField.appendChild(checkboxRow);
    body.appendChild(msgField);
    body.appendChild(checkField);
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    header.appendChild(title);
    header.appendChild(closeBtn);
    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  function injectSaveButton() {
    const searchMbg = document.getElementById('cake-search-mbg');
    if (!searchMbg) return;
    const btnRow = searchMbg.querySelector('.modal-footer-bar');
    if (!btnRow) return;
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存当前筛选';
    saveBtn.className = 'btn-s';
    saveBtn.addEventListener('click', () => showSaveDialog(true));
    const clearBtn = btnRow.querySelector('#cake-search-reset') || btnRow.querySelector('button:first-child');
    if (clearBtn) {
      clearBtn.parentNode.insertBefore(saveBtn, clearBtn.nextSibling);
    } else {
      btnRow.appendChild(saveBtn);
    }
  }

  // ── 配置档行 ──────────────────────────────────────────

  function injectProfileBar() {
    const serverBar = document.querySelector('.server-bar');
    if (!serverBar) return;
    const bar = document.createElement('div');
    bar.className = 'profile-bar';
    bar.style.cssText = 'display:flex;align-items:center;gap:10px;padding:.6rem 1.25rem;border-bottom:.5px solid var(--border);flex-wrap:wrap;';
    const label = document.createElement('span');
    label.textContent = '配置档';
    label.style.cssText = 'font-size:13px;color:#888;margin-right:4px;font-weight:500;';
    const importBtn = document.createElement('button');
    importBtn.textContent = '导入';
    importBtn.className = 'stab';
    importBtn.addEventListener('click', importProfiles);
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '导出';
    exportBtn.className = 'stab';
    exportBtn.addEventListener('click', exportProfiles);
    bar.appendChild(label);
    bar.appendChild(importBtn);
    bar.appendChild(exportBtn);
    const snapshots = loadSnapshots();
    const names = Object.keys(snapshots);
    names.forEach(name => {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.className = 'stab';
      btn.dataset.profileName = name;
      btn.addEventListener('click', () => loadProfile(name, btn));
      bar.appendChild(btn);
    });
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.className = 'stab';
    addBtn.addEventListener('click', () => showSaveDialog(false));
    bar.appendChild(addBtn);
    serverBar.insertAdjacentElement('afterend', bar);
    log('配置档行已注入, 存档数:', names.length);
  }

  function applyCakeFilter(cakes) {
    if (typeof searchCakeSel === 'undefined' || typeof searchCakes === 'undefined') return;
    if (cakes.length === 0) {
      if (typeof unsafeWindow.clearCakeSearch === 'function') {
        unsafeWindow.clearCakeSearch();
      }
    } else {
      searchCakeSel.length = 0;
      cakes.forEach(c => searchCakeSel.push(c));
      if (typeof unsafeWindow.applyCakeSearch === 'function') {
        unsafeWindow.applyCakeSearch();
      }
    }
  }

  function loadProfile(name, btn) {
    log('加载存档:', name);
    const snapshots = loadSnapshots();
    const cakes = snapshots[name];
    if (!cakes || !Array.isArray(cakes)) return;
    document.querySelectorAll('.stab.active').forEach(el => {
      el.classList.remove('active');
    });
    if (btn) {
      btn.classList.add('active');
    }
    applyCakeFilter(cakes);
    saveDefault(cakes);
  }

  function importProfiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', function () {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = JSON.parse(e.target.result);
          if (data.snapshotList && typeof data.snapshotList === 'object') {
            const existing = loadSnapshots();
            const merged = { ...existing, ...data.snapshotList };
            GM_setValue('snapshotList', merged);
            const oldBar = document.querySelector('.profile-bar');
            if (oldBar) oldBar.remove();
            injectProfileBar();
          } else {
            alert('导入失败：未找到有效的配置数据 (snapshotList)');
          }
        } catch (err) {
          alert('导入失败：JSON 格式错误');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function exportProfiles() {
    const data = {
      default: loadDefault(),
      snapshotList: loadSnapshots()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catcake-profiles.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── 自动保存 ──────────────────────────────────────────

  function hookApplyCakeSearch() {
    if (typeof unsafeWindow.applyCakeSearch !== 'function') {
      log('applyCakeSearch 不可用, 跳过自动保存');
      return;
    }
    const original = unsafeWindow.applyCakeSearch;
    unsafeWindow.applyCakeSearch = function () {
      original.apply(this, arguments);
      if (typeof searchCakes !== 'undefined' && Array.isArray(searchCakes) && searchCakes.length > 0) {
        log('自动保存筛选:', searchCakes);
        saveDefault(searchCakes);
      }
    };
  }

  // ── 自动恢复 ──────────────────────────────────────────

  function restoreOnLoad() {
    const cakes = loadDefault();
    if (!cakes || cakes.length === 0) return;
    if (typeof searchCakeSel === 'undefined' || typeof unsafeWindow.applyCakeSearch !== 'function') {
      log('页面脚本未就绪, 跳过恢复');
      return;
    }
    applyCakeFilter(cakes);
  }

  // ── 主入口 ──────────────────────────────────────────

  function main() {
    if (!document.querySelector('.server-bar')) {
      log('server-bar 不存在, 跳过');
      return;
    }
    log('脚本初始化');

    waitForElement('#cake-search-mbg', 10000).then(() => {
      injectSortToggle();
      injectSaveButton();
    }).catch(() => {});

    waitForElement('.server-bar', 5000).then(() => {
      injectProfileBar();
    }).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }

  function onPageFullyLoaded() {
    hookApplyCakeSearch();
    restoreOnLoad();
  }
  if (document.readyState === 'complete') {
    onPageFullyLoaded();
  } else {
    window.addEventListener('load', onPageFullyLoaded);
  }
})();
