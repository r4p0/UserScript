// ==UserScript==
// @name         GitHub Repo Size Display
// @name:zh-CN   GitHub 仓库文件总大小显示
// @namespace    https://r4p0.github.io/
// @updateURL    https://r4p0.github.io/UserScript/github_repo_size_display.meta.js
// @downloadURL  https://r4p0.github.io/UserScript/github_repo_size_display.user.js
// @version      0.1.3
// @description  在 GitHub 仓库标题处显示仓库文件总大小，取自 api.github.com/repos/{owner}/{repo}，基于 React embeddedData 缓存
// @author       r4p0
// @match        https://github.com/*
// @connect      api.github.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    let TOKEN = GM_getValue('github_token', '');

    // #region Token 菜单
    GM_registerMenuCommand('设置 GitHub Token', () => {
        const t = prompt('GitHub Token（留空为匿名）:', TOKEN);
        if (t !== null) {
            TOKEN = t.trim();
            GM_setValue('github_token', TOKEN);
            GM_notification({ text: TOKEN ? 'Token 已保存' : '已切换匿名', title: 'GitHub Repo Size' });
        }
    });

    GM_registerMenuCommand('清除 Token', () => {
        if (confirm('清除 Token？')) {
            TOKEN = '';
            GM_setValue('github_token', '');
            GM_notification({ text: 'Token 已清除', title: 'GitHub Repo Size' });
        }
    });
    // #endregion

    // #region 获取Commit SHA
    /**
     * 从 React embeddedData 获取最新 commit SHA
     * @returns 
     */
    function getLatestCommitSha() {
        const script = document.querySelector(
            '#repo-content-pjax-container > react-app > script[type="application/json"][data-target="react-app.embeddedData"]'
        );
        if (!script) return undefined;

        try {
            const json = JSON.parse(script.textContent);
            const currentOid = json?.payload?.codeViewLayoutRoute?.refInfo?.currentOid || json?.payload?.codeViewRepoRoute?.refInfo?.currentOid;
            return currentOid ? String(currentOid) : undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * 缓存
     * @param {ReturnType<typeof parseOwnerRepo>} repoInfo 
     * @returns {string}
     */
    function getCacheKey(repoInfo) {
        return repoInfo ? `gh_repo_size::${repoInfo.owner}/${repoInfo.repo}/${repoInfo.currentOid}` : null;
    }

    function loadCache(key) {
        const raw = GM_getValue(key, null);
        return raw ? JSON.parse(raw) : null;
    }

    function saveCache(key, size) {
        GM_setValue(key, JSON.stringify({
            size,
            cachedAt: Date.now()
        }));
    }

    // #region 工具
    /**
     * 
     * @returns 
     */
    function parseOwnerRepo() {
        const m = location.pathname.match(/^\/([^/]+)\/([^/]+)/);
        return m ? { owner: m[1], repo: m[2], currentOid: getLatestCommitSha() } : null;
    }

    function formatSize(kb) {
        if (kb >= 1024 * 1024) return (kb / 1024 / 1024).toFixed(2) + ' GB';
        if (kb >= 1024) return (kb / 1024).toFixed(2) + ' MB';
        return kb + ' KB';
    }

    function getGitHubTheme() {
        // 方法1：检查 html 元素的 class
        const htmlClass = document.documentElement.className;
        if (htmlClass.includes('dark') || htmlClass.includes('dark-theme')) {
            console.log(`getGitHubTheme: dark by htmlClass`);
            return 'dark';
        }

        // 方法2：检查 data-color-mode 属性
        const colorMode = document.documentElement.getAttribute('data-color-mode');
        if (colorMode === 'dark') {
            console.log(`getGitHubTheme: dark by colorMode`);
            return 'dark';
        }

        // 方法3：检查 body 的背景色
        const bodyBgColor = window.getComputedStyle(document.body).backgroundColor;
        // 如果是深色背景（RGB值较低）
        if (bodyBgColor) {
            const rgb = bodyBgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
                const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
                if (brightness < 100) { // 如果平均亮度小于100，认为是深色主题
                    console.log(`getGitHubTheme: dark by brightness`);
                    return 'dark';
                }
            }
        }

        // 默认为浅色主题
        return 'light';
    }
    // #endregion

    /* ---------- API ---------- */
    function fetchRepoSize(owner, repo) {
        return new Promise((resolve, reject) => {
            const headers = { Accept: 'application/vnd.github+json' };
            if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.github.com/repos/${owner}/${repo}`,
                headers,
                onload(res) {
                    if (typeof res.getResponseHeader !== 'function') {

                        /**
                         * 
                         * @param {string} key 
                         * @returns 
                         */
                        res.getResponseHeader = function (key) {
                            /** @type {Record<string,string>}*/
                            let __responseHeadersDict__ = res.__responseHeadersDict__;
                            if (!__responseHeadersDict__) {
                                __responseHeadersDict__ = {};
                                const responseHeaders = res.responseHeaders;
                                if (typeof responseHeaders === 'string') {
                                    responseHeaders.split('\n').forEach(h => {
                                        const [name, value] = h.split(':');
                                        __responseHeadersDict__[name.trim().toLowerCase()] = value.trim();
                                    });
                                }
                                res.__responseHeadersDict__ = __responseHeadersDict__;
                            }
                            return __responseHeadersDict__[key.trim().toLowerCase()];
                        }
                    }

                    const remaining = res.getResponseHeader('X-RateLimit-Remaining');
                    const limit = res.getResponseHeader('X-RateLimit-Limit');

                    if (res.status === 200) {
                        const data = JSON.parse(res.responseText);
                        resolve({ size: data.size, remaining, limit });
                    } else {
                        reject(Object.assign(new Error(`HTTP ${res.status}`), { remaining, limit }));
                    }
                },
                onerror: () => reject(new Error('network error'))
            });
        });
    }

    /* ---------- UI ---------- */
    function injectBadge(text, title, isError, isCached) {
        document.querySelectorAll('.gh-repo-size-badge').forEach(e => e.remove());

        const theme = getGitHubTheme();
        const el = document.createElement('span');
        el.className = 'gh-repo-size-badge';
        el.textContent = text + (isCached ? ' (缓存)' : '');
        el.title = title;

        const style = {
            marginLeft: '10px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '20px',
            verticalAlign: 'middle',
            fontFamily: 'monospace',
        };

        if (isError) {
            Object.assign(style, theme === 'dark'
                ? { color: '#f85149', background: 'rgba(248,81,73,.15)', border: '1px solid rgba(248,81,73,.4)' }
                : { color: '#cf222e', background: '#ffebe9', border: '1px solid rgba(207,34,46,.3)' });
        } else {
            Object.assign(style, theme === 'dark'
                ? { color: '#56d364', background: 'rgba(86,211,100,.15)', border: '1px solid rgba(86,211,100,.4)' }
                : { color: '#1a7f37', background: '#dafbe1', border: '1px solid rgba(26,127,55,.3)' });
        }

        Object.assign(el.style, style);

        const target =
            document.querySelector('strong[itemprop="name"]') ||
            document.querySelector('h1 strong') ||
            document.querySelector('main h1');

        target?.parentNode?.appendChild(el) || target?.appendChild(el);
    }

    /* ---------- 主逻辑 ---------- */
    let done = false;

    async function run() {
        if (done) return;
        const info = parseOwnerRepo();
        if (!info) return;

        const cacheKey = getCacheKey(info);
        if (cacheKey) {
            const cached = loadCache(cacheKey);
            if (cached) {
                done = true;
                injectBadge(
                    `📦 ${formatSize(cached.size)}`,
                    `仓库大小：${formatSize(cached.size)}\n缓存时间：${new Date(cached.cachedAt).toLocaleString()}`,
                    false,
                    true
                );
                return;
            }
        }

        try {
            const r = await fetchRepoSize(info.owner, info.repo);
            if (cacheKey) saveCache(cacheKey, r.size);
            done = true;
            injectBadge(
                `📦 ${formatSize(r.size)}`,
                `仓库大小：${formatSize(r.size)}\n剩余请求：${r.remaining}\n总限额：${r.limit}`,
                false,
                false
            );
        } catch (e) {
            injectBadge(`⚠️ ${e.message}`, e.message, true, false);
        }
    }

    run();
})();
