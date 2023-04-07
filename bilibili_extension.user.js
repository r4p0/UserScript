// ==UserScript==
// @name        B站截图
// @namespace   https://github.com/r4p0/UserScript
// @version     0.1.1
// @description B站截图
// @author      r4p0
// @match       https://www.bilibili.com/*
// @supportURL  https://github.com/r4p0/UserScript
// @homepageURL https://github.com/r4p0/UserScript
// @updateURL   https://r4p0.github.io/UserScript/bilibili_extension.user.js
// @downloadURL https://r4p0.github.io/UserScript/bilibili_extension.user.js
// @run-at      document-start
// @grant       GM_download
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==

(function () {
    'use strict';
    // 本脚本基于 卜卜口 大佬的 逼站截图 脚本进行二次开发，由于脚本功能已失效，故研究解决方案
    // https://lab.magiconch.com/itorr-video-capture.user.js

    // 由于B站视频渲染节点被设为#shadow-root (closed)
    // 此段逻辑必须在尽早执行，保证Shadow root不会被设为close状态
    // 需要run-at设为document-start
    if (!Element.prototype.__attachShadow__) {
        Element.prototype.__attachShadow__ = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function (shadowRootInit) {
            console.log(`截获attachShadow方法成功(${shadowRootInit})`);
            return this.__attachShadow__(Object.assign(shadowRootInit, { mode: "open" }));
        };
    }
    var captureShortCut = (function (key) {
        if (typeof GM_getValue === 'function') {
            var shortCut = GM_getValue(key);
        }

        return undefined;
    })('captureShortCut') || 'c';

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    function getVideo() {
        if (getVideo.__result__) return getVideo.__result__;
        var video = document.querySelector('video');
        if (video) {
            return getVideo.__result__ = {
                get image() {
                    return video;
                },
                get width() {
                    return video.videoWidth;
                },
                get height() {
                    return video.videoHeight;
                }
            };
        }

        // B站视频结构改为bwp-video > shadowRoot > canvas来渲染视频
        video = (bwp_Video = document.querySelector('bwp-video')) || bwp_Video.shadowRoot || bwp_Video.shadowRoot.querySelector('canvas');
        if (video) {
            return getVideo.__result__ = {
                get image() {
                    return video;
                },
                get width() {
                    return video.width;
                },
                get height() {
                    return video.height;
                }
            };
        }
        return undefined;
    };

    function capture() {
        var dataURL = getDataURL();
        dataURL && download(`${document.title.replace(/_.+$/, '')}_${new Date()}.png`, dataURL);
    }

    function getDataURL() {
        var video = getVideo();
        if (!video) return;

        canvas.width = video.width;
        canvas.height = video.height;

        ctx.drawImage(video.image, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL({ format: 'png' });
    };

    function download(fileName, dataURL) {
        if (typeof GM_download === 'function') {
            GM_download({
                url: dataURL,
                name: fileName,
            })
        } else {
            var a = document.createElement('a');
            a.href = dataURL;
            a.download = fileName;
            a.click();
        }
    }

    document.addEventListener('keydown', event => {
        var video = getVideo();
        if (!video) return;

        var key = event.key;
        if (key === captureShortCut) {
            download(`${document.title.replace(/_.+$/, '')}_${new Date()}.png`, capture());
        }

        // 取消默认动作，从而避免处理两次。
        event.preventDefault();
    })

    if (typeof GM_registerMenuCommand === 'function' && typeof GM_setValue === 'function') {
        GM_registerMenuCommand(`截图`, capture);
        GM_registerMenuCommand(`设置截图按钮(${captureShortCut})`, setShortCut);

        var regex = /[%#&]{0,3}([a-zA-Z0-9])/
        function setShortCut() {
            var keys = prompt(`设置快捷键
%:  Ctrl/CMD
#:  Shift
&:  Alt`);
            console.log(keys);
        }
    }
})()

