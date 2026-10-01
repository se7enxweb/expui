/* Unit tests of exp/compat.js ($.ez() over Exp.io). Run on expui/test. */
(function (window) {
    'use strict';
    var Exp = window.Exp, test = window.ExpTest.test;
    var pages = [Exp.$].concat(window.jQuery && window.jQuery !== Exp.$ ? [window.jQuery] : []);

    test('compat: $.ez is installed on jQuery 4 and on the page\'s jQuery', function (t) {
        pages.forEach(function (jq) {
            t.ok(jq.ez && jq.ez.expCompat, 'jQuery ' + jq.fn.jquery);
            t.equal(jq.ez.url, Exp.config.call, 'url');
            t.equal(jq.ez.root_url, Exp.config.root, 'root_url');
            t.equal(jq.ez.seperator, Exp.config.separator, 'seperator');
            t.equal(typeof jq.ez.setPreference, 'function', 'setPreference');
        });
    });

    test('compat: $.ez(call, post, callBack) gets the call view\'s JSON', function (t) {
        return new Promise(function (resolve, reject) {
            var request = window.jQuery.ez('ezjsc::time', {}, function (data) {
                try { t.ok(data && 'content' in data && data.error_text === '', 'callBack got {error_text, content}'); resolve(); } catch (e) { reject(e); }
            });
            t.ok(typeof request.done === 'function' && typeof request.fail === 'function', 'a jqXHR comes back');
        });
    });

    test('compat: $.ez(call) without post uses GET', function (t) {
        return window.jQuery.ez('ezjsc::time').then(function (data) { t.ok(data && 'content' in data, 'content'); });
    });

    test('compat: install() refuses to install twice', function (t) {
        t.equal(Exp.compat.install(Exp.$), false);
    });
}(window));
