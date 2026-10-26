/* Unit tests of exp/core.js (Exp core). Run on expui/test. */
(function (window, document) {
    'use strict';
    var Exp = window.Exp, test = window.ExpTest.test;
    var expected = document.getElementById('exp-test-expected').dataset;

    test('core: Exp.$ is jQuery 4', function (t) {
        t.ok(Exp && Exp.$, 'Exp.$ is set');
        t.equal(String(Exp.$.fn.jquery).split('.')[0], '4', 'major version');
        t.equal(Exp.config.jquery, Exp.$.fn.jquery, 'Exp.config.jquery');
    });

    test('core: the page keeps its own jQuery next to jQuery 4', function (t) {
        if (!window.jQuery || window.jQuery === Exp.$) {
            t.ok(Exp.jQueryShared, 'no other jQuery: jQuery 4 is the page\'s jQuery');
            return;
        }
        t.equal(Exp.jQueryShared, false, 'not shared');
        t.ok(window.jQuery.fn.jquery !== Exp.$.fn.jquery, 'the page\'s jQuery is another version (' + window.jQuery.fn.jquery + ')');
        t.ok(window.$ === window.jQuery, '$ is the page\'s jQuery again');
    });

    test('core: Exp.config comes from the page (exp_config)', function (t) {
        t.equal(Exp.config.siteaccess, expected.siteaccess, 'siteaccess');
        t.equal(Exp.config.root, expected.root, 'root');
        t.equal(Exp.config.call, expected.root + 'ezjscore/call/', 'call');
        t.equal(Exp.config.prefsUrl, expected.root + 'user/preferences', 'prefsUrl');
        t.equal(Exp.config.separator, '@SEPARATOR$', 'separator');
        t.ok(/^[a-z]{3}-[A-Z]{2}$/.test(Exp.config.locale.code), 'locale code ' + Exp.config.locale.code);
        t.ok(Exp.config.locale.firstDay === 0 || Exp.config.locale.firstDay === 1, 'first day');
        t.equal(Exp.config.version, Exp.version, 'version');
    });

    test('core: Exp.i18n translates and fills in placeholders', function (t) {
        t.equal(Exp.i18n('Close'), expected.close, 'a string of [ExpUI] Strings');
        t.equal(Exp.i18n('Exp test %n of %m', { '%n': 2, '%m': 3 }), 'Exp test 2 of 3', 'placeholders');
        t.equal(Exp.i18n('Not a known text'), 'Not a known text', 'unknown: the text itself');
    });

    test('core: Exp.on / emit / off', function (t) {
        var got = [];
        var fn = function (e, data) { got.push(data.n); };
        Exp.on('exp:test:event', fn).emit('exp:test:event', { n: 1 });
        Exp.off('exp:test:event', fn).emit('exp:test:event', { n: 2 });
        t.deepEqual(got, [1], 'one event before off');
    });

    test('core: Exp.register starts data-exp-* elements once, with their options', function (t) {
        var host = document.getElementById('exp-test-sandbox');
        host.innerHTML = '<div id="m1" data-exp-testmod=\'{"label":"one"}\'></div><div id="m2" data-exp-testmod="plain"></div>';
        var seen = [];
        Exp.register('testmod', function ($el, options) { seen.push($el.attr('id') + ':' + (options.label || options.value)); });
        t.deepEqual(seen, ['m1:one', 'm2:plain'], 'started when registered after the page was ready');
        Exp.start(host);
        t.equal(seen.length, 2, 'not started twice');
        host.insertAdjacentHTML('beforeend', '<div id="m3" data-exp-testmod></div>');
        Exp.start(host);
        t.deepEqual(seen.slice(2), ['m3:undefined'], 'new content started by Exp.start(root)');
        t.ok(Exp.modules().indexOf('testmod') !== -1, 'listed by Exp.modules()');
    });

    test('core: Exp.register refuses a bad name', function (t) {
        t.throws(function () { Exp.register('Bad Name', function () {}); });
        t.throws(function () { Exp.register('ok', 'not a function'); });
    });

    test('core: Exp.keys.bind / unbind', function (t) {
        var calls = 0;
        var id = Exp.keys.bind('ctrl+k', function () { calls++; return false; });
        var e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
        document.body.dispatchEvent(e);
        t.equal(calls, 1, 'called');
        t.ok(e.defaultPrevented, 'returning false prevents the default');
        var input = document.getElementById('exp-test-input');
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
        t.equal(calls, 1, 'not while typing in a field (inInputs not set)');
        Exp.keys.unbind(id);
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
        t.equal(calls, 1, 'unbound');
    });

    test('core: Exp.prefs.get has the server\'s value', function (t) {
        t.equal(Exp.prefs.get('exp_test_pref', ''), expected.pref, 'exp_test_pref');
        t.equal(Exp.prefs.get('exp_not_asked_for', 'fallback'), 'fallback', 'fallback');
    });

    test('core: Exp.prefs.set saves for the user', function (t) {
        var value = 'v' + Date.now();
        window.ExpTestResults.savedPref = value;
        return Exp.prefs.set('exp_test_pref', value).then(function (saved) {
            t.equal(saved, value, 'resolved with the value');
            t.equal(Exp.prefs.get('exp_test_pref'), value, 'get() has it at once');
        });
    });

    test('core: Exp.prefs.set refuses a bad name', function (t) {
        return t.rejects(Exp.prefs.set('no spaces allowed', 1));
    });

    test('core: every exp_config block is merged (the pagelayout\'s and the page\'s)', function (t) {
        var blocks = document.querySelectorAll('script[type="application/json"][data-exp-config]');
        t.ok(blocks.length >= 1, 'at least one block');
        // the test page's own block carries the texts and preferences; the admin head's block (when present) only
        // the configuration: both must be in force
        t.equal(Exp.i18n('Exp test %n of %m', { '%n': 1, '%m': 2 }).indexOf('%') === -1, true, 'the page block\'s text');
        t.ok(Object.prototype.hasOwnProperty.call(Exp.config, 'siteaccess') && Exp.config.siteaccess !== '', 'the configuration');
    });

    test('core: loaded once per page, however often exp::core is asked for', function (t) {
        var before = Exp.ready;
        t.equal(typeof Exp.ready, 'function');
        Exp.register('exp-test-once', function () {});
        t.ok(Exp.modules().indexOf('exp-test-once') !== -1, 'a module registered now stays registered');
        t.equal(Exp.ready, before, 'the same core');
    });

    test('core: environment', function (t) {
        t.ok(document.documentElement.classList.contains('exp-js'), '<html> has exp-js');
        t.equal(typeof Exp.reducedMotion, 'boolean', 'Exp.reducedMotion');
    });

    // ---- without jQuery (exp::core::shared on a page that loads none) ------------------------------------------

    test('core: without jQuery: Exp.$ is undefined, the rest works the same', function (t) {
        var w;
        return window.ExpTest.bare().then(function (win) {
            w = win;
            var X = w.Exp;
            t.equal(w.jQuery, undefined, 'no jQuery in the frame');
            t.equal(X.$, undefined, 'Exp.$');
            t.equal(X.config.jquery, null, 'Exp.config.jquery');
            t.equal(X.config.root, Exp.config.root, 'the configuration blocks');
            t.equal(X.i18n('Close'), Exp.i18n('Close'), 'the texts');
            t.equal(X.i18n('Exp test %n of %m', { '%n': 2, '%m': 3 }), 'Exp test 2 of 3', 'placeholders');
            t.equal(X.prefs.get('exp_test_pref', ''), expected.pref, 'the preferences of the page');
            t.equal(X.token(), Exp.token(), 'the form token');
            t.ok(w.document.documentElement.classList.contains('exp-js'), '<html> has exp-js');
            var got = [], fn = function (e, d) { got.push(e.type + ':' + d.n); };
            X.on('exp:test:a.ns exp:test:b', fn).emit('exp:test:a', { n: 1 }).emit('exp:test:b', { n: 2 });
            X.off('.ns').emit('exp:test:a', { n: 3 });
            X.off('exp:test:b', fn).emit('exp:test:b', { n: 4 });
            t.deepEqual(got, ['exp:test:a:1', 'exp:test:b:2'], 'events, several names, namespaces, off');
            var box = w.document.getElementById('sandbox');
            box.innerHTML = '<div id="p1" data-exp-plain=\'{"label":"one"}\'><span id="p2" data-exp-plain="two"></span></div>';
            var seen = [];
            X.register('plain', function (el, o) { seen.push(el.id + ':' + (o.label || o.value) + ':' + (this === el)); });
            X.start(box);
            t.deepEqual(seen, ['p1:one:true', 'p2:two:true'], 'modules get the element itself, once');
            // jQuery 4 loaded after the core (exp::core requested after exp::core::shared): Exp.$ is set, the core stays plain
            X.$ = Exp.$;
            box.innerHTML = '<div id="p3" data-exp-late="x"></div>';
            var late = [];
            X.register('late', function ($el) { late.push(!!($el && $el.jquery) + ':' + ($el && $el.attr ? $el.attr('id') : '')); });
            t.deepEqual(late, ['true:p3'], 'a module gets the element in jQuery once Exp.$ is there');
            delete X.$;
            var calls = 0, id = X.keys.bind('ctrl+k', function () { calls++; return false; });
            var e = new w.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
            w.document.body.dispatchEvent(e);
            X.keys.unbind(id);
            t.ok(calls === 1 && e.defaultPrevented, 'keys');
            var fields = { a: 'x y', b: [1, [2]], c: { d: 3 }, e: null };
            t.equal(X.util.param(fields), Exp.$.param(fields), 'Exp.util.param() as jQuery.param()');
            t.equal(JSON.stringify(X.util.extend(true, {}, { a: { b: [1, 2] } }, { a: { b: [3] }, u: undefined })),
                    JSON.stringify(Exp.$.extend(true, {}, { a: { b: [1, 2] } }, { a: { b: [3] }, u: undefined })), 'Exp.util.extend() as jQuery.extend()');
            return new Promise(function (resolve) { X.ready(function ($) { resolve($); }); });
        }).then(function ($) {
            t.equal($, undefined, 'Exp.ready() hands over Exp.$, here undefined');
            var value = 'b' + Date.now();
            return w.Exp.prefs.set('exp_test_pref_bare', value).then(function (saved) { t.equal(saved, value, 'prefs.set through fetch'); });
        }).finally(function () { window.ExpTest.unbare(w); });
    });

    test('core: without jQuery, a module that needs it says so in the console', function (t) {
        var w, said = [];
        return window.ExpTest.bare({ modules: ['compat'], before: function (win) {
            win.console.error = function (m) { said.push(String(m)); };
        } }).then(function (win) {
            w = win;
            t.equal(w.Exp.compat, undefined, 'exp::compat ($.ez() hands back a jqXHR) is not set up');
            t.ok(said.some(function (m) { return /exp::compat needs jQuery/.test(m); }), 'and says why: ' + said.join(' | '));
        }).finally(function () { window.ExpTest.unbare(w); });
    });

    test('core: without jQuery, the modules set up and say nothing', function (t) {
        var w, said = [];
        return window.ExpTest.bare({ modules: ['collapse', 'sticky', 'dialog', 'upload', 'datepicker', 'autosave'], before: function (win) {
            win.console.error = function (m) { said.push(String(m)); };
        } }).then(function (win) {
            w = win;
            var X = w.Exp;
            t.ok(typeof X.collapse === 'function' && X.sticky.start && X.dialog.open && X.upload.create && X.datepicker.create && X.autosave.AutoSubmit, 'every module is there');
            t.equal(typeof w.showDatePicker, 'function', 'showDatePicker() for the date templates');
            t.deepEqual(said, [], 'no console error');
            var el = w.document.getElementById('sandbox'), done = 0;
            X.util.css(el, { width: 20, opacity: 0.5, marginLeft: '-1em', height: '-4px' });
            t.deepEqual([el.style.width, el.style.opacity, el.style.marginLeft, el.style.height], ['20px', '0.5', '-1em', '0px'],
                        'Exp.util.css(): px for numbers where jQuery adds it, no negative height');
            X.util.animate(el, { opacity: 0 }, 0, function () { done++; });
            t.ok(done === 1 && el.style.opacity === '0', 'Exp.util.animate() of 0 ms ends at once, as jQuery\'s');
            X.util.animate(el, { width: '200px' }, 5000, function () { done++; });
            t.equal(el.style.overflow, 'hidden', 'an animated width has overflow: hidden meanwhile');
            X.util.stop(el, true);
            t.ok(done === 2 && el.style.width === '200px' && el.style.overflow === '', 'Exp.util.stop(el, true) jumps to the end');
        }).finally(function () { window.ExpTest.unbare(w); });
    });
}(window, document));
