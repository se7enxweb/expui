/*!
 * Exponential UI (expui) core — the Exp namespace on jQuery 4.
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * Loaded by the exp::core packer key after jQuery 4 (Exp.$). Reads the page's configuration from
 * <script type="application/json" id="exp-config"> (the exp_config() template operator).
 *
 *   Exp.config, Exp.i18n(), Exp.on() / Exp.off() / Exp.emit(), Exp.register() / Exp.start(),
 *   Exp.ready(), Exp.prefs.get() / .set(), Exp.keys.bind() / .unbind(), Exp.reducedMotion
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
    if (!$) {
        // exp::boot refused the jQuery it found; it said why in the console
        return;
    }

    Exp.version = '1.0.0.1';

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
            $.extend(true, merged.config, data.config || {});
            $.extend(merged.strings, data.strings || {});
            $.extend(merged.prefs, data.prefs || {});
            if (seenBlocks.indexOf(el) === -1) { seenBlocks.push(el); }
        });
        return merged;
    }
    var page = readPage();
    page = page || {};

    Exp.config = $.extend(true, {
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
    Exp.config.jquery = $.fn.jquery;

    // ---- translations ---------------------------------------------------------------------------------------

    var strings = $.extend({}, page.strings || {});

    /**
     * A text in the page's language: the translation the server put into the page, or the text itself.
     * Parameters replace their placeholders: Exp.i18n('HTTP %status', {'%status': 500}).
     */
    Exp.i18n = function (text, params) {
        var out = Object.prototype.hasOwnProperty.call(strings, text) ? strings[text] : String(text);
        if (params) {
            Object.keys(params).forEach(function (key) { out = out.split(key).join(String(params[key])); });
        }
        return out;
    };

    // ---- page-wide events -----------------------------------------------------------------------------------

    var bus = $({});
    /** Exp.on('exp:datatable:load', function (event, data) {}) */
    Exp.on = function (name, fn) { bus.on(name, fn); return Exp; };
    Exp.off = function (name, fn) { bus.off(name, fn); return Exp; };
    Exp.emit = function (name, data) { bus.trigger(name, [data]); return Exp; };

    // ---- modules started from data-exp-* attributes ---------------------------------------------------------

    var modules = {};
    var started = false;

    function options(value) {
        if (!value) { return {}; }
        if (value.charAt(0) === '{') {
            try { return JSON.parse(value); } catch (e) { return {}; }
        }
        return { value: value };
    }

    /**
     * Exp.register('collapse', function ($el, options) {}): started on every element with data-exp-collapse,
     * once per element; the attribute's value is JSON options ({"pref": "x"}) or a plain value ({value: "x"}).
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
        var $root = $(root || document);
        Object.keys(modules).forEach(function (name) {
            if (only && only.indexOf(name) === -1) { return; }
            var attr = 'data-exp-' + name;
            $root.find('[' + attr + ']').addBack('[' + attr + ']').each(function () {
                var key = 'exp-started-' + name;
                if ($.data(this, key)) { return; }
                $.data(this, key, true);
                try {
                    modules[name].call(this, $(this), options(this.getAttribute(attr)));
                } catch (e) {
                    if (window.console) { window.console.error('Exp: module ' + name + ' failed', e); }
                }
            });
        });
        Exp.emit('exp:started', { root: $root[0], only: only || null });
        return Exp;
    };

    /** Exp.ready(function ($) {}): the DOM is ready and the page's modules have been started. */
    Exp.ready = function (fn) {
        $(function () { fn($); });
        return Exp;
    };

    // ---- user preferences -----------------------------------------------------------------------------------

    var prefs = $.extend({}, page.prefs || {});

    /**
     * Blocks that came after the core (further down the page): merged in when the page is ready. A preference set
     * with Exp.prefs.set() since the page loaded is kept, not overwritten by the page's older value.
     */
    var setSinceLoad = {};
    function applyPage() {
        var before = seenBlocks.length;
        var later = readPage();
        if (!later || seenBlocks.length === before) { return; }
        $.extend(true, Exp.config, later.config || {});
        $.extend(strings, later.strings || {});
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
            return Object.prototype.hasOwnProperty.call(prefs, name) && prefs[name] !== null ? prefs[name] : fallback;
        },
        /** Saves a preference for the signed-in user (user/preferences); a Promise. */
        set: function (name, value) {
            if (!/^[A-Za-z0-9_.\-]{1,64}$/.test(String(name))) {
                return Promise.reject(new Error('Exp.prefs.set: not a preference name'));
            }
            prefs[name] = String(value);
            setSinceLoad[name] = true;
            var data = { Function: 'set_and_exit', Key: name, Value: String(value) };
            if (token()) { data.ezxform_token = token(); }
            return Promise.resolve($.ajax({ url: Exp.config.prefsUrl, method: 'POST', data: data })).then(function () {
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

    $(document).on('keydown.exp', function (e) {
        for (var i = 0; i < bindings.length; i++) {
            var b = bindings[i];
            if (!matches(e, b.combo)) { continue; }
            if (typing(e.target) && !b.inInputs) { continue; }
            if (b.scope && !(b.scope === e.target || b.scope.contains(e.target))) { continue; }
            if (b.fn.call(e.target, e) === false) { e.preventDefault(); }
        }
    });

    Exp.keys = {
        /**
         * Exp.keys.bind('/', fn), Exp.keys.bind('ctrl+s', fn, {inInputs: true}), Exp.keys.bind('Escape', fn, {scope: el}).
         * The handler returning false prevents the browser's default. Returns an id for unbind().
         */
        bind: function (combo, fn, opts) {
            opts = opts || {};
            var scope = opts.scope ? $(opts.scope)[0] : null;
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

    $(function () {
        applyPage();
        started = true;
        Exp.start(document);
    });
}(window, document));
