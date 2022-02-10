// ==UserScript==
// @name         去除无限debugger
// @namespace    https://github.com/r4p0/UserScript
// @version      0.0.1
// @description  去除无限debugger
// @author       r4p0
// @include      https://*.mihoyo.com/*
// @include      https://www.icourse163.org/*
// @supportURL   https://github.com/r4p0/UserScript
// @homepageURL  https://github.com/r4p0/UserScript
// @updateURL    https://r4p0.github.io/UserScript/disable_infinite_debugger.user.js
// @downloadURL  https://r4p0.github.io/UserScript/disable_infinite_debugger.user.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    //1 .去除无限debugger
    Function.prototype.__constructor_back = Function.prototype.constructor;
    Function.prototype.constructor = function () {
        if (arguments && typeof arguments[0] === 'string') {
            //alert("new function: "+ arguments[0]);
            if ("debugger" === arguments[0]) {
                //arguments[0]="console.log(\"anti debugger\");";
                //arguments[0]=";";
                return
            }
        }
        return Function.prototype.__constructor_back.apply(this, arguments);
    }
})();