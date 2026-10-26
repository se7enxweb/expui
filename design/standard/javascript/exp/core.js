/*!
 * Exponential UI (expui) core — the Exp namespace, on jQuery 4 or on plain JavaScript.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by the exp::core packer key after jQuery 4 (Exp.$). Reads the page's configuration from
 * <script type="application/json" data-exp-config> (the exp_config() template operator).
 *
 *   Exp.config, Exp.i18n(), Exp.on() / Exp.off() / Exp.emit(), Exp.register() / Exp.start(),
 *   Exp.ready(), Exp.prefs.get() / .set(), Exp.keys.bind() / .unbind(), Exp.reducedMotion, Exp.util
 *
 * Without jQuery (exp::core::shared on a page that loads none) the core runs on plain JavaScript: Exp.$ is
 * undefined, everything else works the same. With jQuery 4 on the page it runs on it, exactly as before.
 */
(function (window, document) {
    'use strict';

    var Exp = window.Exp = window.Exp || {};
    var $ = Exp.$;
    if (Exp.version && Exp.ready) {
        // the core is on the page already (the admin designs load it, and a template asked for exp::core again):
        // the running one stays, with its events and modules; configuration blocks added since are merged when ready
        return;
    }

    Exp.version = '1.0.0.17';

    // ---- helpers without jQuery -----------------------------------------------------------------------------

    var hasOwn = Object.prototype.hasOwnProperty;

    function isPlainObject(obj) {
        if (!obj || Object.prototype.toString.call(obj) !== '[object Object]') { return false; }
        var proto = Object.getPrototypeOf(obj);
        if (!proto) { return true; }
        var Ctor = hasOwn.call(proto, 'constructor') && proto.constructor;
        return typeof Ctor === 'function' && Function.prototype.toString.call(Ctor) === Function.prototype.toString.call(Object);
    }

    /** jQuery.extend()'s rules: extend([deep,] target, source...); undefined values are skipped, deep merges plain objects and arrays. */
    function plainExtend() {
        var target = arguments[0] || {}, i = 1, deep = false;
        if (typeof target === 'boolean') { deep = target; target = arguments[1] || {}; i = 2; }
        if (typeof target !== 'object' && typeof target !== 'function') { target = {}; }
        for (; i < arguments.length; i++) {
            var options = arguments[i];
            if (options === null || options === undefined) { continue; }
            for (var name in options) {
                var copy = options[name], copyIsArray = false;
                if (name === '__proto__' || target === copy) { continue; }
                if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
                    var src = target[name], clone;
                    if (copyIsArray && !Array.isArray(src)) { clone = []; }
                    else if (!copyIsArray && !isPlainObject(src)) { clone = {}; }
                    else { clone = src; }
                    target[name] = plainExtend(deep, clone, copy);
                } else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
        return target;
    }

    function typeOf(obj) {
        if (obj === null || obj === undefined) { return String(obj); }
        if (typeof obj !== 'object') { return typeof obj; }
        var m = /^\[object (Boolean|Number|String|Function|Array|Date|RegExp|Object|Error|Symbol)\]$/.exec(Object.prototype.toString.call(obj));
        return m ? m[1].toLowerCase() : 'object';
    }

    /** jQuery.param()'s rules: an object (nested objects and arrays as a[b]=1, a[]=1) or an array of {name, value}. */
    function plainParam(a) {
        var s = [];
        var add = function (key, value) {
            value = typeof value === 'function' ? value() : value;
            s.push(encodeURIComponent(key) + '=' + encodeURIComponent(value === null || value === undefined ? '' : value));
        };
        var build = function (prefix, obj) {
            if (Array.isArray(obj)) {
                obj.forEach(function (v, i) {
                    if (/\[\]$/.test(prefix)) { add(prefix, v); }
                    else { build(prefix + '[' + (typeof v === 'object' && v !== null ? i : '') + ']', v); }
                });
            } else if (typeOf(obj) === 'object') {
                for (var name in obj) { build(prefix + '[' + name + ']', obj[name]); }
            } else {
                add(prefix, obj);
            }
        };
        if (a === null || a === undefined) { return ''; }
        if (Array.isArray(a) || (a.jquery && !isPlainObject(a))) {
            Array.prototype.forEach.call(a, function (item) { add(item.name, item.value); });
        } else {
            for (var prefix in a) { build(prefix, a[prefix]); }
        }
        return s.join('&');
    }

    function sameOrigin(url) {
        try { return new window.URL(url, document.baseURI).origin === window.location.origin; } catch (e) { return false; }
    }

    /**
     * A request the way jQuery.ajax() sends it, on fetch: the same URL, body encoding (form fields, %20 as +),
     * Content-Type, Accept and X-Requested-With headers, cookies for the same origin only.
     * opts: url, method (GET), data (an object, [{name, value}], a string or FormData), dataType ('json', or the
     * response's own type: JSON when the server says so, else text), headers, timeout (ms), signal (AbortSignal).
     * Resolves with the response; rejects with what a jqXHR would tell: {status, statusText, textStatus ('error',
     * 'timeout', 'abort', 'parsererror'), responseText, responseJSON, responseURL, getResponseHeader()}.
     */
    function request(opts) {
        opts = opts || {};
        var method = String(opts.method || 'GET').toUpperCase(), url = String(opts.url || window.location.href);
        var data = opts.data, body = null, hasContent = !/^(?:GET|HEAD)$/.test(method), form = false;
        if (typeof window.FormData === 'function' && data instanceof window.FormData) {
            form = true;
            if (hasContent) { body = data; }
        } else {
            if (data !== null && data !== undefined && typeof data !== 'string') { data = plainParam(data); }
            if (!hasContent) {
                if (data) { url = url.replace(/#.*$/, '') + (/\?/.test(url) ? '&' : '?') + data; }
            } else if (data) {
                body = data.replace(/%20/g, '+');
            }
        }
        var headers = {};
        if (body !== null && !form) { headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'; }
        headers.Accept = opts.dataType === 'json' ? 'application/json, text/javascript, */*; q=0.01' : '*/*';
        Object.keys(opts.headers || {}).forEach(function (k) {
            Object.keys(headers).forEach(function (h) { if (h.toLowerCase() === k.toLowerCase()) { delete headers[h]; } });
            headers[k] = opts.headers[k];
        });
        if (sameOrigin(url) && !Object.keys(headers).some(function (h) { return h.toLowerCase() === 'x-requested-with'; })) {
            headers['X-Requested-With'] = 'XMLHttpRequest';
        }
        var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;
        var why = null, timer = null;
        var abort = function (reason) { if (!why) { why = reason; } if (controller) { controller.abort(); } };
        if (opts.signal) {
            if (opts.signal.aborted) { abort('abort'); }
            else { opts.signal.addEventListener('abort', function () { abort('abort'); }, { once: true }); }
        }
        if (opts.timeout > 0) { timer = window.setTimeout(function () { abort('timeout'); }, opts.timeout); }
        var xhrLike = function (status, textStatus, res, text) {
            return {
                readyState: status ? 4 : 0, status: status, statusText: res ? res.statusText : textStatus, textStatus: textStatus,
                responseText: text === undefined ? '' : text, responseURL: res ? res.url : '',
                getResponseHeader: function (name) { return res ? res.headers.get(name) : null; }
            };
        };
        var promise = new Promise(function (resolve, reject) {
            if (why) { reject(xhrLike(0, why)); return; }
            window.fetch(url, { method: method, headers: headers, body: body, credentials: 'same-origin', signal: controller ? controller.signal : undefined })
                .then(function (res) {
                    return res.text().then(function (text) {
                        if (timer) { window.clearTimeout(timer); }
                        // aborted (or timed out) while the answer came in: as jQuery, the answer is not used
                        if (why) { reject(xhrLike(0, why)); return; }
                        var ok = (res.status >= 200 && res.status < 300) || res.status === 304;
                        var xhr = xhrLike(res.status, ok ? 'success' : 'error', res, text);
                        if (!ok) { reject(xhr); return; }
                        if (res.status === 204 || method === 'HEAD') { resolve(undefined); return; }
                        var json = opts.dataType === 'json' || (!opts.dataType && /json/i.test(res.headers.get('Content-Type') || ''));
                        if (!json) { resolve(text); return; }
                        try { xhr.responseJSON = JSON.parse(text); } catch (e) { xhr.textStatus = 'parsererror'; reject(xhr); return; }
                        resolve(xhr.responseJSON);
                    });
                }, function () {
                    if (timer) { window.clearTimeout(timer); }
                    reject(xhrLike(0, why || 'error'));
                });
        });
        promise.abort = function () { abort('abort'); };
        return promise;
    }

    // ---- styles and animations without jQuery -----------------------------------------------------------------
    // What the modules use of jQuery's .css() and .animate() where the page has no jQuery, by jQuery's rules: a
    // number is in px for the properties jQuery adds px to, a start value in other units than the end's is converted
    // first, width and height never go below 0, an animated width or height has overflow: hidden meanwhile (and an
    // inline element display: inline-block), the steps follow jQuery's "swing" on one timer for all animations
    // (animation frames while the page is visible, else every 13 ms), and an animation started while none runs
    // makes its first step at once (so one of 0 ms ends at once). 'show' and 'hide' fade an element in and out.

    var AUTO_PX = /^(?:Border(?:Top|Right|Bottom|Left)?(?:Width|)|(?:Margin|Padding)?(?:Top|Right|Bottom|Left)?|(?:Min|Max)?(?:Width|Height))$/;
    var CSS_NUM = /^(?:([+-])=|)([+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|))([a-z%]*)$/i;
    var NUM_NON_PX = /^([+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|))(?!px)[a-z%]+$/i;

    function camel(name) { return String(name).replace(/-([a-z])/g, function (all, c) { return c.toUpperCase(); }); }
    function isAutoPx(prop) { return /^[a-z]/.test(prop) && AUTO_PX.test(prop.charAt(0).toUpperCase() + prop.slice(1)); }
    function isBox(prop) { return prop === 'width' || prop === 'height'; }

    /** jQuery.css(el, prop): the computed value; width and height as jQuery measures them */
    function cssGet(el, prop) {
        var cs = window.getComputedStyle(el);
        if (isBox(prop)) {
            if (cs.display === 'none') {
                var saved = {}, show = { position: 'absolute', visibility: 'hidden', display: 'block' };
                Object.keys(show).forEach(function (k) { saved[k] = el.style[k]; el.style[k] = show[k]; });
                try { return cssGet(el, prop); } finally { Object.keys(show).forEach(function (k) { el.style[k] = saved[k]; }); }
            }
            var val = cs[prop], offset = 'offset' + prop.charAt(0).toUpperCase() + prop.slice(1), adjust = 0;
            if (NUM_NON_PX.test(val)) { return val; }
            if (val === 'auto' && el.getClientRects().length && offset in el) {
                val = el[offset];
                if (cs.boxSizing !== 'border-box') {
                    (prop === 'width' ? ['Left', 'Right'] : ['Top', 'Bottom']).forEach(function (side) {
                        adjust -= (parseFloat(cs['padding' + side]) || 0) + (parseFloat(cs['border' + side + 'Width']) || 0);
                    });
                }
            }
            return ((parseFloat(val) || 0) + adjust) + 'px';
        }
        var v = cs.getPropertyValue(prop) || cs[prop];
        if (v === '' && !el.isConnected) { v = el.style[prop]; }
        return v;
    }
    /** jQuery.css(el, prop, ''): a number where it is one */
    function cssNumber(el, prop) {
        var v = cssGet(el, prop), n = parseFloat(v);
        return isFinite(n) ? n || 0 : v;
    }

    /** jQuery.style(el, prop, value): numbers get px where jQuery adds it; null and NaN are skipped. */
    function cssSet(el, prop, value) {
        prop = camel(prop);
        if (value === null || value === undefined || value !== value) { return; }
        var m;
        if (typeof value === 'string' && (m = CSS_NUM.exec(value)) && m[1]) {
            value = cssNumber(el, prop) + (m[1] + 1) * m[2] + (m[3] || (isAutoPx(prop) ? 'px' : ''));
        } else if (typeof value === 'number') {
            value += isAutoPx(prop) ? 'px' : '';
        }
        if (isBox(prop) && (m = CSS_NUM.exec(value))) { value = Math.max(0, m[2]) + (m[3] || 'px'); }
        el.style[prop] = value;
    }

    /** Exp.util.css(el, 'width', '20px') or Exp.util.css(el, { width: 20 }): sets styles as jQuery's .css() does. */
    function css(el, prop, value) {
        if (!el || !el.style) { return el; }
        if (typeof prop === 'string') { cssSet(el, prop, value); return el; }
        Object.keys(prop || {}).forEach(function (k) { cssSet(el, k, prop[k]); });
        return el;
    }

    // fxPending: a frame of the loop is queued; a new animation then joins it instead of starting a second loop
    var fxTimers = [], fxRunning = false, fxPending = false, fxNow;
    function fxTime() {
        if (fxNow === undefined) { fxNow = Date.now(); window.setTimeout(function () { fxNow = undefined; }); }
        return fxNow;
    }
    function fxTick() {
        fxNow = Date.now();
        for (var i = 0; i < fxTimers.length; i++) {
            var timer = fxTimers[i];
            if (!timer() && fxTimers[i] === timer) { fxTimers.splice(i--, 1); }
        }
        if (!fxTimers.length) { fxRunning = false; }
        fxNow = undefined;
    }
    function fxSchedule() {
        fxPending = false;
        if (!fxRunning) { return; }
        fxPending = true;
        if (document.hidden === false && window.requestAnimationFrame) { window.requestAnimationFrame(fxSchedule); }
        else { window.setTimeout(fxSchedule, 13); }
        fxTick();
    }

    var shownDisplay = new WeakMap();
    function defaultDisplay(el) {
        var temp = el.ownerDocument.body.appendChild(el.ownerDocument.createElement(el.nodeName));
        var display = window.getComputedStyle(temp).display;
        temp.parentNode.removeChild(temp);
        return display === 'none' || !display ? 'block' : display;
    }
    function hiddenInTree(el) {
        return el.style.display === 'none' || (el.style.display === '' && el.isConnected && window.getComputedStyle(el).display === 'none');
    }
    function showHide(el, show) {
        var display = el.style.display, value = null;
        if (show) {
            if (display === 'none') {
                value = shownDisplay.get(el) || null;
                if (!value) { el.style.display = ''; }
            }
            if (el.style.display === '' && hiddenInTree(el)) { value = defaultDisplay(el); }
        } else if (display !== 'none') {
            value = 'none';
            shownDisplay.set(el, display);
        }
        if (value !== null) { el.style.display = value; }
    }

    /** One property's tween: its start in the end's unit (converted as jQuery's adjustCSS() does), its end. */
    function tween(el, prop, end) {
        var cur = function () { var v = cssNumber(el, prop); return !v || v === 'auto' ? 0 : v; };
        var parts = CSS_NUM.exec(end), initial = cur(), unit = (parts && parts[3]) || (isAutoPx(prop) ? 'px' : '');
        var t = { prop: prop, start: initial, end: end, unit: unit };
        var inUnit = (!isAutoPx(prop) || (unit !== 'px' && +initial)) && CSS_NUM.exec(cssGet(el, prop));
        if (inUnit && inUnit[3] !== unit) {
            var scale, iterations = 20;
            initial = initial / 2;
            unit = unit || inUnit[3];
            inUnit = +initial || 1;
            while (iterations--) {
                cssSet(el, prop, inUnit + unit);
                if ((1 - scale) * (1 - (scale = cur() / initial || 0.5)) <= 0) { iterations = 0; }
                inUnit = inUnit / scale;
            }
            inUnit = inUnit * 2;
            cssSet(el, prop, inUnit + unit);
            parts = parts || [];
        }
        if (parts) {
            inUnit = +inUnit || +initial || 0;
            t.unit = unit;
            t.start = inUnit;
            t.end = parts[1] ? inUnit + (parts[1] + 1) * parts[2] : +parts[2];
        }
        return t;
    }

    var animations = new WeakMap();

    /**
     * Exp.util.animate(el, { width: '20px', opacity: 0 }, ms, complete): as jQuery's .animate() (complete runs with
     * this = el); a value 'show' or 'hide' fades the element in or out as .fadeIn() / .fadeOut() do.
     */
    function animate(el, props, duration, complete) {
        duration = typeof duration === 'number' ? duration : 400;
        var tweens = [], orig = {}, always = [], done = [], stopped = false;
        var hidden = hiddenInTree(el), toggled = false;
        var list = {};
        Object.keys(props || {}).forEach(function (k) { list[camel(k)] = props[k]; });
        Object.keys(list).forEach(function (prop) {
            var v = list[prop];
            if (v !== 'show' && v !== 'hide') { return; }
            delete list[prop];
            if (v === (hidden ? 'hide' : 'show')) { return; }
            toggled = true;
            orig[prop] = el.style[prop];
        });
        var any = Object.keys(list).length > 0;
        if ((any || toggled) && (list.width !== undefined || list.height !== undefined)) {
            var overflow = [el.style.overflow, el.style.overflowX, el.style.overflowY];
            if (cssGet(el, 'display') === 'inline' && cssGet(el, 'float') === 'none') { el.style.display = 'inline-block'; }
            el.style.overflow = 'hidden';
            always.push(function () { el.style.overflow = overflow[0]; el.style.overflowX = overflow[1]; el.style.overflowY = overflow[2]; });
        }
        if (toggled) {
            if (hidden) { showHide(el, true); }
            done.push(function () {
                if (!hidden) { showHide(el, false); }
                Object.keys(orig).forEach(function (prop) { cssSet(el, prop, orig[prop]); });
            });
            Object.keys(orig).forEach(function (prop) {
                var t = tween(el, prop, hidden ? undefined : 0);
                if (hidden) { t.end = t.start; t.start = 0; }
                tweens.push(t);
            });
        }
        Object.keys(list).forEach(function (prop) { tweens.push(tween(el, prop, list[prop])); });
        if (typeof complete === 'function') { done.push(function () { complete.call(el); }); }

        var startTime = fxNow === undefined ? fxTime() : fxNow;
        var run = function (percent) {
            var eased = duration ? 0.5 - Math.cos(percent * Math.PI) / 2 : percent;
            tweens.forEach(function (t) { cssSet(el, t.prop, ((t.end - t.start) * eased + t.start) + t.unit); });
        };
        var forget = function () {
            var mine = animations.get(el) || [];
            var i = mine.indexOf(anim);
            if (i !== -1) { mine.splice(i, 1); }
        };
        var finish = function (ok) {
            forget();
            always.forEach(function (fn) { fn(); });
            if (ok) { done.forEach(function (fn) { fn(); }); }
        };
        var anim = {
            stop: function (toEnd) {
                if (stopped) { return; }
                stopped = true;
                if (toEnd) { run(1); }
                var i = fxTimers.indexOf(timer);
                if (i !== -1) { fxTimers.splice(i, 1); }
                finish(!!toEnd);
            }
        };
        var timer = function () {
            if (stopped) { return false; }
            var now = fxNow === undefined ? fxTime() : fxNow;
            var remaining = Math.max(0, startTime + duration - now), percent = 1 - (remaining / duration || 0);
            run(percent);
            if (percent < 1 && tweens.length) { return remaining; }
            stopped = true;
            finish(true);
            return false;
        };
        var mine = animations.get(el) || [];
        mine.push(anim);
        animations.set(el, mine);
        fxTimers.push(timer);
        if (!fxRunning) { fxRunning = true; if (!fxPending) { fxSchedule(); } }
        return el;
    }

    /** Exp.util.stop(el, jumpToEnd): as jQuery's .stop(true, jumpToEnd); jumping to the end runs complete. */
    function stop(el, toEnd) {
        (animations.get(el) || []).slice().reverse().forEach(function (anim) { anim.stop(toEnd); });
        return el;
    }

    /** Helpers that need no jQuery: extend() and param() follow jQuery's rules (they are jQuery's when it is there). */
    Exp.util = {
        extend: $ ? $.extend : plainExtend,
        param: $ ? $.param : plainParam,
        isPlainObject: isPlainObject,
        request: request,
        css: css,
        animate: animate,
        stop: stop
    };
    var extend = Exp.util.extend;

    // ---- configuration --------------------------------------------------------------------------------------

    /**
     * Every configuration block on the page, merged in page order: the pagelayout's (the admin designs write one in
     * their <head>) and any a template adds for its own preferences and texts. null when there is none yet.
     */
    var seenBlocks = [];
    function readPage() {
        var blocks = document.querySelectorAll('script[type="application/json"]#exp-config, script[type="application/json"][data-exp-config]');
        if (!blocks.length) { return null; }
        var merged = { config: {}, strings: {}, prefs: {} };
        Array.prototype.forEach.call(blocks, function (el) {
            var data;
            try { data = JSON.parse(el.textContent) || {}; } catch (e) { return; }
            extend(true, merged.config, data.config || {});
            extend(merged.strings, data.strings || {});
            extend(merged.prefs, data.prefs || {});
            if (seenBlocks.indexOf(el) === -1) { seenBlocks.push(el); }
        });
        return merged;
    }
    var page = readPage();
    page = page || {};

    Exp.config = extend(true, {
        version: Exp.version,
        root: '/',
        www: '/',
        siteaccess: '',
        call: '/ezjscore/call/',
        prefsUrl: '/user/preferences',
        tokenElement: 'ezxform_token_js',
        separator: '@SEPARATOR$',
        locale: { code: 'eng-GB', http: 'en-GB', firstDay: 1 }
    }, page.config || {});
    // the jQuery the core runs on; null without jQuery
    Exp.config.jquery = $ ? $.fn.jquery : null;

    // ---- translations ---------------------------------------------------------------------------------------

    var strings = extend({}, page.strings || {});

    /**
     * A text in the page's language: the translation the server put into the page, or the text itself.
     * Parameters replace their placeholders: Exp.i18n('HTTP %status', {'%status': 500}).
     */
    Exp.i18n = function (text, params) {
        var out = hasOwn.call(strings, text) ? strings[text] : String(text);
        if (params) {
            Object.keys(params).forEach(function (key) { out = out.split(key).join(String(params[key])); });
        }
        return out;
    };

    // ---- page-wide events -----------------------------------------------------------------------------------

    /**
     * Without jQuery: the same calls on a small bus of its own. Handlers get (event, data); event has type and
     * namespace. Several names separated by spaces, and namespaces (name.ns; off('.ns') removes them all) work as
     * with jQuery; an exception in a handler is not caught, as with jQuery.
     */
    function PlainBus() { this.handlers = []; }
    PlainBus.prototype.parse = function (names) {
        return String(names || '').split(/\s+/).filter(Boolean).map(function (n) {
            var parts = n.split('.');
            return { type: parts.shift(), ns: parts.sort() };
        });
    };
    PlainBus.prototype.on = function (names, fn) {
        if (typeof fn !== 'function') { return; }
        var self = this;
        this.parse(names).forEach(function (p) { if (p.type) { self.handlers.push({ type: p.type, ns: p.ns, fn: fn }); } });
    };
    PlainBus.prototype.off = function (names, fn) {
        var list = names ? this.parse(names) : [{ type: '', ns: [] }];
        this.handlers = this.handlers.filter(function (h) {
            return !list.some(function (p) {
                return (!p.type || p.type === h.type) && (!fn || fn === h.fn) &&
                       p.ns.every(function (n) { return h.ns.indexOf(n) !== -1; });
            });
        });
    };
    PlainBus.prototype.trigger = function (name, data) {
        var p = this.parse(name)[0];
        if (!p) { return; }
        var event = { type: p.type, namespace: p.ns.join('.'), timeStamp: Date.now(), isDefaultPrevented: function () { return false; } };
        this.handlers.slice().forEach(function (h) {
            if (h.type === p.type && p.ns.every(function (n) { return h.ns.indexOf(n) !== -1; })) { h.fn.call(Exp, event, data); }
        });
    };

    var bus = $ ? $({}) : new PlainBus();
    /** Exp.on('exp:datatable:load', function (event, data) {}) */
    Exp.on = function (name, fn) { bus.on(name, fn); return Exp; };
    Exp.off = function (name, fn) { bus.off(name, fn); return Exp; };
    Exp.emit = $ ? function (name, data) { bus.trigger(name, [data]); return Exp; }
                 : function (name, data) { bus.trigger(name, data); return Exp; };

    // ---- the DOM being ready, without jQuery ----------------------------------------------------------------

    // As jQuery's ready(): the functions run in the order they were given, each on its own once the DOM is ready
    // (after it: at once, but not synchronously)
    var domReady = false, readyQueue = [];
    function flushReady() {
        if (domReady) { return; }
        domReady = true;
        readyQueue.splice(0).forEach(function (fn) { window.setTimeout(fn, 0); });
    }
    function whenReady(fn) {
        if (domReady) { window.setTimeout(fn, 0); } else { readyQueue.push(fn); }
    }
    if (!$) {
        if (document.readyState !== 'loading') { window.setTimeout(flushReady, 0); }
        else {
            document.addEventListener('DOMContentLoaded', flushReady);
            window.addEventListener('load', flushReady);
        }
    }

    // ---- modules started from data-exp-* attributes ---------------------------------------------------------

    var modules = {};
    var started = false;
    var startedOn = {};

    function options(value) {
        if (!value) { return {}; }
        if (value.charAt(0) === '{') {
            try { return JSON.parse(value); } catch (e) { return {}; }
        }
        return { value: value };
    }

    /** Without jQuery: root as a list of nodes (a node, a selector, a list of nodes). */
    function rootsOf(root) {
        if (typeof root === 'string') { return Array.prototype.slice.call(document.querySelectorAll(root)); }
        return root && root.nodeType ? [root] : Array.prototype.slice.call(root || []);
    }

    /** Without jQuery: the elements of roots and below them that match selector, in page order (as find().addBack()). */
    function within(roots, selector) {
        var out = [];
        roots.forEach(function (r) {
            if (r.nodeType === 1 && r.matches(selector) && out.indexOf(r) === -1) { out.push(r); }
            if (r.querySelectorAll) {
                Array.prototype.forEach.call(r.querySelectorAll(selector), function (el) { if (out.indexOf(el) === -1) { out.push(el); } });
            }
        });
        if (roots.length > 1) {
            out.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
        }
        return out;
    }

    /**
     * Exp.register('collapse', function ($el, options) {}): started on every element with data-exp-collapse,
     * once per element; the attribute's value is JSON options ({"pref": "x"}) or a plain value ({value: "x"}).
     * $el is the element in jQuery (Exp.$), or the element itself on a page without jQuery.
     */
    Exp.register = function (name, init) {
        if (!/^[a-z][a-z0-9-]*$/.test(name) || typeof init !== 'function') {
            throw new Error('Exp.register: a lower-case name and a function are needed');
        }
        modules[name] = init;
        if (started) { Exp.start(document, [name]); }
        return Exp;
    };

    Exp.modules = function () { return Object.keys(modules); };

    /** Starts the modules below root (after content was inserted with AJAX); only: the module names to start. */
    Exp.start = function (root, only) {
        var $root = $ ? $(root || document) : null, roots = $ ? null : rootsOf(root || document);
        Object.keys(modules).forEach(function (name) {
            if (only && only.indexOf(name) === -1) { return; }
            var attr = 'data-exp-' + name;
            // the core on plain JavaScript, and jQuery 4 came later (a template asked for exp::core after
            // exp::core::shared, and exp::boot set Exp.$): the module gets the element in that jQuery, as its file expects
            var jq = $ || Exp.$;
            var run = function (el) {
                try {
                    modules[name].call(el, jq ? jq(el) : el, options(el.getAttribute(attr)));
                } catch (e) {
                    if (window.console) { window.console.error('Exp: module ' + name + ' failed', e); }
                }
            };
            if ($) {
                $root.find('[' + attr + ']').addBack('[' + attr + ']').each(function () {
                    var key = 'exp-started-' + name;
                    if ($.data(this, key)) { return; }
                    $.data(this, key, true);
                    run(this);
                });
                return;
            }
            var seen = startedOn[name] = startedOn[name] || new window.WeakSet();
            within(roots, '[' + attr + ']').forEach(function (el) {
                if (seen.has(el)) { return; }
                seen.add(el);
                run(el);
            });
        });
        Exp.emit('exp:started', { root: $ ? $root[0] : roots[0], only: only || null });
        return Exp;
    };

    /** Exp.ready(function ($) {}): the DOM is ready and the page's modules have been started; $ is Exp.$. */
    Exp.ready = function (fn) {
        if ($) { $(function () { fn($); }); } else { whenReady(function () { fn($); }); }
        return Exp;
    };

    // ---- user preferences -----------------------------------------------------------------------------------

    var prefs = extend({}, page.prefs || {});

    /**
     * Blocks that came after the core (further down the page): merged in when the page is ready. A preference set
     * with Exp.prefs.set() since the page loaded is kept, not overwritten by the page's older value.
     */
    var setSinceLoad = {};
    function applyPage() {
        var before = seenBlocks.length;
        var later = readPage();
        if (!later || seenBlocks.length === before) { return; }
        extend(true, Exp.config, later.config || {});
        extend(strings, later.strings || {});
        Object.keys(later.prefs || {}).forEach(function (name) {
            if (!setSinceLoad[name]) { prefs[name] = later.prefs[name]; }
        });
    }

    function token() {
        var el = document.getElementById(Exp.config.tokenElement);
        return el ? (el.getAttribute('title') || '') : '';
    }
    Exp.token = token;

    Exp.prefs = {
        /** The value the server had when the page was made (or set since), else fallback. */
        get: function (name, fallback) {
            return hasOwn.call(prefs, name) && prefs[name] !== null ? prefs[name] : fallback;
        },
        /**
         * Saves a preference for the signed-in user (user/preferences); a Promise. It rejects with the jqXHR, or
         * without jQuery with an object that has its status, statusText and textStatus.
         */
        set: function (name, value) {
            if (!/^[A-Za-z0-9_.\-]{1,64}$/.test(String(name))) {
                return Promise.reject(new Error('Exp.prefs.set: not a preference name'));
            }
            prefs[name] = String(value);
            setSinceLoad[name] = true;
            var data = { Function: 'set_and_exit', Key: name, Value: String(value) };
            if (token()) { data.ezxform_token = token(); }
            var sent = $ ? Promise.resolve($.ajax({ url: Exp.config.prefsUrl, method: 'POST', data: data }))
                         : request({ url: Exp.config.prefsUrl, method: 'POST', data: data });
            return sent.then(function () {
                Exp.emit('exp:prefs:set', { name: name, value: String(value) });
                return String(value);
            });
        }
    };

    // ---- keyboard shortcuts ---------------------------------------------------------------------------------

    var bindings = [], nextBinding = 0;

    function matches(e, combo) {
        var parts = combo.toLowerCase().split('+'), key = parts.pop();
        var want = { ctrl: false, alt: false, shift: false, meta: false };
        parts.forEach(function (p) { if (p in want) { want[p] = true; } });
        if (e.ctrlKey !== want.ctrl || e.altKey !== want.alt || e.metaKey !== want.meta) { return false; }
        if (want.shift && !e.shiftKey) { return false; }
        return String(e.key).toLowerCase() === (key === 'esc' ? 'escape' : key === 'space' ? ' ' : key);
    }

    function typing(el) {
        return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    }

    function onKey(e) {
        for (var i = 0; i < bindings.length; i++) {
            var b = bindings[i];
            if (!matches(e, b.combo)) { continue; }
            if (typing(e.target) && !b.inInputs) { continue; }
            if (b.scope && !(b.scope === e.target || b.scope.contains(e.target))) { continue; }
            if (b.fn.call(e.target, e) === false) { e.preventDefault(); }
        }
    }
    if ($) { $(document).on('keydown.exp', onKey); } else { document.addEventListener('keydown', onKey); }

    function scopeElement(scope) {
        if ($) { return $(scope)[0]; }
        if (typeof scope === 'string') { return document.querySelector(scope); }
        return scope && scope.nodeType ? scope : (scope && scope[0]) || undefined;
    }

    Exp.keys = {
        /**
         * Exp.keys.bind('/', fn), Exp.keys.bind('ctrl+s', fn, {inInputs: true}), Exp.keys.bind('Escape', fn, {scope: el}).
         * The handler returning false prevents the browser's default. Returns an id for unbind().
         */
        bind: function (combo, fn, opts) {
            opts = opts || {};
            var scope = opts.scope ? scopeElement(opts.scope) : null;
            nextBinding += 1;
            bindings.push({ combo: String(combo), fn: fn, scope: scope, inInputs: !!opts.inInputs, id: nextBinding });
            return nextBinding;
        },
        unbind: function (id) {
            bindings = bindings.filter(function (b) { return b.id !== id; });
        }
    };

    // ---- environment ----------------------------------------------------------------------------------------

    Exp.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.documentElement.classList.add('exp-js');

    var go = function () {
        applyPage();
        started = true;
        Exp.start(document);
    };
    if ($) { $(go); } else { whenReady(go); }
}(window, document));
