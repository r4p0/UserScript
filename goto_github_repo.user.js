// ==UserScript==
// @name         Goto GitHub Repo
// @version      0.1.0
// @updateURL    https://r4p0.github.io/UserScript/goto_github_repo.meta.js
// @downloadURL  https://r4p0.github.io/UserScript/goto_github_repo.user.js
// @namespace    http://r4p0.github.io/
// @supportURL   https://github.com/r4p0/UserScript/issues
// @description  Add a floating button to navigate to the corresponding GitHub project page on GitHub Pages sites 在GitHub Pages站点上添加可移动按钮，跳转到对应的GitHub项目主页
// @author       r4p0
// @iconURL      https://github.githubassets.com/pinned-octocat.svg
// @match        https://*.github.io/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @connect      api.github.com
// ==/UserScript==

(function () {
    'use strict';

    const StorageKey = (function () {
        const MainStorageKey = 'io.github.r4p0.GotoGithubRepo';
        return {
            repoUrlCache: `${MainStorageKey}.repoUrlCache`,
            expiryTime: `${MainStorageKey}.expiryTime`
        }
    })();

    /**
     * 本地缓存
     */
    const localCache = {
        repoUrlCacheKey: StorageKey.repoUrlCache,
        expiryTimeKey: StorageKey.expiryTime,
        /**
         * 缓存过期时间（毫秒）
         */
        get expiryTime() {
            return GM_getValue(this.expiryTimeKey, 30 * 24 * 60 * 60 * 1000);
        },
        set expiryTime(value) {
            GM_setValue(this.expiryTimeKey, value);
        },
        getUrlCache(key) {
            try {
                const cache = GM_getValue(this.repoUrlCacheKey, {});
                const item = cache[key];

                if (!item) {
                    return undefined;
                }

                // 检查是否过期
                if (Date.now() > item.expiry) {
                    // 删除过期项
                    delete cache[key];
                    GM_setValue(this.repoUrlCacheKey, cache);
                    return undefined;
                }

                return item.value;
            } catch (e) {
                console.error('读取缓存失败:', e);
                return undefined;
            }
        },

        setUrlCache(key, value) {
            try {
                const cache = GM_getValue(this.repoUrlCacheKey, {});
                cache[key] = {
                    value: value,
                    expiry: Date.now() + this.expiryTime
                };
                GM_setValue(this.repoUrlCacheKey, cache);
            } catch (e) {
                console.error('写入缓存失败:', e);
            }
        },

        hasUrlCache(key) {
            try {
                const cache = GM_getValue(this.repoUrlCacheKey, {});
                const item = cache[key];

                if (!item) {
                    return false;
                }

                // 检查是否过期
                if (Date.now() > item.expiry) {
                    // 删除过期项
                    delete cache[key];
                    GM_setValue(this.repoUrlCacheKey, cache);
                    return false;
                }

                return true;
            } catch (e) {
                console.error('检查缓存失败:', e);
                return false;
            }
        },

        /**
         * 清理所有过期缓存
         */
        cleanExpiredUrlCache() {
            try {
                const cache = GM_getValue(this.repoUrlCacheKey, {});
                const now = Date.now();
                let hasExpired = false;

                for (const key in cache) {
                    if (cache[key].expiry && now > cache[key].expiry) {
                        delete cache[key];
                        hasExpired = true;
                    }
                }

                if (hasExpired) {
                    GM_setValue(this.repoUrlCacheKey, cache);
                }
            } catch (e) {
                console.error('清理过期缓存失败:', e);
            }
        },

        resetUrlCache: function () {
            try {
                if (typeof (GM_deleteValue) === 'function') {
                    GM_deleteValue(this.repoUrlCacheKey);
                }
                else {
                    GM_setValue(this.repoUrlCacheKey, {});
                }
            } catch (e) {
                console.error('重置缓存失败:', e);
            }
        }
    };

    /**
     * 设置缓存过期时间
     */
    function setCacheExpiryTime() {
        const currentSeconds = Math.floor(localCache.expiryTime / 1000);
        const input = prompt(`仓库列表缓存时间（单位秒）\n当前值：${currentSeconds} 秒`, currentSeconds.toString());

        if (input === null) return; // 用户点击取消

        const seconds = parseInt(input.trim());

        // 校验合法性
        if (isNaN(seconds) || seconds < 60) {
            alert('请输入有效的秒数，最小值为60秒');
            return;
        }

        if (seconds > 365 * 24 * 60 * 60) {
            alert('缓存时间不能超过一年（31536000秒）');
            return;
        }

        try {
            // 修改过期时间（秒转毫秒）
            localCache.expiryTime = seconds * 1000;

            GM_notification(`缓存过期时间已设置为 ${seconds} 秒`, '设置成功');
        } catch (error) {
            GM_notification(`缓存过期时间已设置为 ${seconds} 秒`, '设置失败，请查看控制台');
            console.error('设置缓存过期时间失败:', error);
        }
    }

    /**
     * 清除所有缓存数据
     */
    function clearAllCache() {
        if (confirm('确定要清除所有缓存数据吗？')) {
            try {
                localCache.resetUrlCache();
                GM_notification('所有缓存数据已清除', '清除成功');
            } catch (e) {
                GM_notification('清除缓存失败，请查看控制台');
                console.error('清除缓存失败:', e);
            }
        }
    }

    // 注册菜单命令
    function registerMenuCommands() {
        GM_registerMenuCommand('⚙️ 设置缓存过期时间', setCacheExpiryTime);
        GM_registerMenuCommand('🗑️ 清除所有缓存', clearAllCache);
    }

    // 创建浮动按钮
    function createFloatingButton() {
        const button = document.createElement('div');
        button.id = 'github-navigator-btn';

        // 设置按钮样式
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #24292e;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: move;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: transform 0.2s ease;
            user-select: none;
        `;

        // 设置GitHub图标
        button.innerHTML = '<svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

        // 鼠标悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });

        // 添加到页面
        document.body.appendChild(button);

        return button;
    }

    // 使按钮可拖拽
    function makeDraggable(element) {
        let isDragging = false;
        let hasMoved = false;
        let startX, startY, initialX, initialY;

        // 鼠标按下事件
        element.addEventListener('mousedown', (e) => {
            if (e.target.closest('#github-navigator-btn')) {
                isDragging = true;
                hasMoved = false;
                startX = e.clientX;
                startY = e.clientY;
                initialX = element.offsetLeft;
                initialY = element.offsetTop;
                element.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // 如果移动距离超过阈值，标记为已移动
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                hasMoved = true;
            }

            let newX = initialX + dx;
            let newY = initialY + dy;

            // 限制在窗口边界内
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
            element.style.right = 'auto'; // 取消right定位
        });

        // 鼠标释放事件
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'move';
            }
        });

        // 返回hasMoved状态供点击事件使用
        return () => hasMoved;
    }

    /**
     * 获取对应的GitHub项目链接
     * @returns {Promise<string|null>}
     */
    async function getGitHubRepoUrl(href) {
        const url = new URL(href);
        const hostname = url.hostname;
        const pathname = url.pathname;

        // 从hostname中提取用户名/组织名
        const username = hostname.replace('.github.io', '');

        let repoName = pathname.replace(/^\//, '').split('/')[0];

        // 生成缓存键
        const cacheKey = `${username}-${repoName || 'default'}`;

        // 检查缓存
        if (localCache.hasUrlCache(cacheKey)) {
            return localCache.getUrlCache(cacheKey);
        }

        // 准备要查找的仓库名列表（按优先级排序）
        const repoNames = !repoName
            ? [`${username}.github.io`]
            : [repoName, `${username}.github.io`];

        const repos = await getGitHubRepos(username);
        if (!repos) {
            localCache.setUrlCache(cacheKey, null);
            return null;
        }

        // 在获取到的仓库列表中按优先级查找
        for (const targetRepoName of repoNames) {
            const repo = repos.find(r => r.name === targetRepoName);
            if (repo) {
                localCache.setUrlCache(cacheKey, repo.html_url);
                return repo.html_url;
            }
        }

        // 没找到匹配的仓库，缓存null结果
        localCache.setUrlCache(cacheKey, null);
        return null;
    }

    /**
     * 
     * @param {string} username 
     * @returns {Promise<{name:string,html_url:string}[]|null>}
     */
    async function getGitHubRepos(username) {
        const urls = [
            `https://api.github.com/users/${username}/repos`,
            `https://api.github.com/orgs/${username}/repos`
        ]
        for (const url of urls) {
            try {
                const response = await GM.xmlHttpRequest({
                    method: 'GET',
                    url,
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }).catch(e => console.error(e));
                if (response.status === 200 && response.responseText) {
                    return JSON.parse(response.responseText);
                }
            } catch (error) {
                console.error(error);
            }
        }
        return null;
    }

    // 窗口大小改变时确保按钮不超出边界
    function handleResize() {
        const button = document.getElementById('github-navigator-btn');
        if (!button) return;

        const maxX = window.innerWidth - button.offsetWidth;
        const maxY = window.innerHeight - button.offsetHeight;

        const currentX = button.offsetLeft;
        const currentY = button.offsetTop;

        // 如果按钮超出边界，调整位置
        if (currentX > maxX) {
            button.style.left = maxX + 'px';
        }
        if (currentY > maxY) {
            button.style.top = maxY + 'px';
        }
    }

    // 初始化插件
    function init() {

        // 清理过期缓存
        localCache.cleanExpiredUrlCache();

        // 注册菜单命令
        registerMenuCommands();

        // 创建按钮
        const button = createFloatingButton();

        // 使按钮可拖拽，并获取移动状态检查函数
        const hasMoved = makeDraggable(button);

        // 点击事件：跳转到GitHub项目主页
        button.addEventListener('click', _ => {
            // 如果已经移动过，不触发点击事件
            if (hasMoved()) return;

            getGitHubRepoUrl(window.location.href).then(githubUrl => {
                if (githubUrl) {
                    if (typeof (GM_openInTab) === 'function') {
                        GM_openInTab(githubUrl);
                    }
                    else {
                        window.open(githubUrl, '_blank');
                    }
                } else {
                    // 如果找不到对应的仓库，显示提示
                    GM_notification({
                        text: 'Can not find GitHub repo',
                        title: 'Goto GitHub Repo',
                    });
                }
            });
        });

        // 监听窗口大小变化
        window.addEventListener('resize', handleResize);

        // 初始检查边界
        setTimeout(handleResize, 100);
    }

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();