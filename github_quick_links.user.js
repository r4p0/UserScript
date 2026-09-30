// ==UserScript==
// @name         GitHub Quick Links
// @name:zh-CN   GitHub 仓库快捷跳转 (GitDiagram / Gitingest / DeepWiki / GitHub1s / ZRead)
// @namespace    https://r4p0.github.io/
// @version      0.1.1
// @description  Add quick jump buttons (GitDiagram, Gitingest, DeepWiki, GitHub1s, ZRead) to GitHub repository header action bar
// @description:zh-CN  在 GitHub 仓库顶部操作栏添加 GitDiagram、Gitingest、DeepWiki、GitHub1s、ZRead 快捷跳转按钮组
// @author       r4p0
// @homepageURL  https://github.com/r4p0/UserScript
// @supportURL   https://github.com/r4p0/UserScript/issues
// @updateURL    https://r4p0.github.io/UserScript/github_quick_links.meta.js
// @downloadURL  https://r4p0.github.io/UserScript/github_quick_links.user.js
// @match        https://github.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONTAINER_ID = 'gh-quick-links-container';
    const STYLE_ID = 'gh-quick-links-style';

    // GitHub 顶层非仓库路由黑名单
    const RESERVED_OWNERS = new Set([
        'settings', 'orgs', 'organizations', 'users', 'marketplace', 'explore',
        'topics', 'trending', 'collections', 'events', 'sponsors', 'notifications',
        'pulls', 'issues', 'codespaces', 'copilot', 'features', 'enterprise',
        'pricing', 'about', 'contact', 'security', 'login', 'signup', 'join',
        'search', 'new', 'import', 'gist', 'apps', 'account', 'dashboard', 'sessions'
    ]);

    // 5 个目标站点配置（样式 A：彩色语义 14x14 Octicon 风格 SVG 图标 + 站点名称）
    const SITES = [
        {
            id: 'gitdiagram',
            label: 'GitDiagram',
            title: '在 GitDiagram 中查看仓库架构图',
            colorDark: '#a371f7',
            colorLight: '#8250df',
            svgPath: 'M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z',
            buildUrl: ({ owner, repo }) => `https://gitdiagram.com/${owner}/${repo}`
        },
        {
            id: 'gitingest',
            label: 'Gitingest',
            title: '在 Gitingest 中提取仓库上下文',
            colorDark: '#f0883e',
            colorLight: '#bc4c00',
            svgPath: 'M3.75 1.5a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5H3.75Zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06ZM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25V1.75Z',
            buildUrl: ({ owner, repo, treePath }) => `https://gitingest.com/${owner}/${repo}${treePath}`
        },
        {
            id: 'deepwiki',
            label: 'DeepWiki',
            title: '在 DeepWiki 中查看 AI 仓库文档',
            colorDark: '#58a6ff',
            colorLight: '#0969da',
            svgPath: 'M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z',
            buildUrl: ({ owner, repo }) => `https://deepwiki.com/${owner}/${repo}`
        },
        {
            id: 'github1s',
            label: 'GitHub1s',
            title: '在 GitHub1s (VS Code) 中浏览代码',
            colorDark: '#3fb950',
            colorLight: '#1a7f37',
            svgPath: 'm11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z',
            buildUrl: ({ owner, repo, treePath }) => `https://github1s.com/${owner}/${repo}${treePath}`
        },
        {
            id: 'zread',
            label: 'ZRead',
            title: '在 ZRead 中阅读仓库解析',
            colorDark: '#d2a8ff',
            colorLight: '#9a6700',
            svgPath: 'M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z',
            buildUrl: ({ owner, repo }) => `https://zread.ai/${owner}/${repo}`
        }
    ];

    /**
     * 注入兼容新旧版 GitHub (Primer Classic & Primer React) 的按钮组样式
     */
    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#${CONTAINER_ID} {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    list-style: none;
    max-width: 100%;
}
#${CONTAINER_ID} .gh-ql-btngroup {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    vertical-align: middle;
}
#${CONTAINER_ID} .gh-ql-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    white-space: nowrap;
    text-decoration: none !important;
    cursor: pointer;
    user-select: none;
    color: var(--button-default-fgColor-rest, var(--fgColor-default, var(--color-btn-text, #24292f)));
    background-color: var(--button-default-bgColor-rest, var(--bgColor-muted, var(--color-btn-bg, #f6f8fa)));
    border: 1px solid var(--button-default-borderColor-rest, var(--borderColor-default, var(--color-btn-border, rgba(31,35,40,0.15))));
    box-shadow: var(--button-default-shadow-resting, var(--color-btn-shadow, 0 1px 0 rgba(31,35,40,0.04)));
    transition: background-color 80ms cubic-bezier(0.33, 1, 0.68, 1), border-color 80ms cubic-bezier(0.33, 1, 0.68, 1);
}
#${CONTAINER_ID} .gh-ql-btn:hover {
    background-color: var(--button-default-bgColor-hover, var(--color-btn-hover-bg, #f3f4f6));
    border-color: var(--button-default-borderColor-hover, var(--borderColor-default, var(--color-btn-hover-border, rgba(31,35,40,0.15))));
    color: var(--button-default-fgColor-rest, var(--fgColor-default, var(--color-btn-text, #24292f)));
    text-decoration: none !important;
    z-index: 2;
}
#${CONTAINER_ID} .gh-ql-btn:first-child {
    border-top-left-radius: 6px;
    border-bottom-left-radius: 6px;
}
#${CONTAINER_ID} .gh-ql-btn:last-child {
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
}
#${CONTAINER_ID} .gh-ql-btn:not(:first-child) {
    margin-left: -1px;
}
`;
        (document.head || document.documentElement).appendChild(style);
    }

    /**
     * 解析 GitHub URL 路径上下文
     * @param {string} [pathname]
     * @returns {{ owner: string, repo: string, treePath: string } | null}
     */
    function parseRepoContext(pathname) {
        if (typeof pathname !== 'string') return null;
        const cleanPath = pathname.replace(/\/+$/, '');
        const match = cleanPath.match(/^\/([^/]+)\/([^/]+)(?:\/(tree\/.+))?$/);
        if (!match) {
            const baseMatch = cleanPath.match(/^\/([^/]+)\/([^/]+)/);
            if (!baseMatch) return null;
            const owner = baseMatch[1];
            const repo = baseMatch[2].replace(/\.git$/, '');
            if (RESERVED_OWNERS.has(owner.toLowerCase()) || !repo) return null;
            return { owner, repo, treePath: '' };
        }

        const owner = match[1];
        const repo = match[2].replace(/\.git$/, '');
        if (RESERVED_OWNERS.has(owner.toLowerCase()) || !repo) return null;

        const treePath = match[3] ? `/${match[3]}` : '';
        return { owner, repo, treePath };
    }

    /**
     * 检测当前 GitHub 页面深浅色主题
     * @returns {'dark' | 'light'}
     */
    function getGitHubTheme() {
        const docEl = document.documentElement;
        if (!docEl) return 'dark';

        const htmlClass = docEl.className || '';
        if (htmlClass.includes('dark') || htmlClass.includes('dark-theme')) {
            return 'dark';
        }

        const colorMode = docEl.getAttribute('data-color-mode');
        if (colorMode === 'dark') return 'dark';
        if (colorMode === 'light') return 'light';
        if (colorMode === 'auto' && typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        if (document.body && typeof window !== 'undefined' && window.getComputedStyle) {
            const bodyBgColor = window.getComputedStyle(document.body).backgroundColor;
            if (bodyBgColor) {
                const rgb = bodyBgColor.match(/\d+/g);
                if (rgb && rgb.length >= 3) {
                    const brightness = (parseInt(rgb[0], 10) + parseInt(rgb[1], 10) + parseInt(rgb[2], 10)) / 3;
                    if (brightness < 100) {
                        return 'dark';
                    }
                }
            }
        }

        return 'light';
    }

    /**
     * 判断 DOM 元素是否可见
     * @param {Element | null} el
     * @returns {boolean}
     */
    function isElementVisible(el) {
        if (!el || el.hidden) return false;
        if (el.closest('[hidden]')) return false;
        if (typeof el.getClientRects === 'function' && el.getClientRects().length > 0) {
            return true;
        }
        return Boolean(el.offsetParent !== null);
    }

    /**
     * 查找可见的顶部操作栏容器
     * 同时兼容：
     * 1. 登录态新版 React Overview Header (宽屏 >=768px): ul[data-testid="repo-header-actions"]
     * 2. 登录态新版 React Overview Header (窄屏 <768px): div[data-testid="responsive-social-buttons"] 的外层换行容器
     * 3. 未登录/经典版 Pagehead Actions (宽屏 >=768px): #repository-details-container ul.pagehead-actions
     * 4. 未登录/经典版 Header (窄屏 <768px): #responsive-meta-container 或 #repository-details-container
     * @returns {HTMLElement | null}
     */
    function findVisibleActionsList() {
        // 1. 新版 React CodeView Header (登录态宽屏 >=768px 布局)
        const reactActions = document.querySelectorAll('ul[data-testid="repo-header-actions"]');
        for (const list of reactActions) {
            if (isElementVisible(list)) {
                return list;
            }
        }

        // 2. 新版 React CodeView Header (登录态窄屏 <768px 响应式布局)
        const narrowSocial = document.querySelectorAll('div[data-testid="responsive-social-buttons"]');
        for (const box of narrowSocial) {
            if (isElementVisible(box)) {
                return box.parentElement || box;
            }
        }

        // 3. 经典 #repository-details-container ul.pagehead-actions (未登录态宽屏 >=768px 布局)
        const detailsContainer = document.getElementById('repository-details-container');
        if (detailsContainer && !detailsContainer.hidden && !detailsContainer.closest('[hidden]')) {
            const classicList = detailsContainer.querySelector('ul.pagehead-actions');
            if (isElementVisible(classicList)) {
                return classicList;
            }
            // 4. 未登录态窄屏 (<768px) 时 ul.pagehead-actions 被 d-none d-md-inline 隐藏，挂载到 #responsive-meta-container 或 #repository-details-container
            const responsiveMeta = document.getElementById('responsive-meta-container');
            if (responsiveMeta && !responsiveMeta.hidden && !responsiveMeta.closest('[hidden]')) {
                responsiveMeta.style.padding = '0 16px 12px';
                return responsiveMeta;
            }
            if (isElementVisible(detailsContainer)) {
                return detailsContainer;
            }
        }

        return null;
    }

    /**
     * 创建单个站点按钮节点
     * @param {typeof SITES[number]} site
     * @param {{ owner: string, repo: string, treePath: string }} ctx
     * @param {'dark' | 'light'} theme
     * @returns {HTMLAnchorElement}
     */
    function createSiteButton(site, ctx, theme) {
        const a = document.createElement('a');
        a.className = 'gh-ql-btn btn btn-sm BtnGroup-item';
        a.href = site.buildUrl(ctx);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = site.title;
        a.setAttribute('data-site-id', site.id);

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.fill = theme === 'dark' ? site.colorDark : site.colorLight;
        svg.style.flexShrink = '0';

        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', site.svgPath);
        svg.appendChild(path);

        const span = document.createElement('span');
        span.textContent = site.label;

        a.appendChild(svg);
        a.appendChild(span);
        return a;
    }

    /**
     * 在仓库主页顶部操作栏幂等注入或更新快捷按钮组
     */
    function renderQuickLinks() {
        const actionsList = findVisibleActionsList();
        if (!actionsList) return;

        const ctx = parseRepoContext(window.location.pathname);
        if (!ctx) return;

        ensureStyles();

        const theme = getGitHubTheme();
        const stateKey = `${ctx.owner}/${ctx.repo}${ctx.treePath}::${theme}`;

        let container = document.getElementById(CONTAINER_ID);
        if (container && actionsList.contains(container)) {
            if (container.getAttribute('data-state-key') === stateKey) {
                return;
            }
            SITES.forEach(site => {
                const btn = container.querySelector(`a[data-site-id="${site.id}"]`);
                if (btn) {
                    btn.href = site.buildUrl(ctx);
                    const svg = btn.querySelector('svg');
                    if (svg) {
                        svg.style.fill = theme === 'dark' ? site.colorDark : site.colorLight;
                    }
                }
            });
            container.setAttribute('data-state-key', stateKey);
            return;
        }

        if (container) {
            container.remove();
        }

        const tagName = actionsList.tagName === 'UL' ? 'li' : 'div';
        container = document.createElement(tagName);
        container.id = CONTAINER_ID;
        container.className = 'd-inline-flex';
        container.setAttribute('data-state-key', stateKey);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'gh-ql-btngroup BtnGroup d-inline-flex';

        SITES.forEach(site => {
            btnGroup.appendChild(createSiteButton(site, ctx, theme));
        });

        container.appendChild(btnGroup);
        actionsList.insertBefore(container, actionsList.firstChild);
    }

    /**
     * 初始化事件监听与观察器
     */
    function init() {
        renderQuickLinks();

        let scheduled = false;
        const scheduleRender = () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                renderQuickLinks();
            });
        };

        const navEvents = ['turbo:load', 'turbo:render', 'pjax:end'];
        navEvents.forEach(evt => {
            document.addEventListener(evt, renderQuickLinks);
        });
        window.addEventListener('popstate', renderQuickLinks);
        window.addEventListener('resize', scheduleRender);

        if (window.matchMedia) {
            const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const bpQuery = window.matchMedia('(min-width: 768px)');
            if (typeof darkQuery.addEventListener === 'function') {
                darkQuery.addEventListener('change', renderQuickLinks);
            }
            if (typeof bpQuery.addEventListener === 'function') {
                bpQuery.addEventListener('change', renderQuickLinks);
            }
        }

        if (document.documentElement) {
            const rootObserver = new MutationObserver(scheduleRender);
            rootObserver.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'data-color-mode', 'data-dark-theme', 'data-light-theme']
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { SITES, parseRepoContext, findVisibleActionsList };
        return;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
