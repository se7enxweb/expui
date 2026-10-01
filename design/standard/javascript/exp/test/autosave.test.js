/*!
 * Exponential UI (expui) — browser tests of exp::autosave (Exp.autosave.AutoSubmit, Exp.autosave.Preview).
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 *
 * The saves go to expui/test/echo, which answers with the fields it got (JSON); a page that is not JSON stands in
 * for a failed save.
 */
(function (window, document) {
    'use strict';
    var Exp = window.Exp, test = window.ExpTest.test, $ = Exp.$;

    function wait(ms) { return new Promise(function (r) { window.setTimeout(r, ms); }); }
    function form(extra) {
        var host = document.getElementById('exp-test-sandbox');
        host.innerHTML = '<form id="as-form"><input name="title" value="One"><input name="skip" class="no-autosave" value="a">'
            + '<select name="pick"><option value="x">X</option><option value="y" selected>Y</option></select>'
            + '<input type="checkbox" name="flag" value="1" checked><input type="checkbox" name="off" value="1">'
            + '<input type="button" name="btn" value="b">' + (extra || '') + '</form>';
        return host.querySelector('#as-form');
    }
    function autosave(f, conf) {
        var as = new Exp.autosave.AutoSubmit($.extend({ form: f, action: Exp.io.url('expui/test/echo'), interval: 3600, ignoreClass: 'no-autosave' }, conf || {}));
        var seen = [];
        ['init', 'beforesave', 'success', 'error', 'abort', 'nochange'].forEach(function (n) { as.on(n, function (e) { seen.push(n); as.last = e; }); });
        as.seen = seen;
        return as;
    }
    function until(fn, ms) {
        var end = Date.now() + (ms || 4000);
        return new Promise(function (resolve, reject) {
            (function next() { if (fn()) { resolve(); } else if (Date.now() > end) { reject(new Error('timed out')); } else { window.setTimeout(next, 30); } }());
        });
    }

    test('autosave: the form state leaves out ignoreClass fields, unchecked boxes and buttons, as ezautosubmit.js', function (t) {
        var f = form();
        t.equal(Exp.autosave.serializeForm(f, 'no-autosave'), 'title=One&pick=y&flag=1');
        t.equal(Exp.autosave.serializeForm(f, false), 'title=One&skip=a&pick=y&flag=1');
    });

    test('autosave: init, then a change saves (beforesave, success) and posts the form\'s fields', function (t) {
        var f = form(), as = autosave(f);
        return until(function () { return as.seen.indexOf('init') !== -1; }).then(function () {
            as.start();
            return until(function () { return as.started; });
        }).then(function () {
            f.querySelector('[name=title]').value = 'Two';
            as.submit();
            return until(function () { return as.seen.indexOf('success') !== -1; });
        }).then(function () {
            t.deepEqual(as.seen.slice(0, 3), ['init', 'beforesave', 'success']);
            t.equal(as.last.json.fields.title, 'Two', 'the server got the new value');
            t.equal(as.last.json.fields.skip, 'a', 'every field is posted, also the ignored ones (only the comparison ignores them)');
            as.stop();
        });
    });

    test('autosave: no change, no save; a change in an ignored field is no change', function (t) {
        var f = form(), as = autosave(f);
        return until(function () { return as.seen.indexOf('init') !== -1; }).then(function () {
            as.start();
            return until(function () { return as.started; });
        }).then(function () {
            as.submit();
            f.querySelector('[name=skip]').value = 'changed';
            as.submit();
            t.deepEqual(as.seen.slice(1), ['nochange', 'nochange']);
            as.stop();
        });
    });

    test('autosave: extra fields count as a change and are posted (StoreExitButton, forced saves)', function (t) {
        var f = form(), as = autosave(f);
        return until(function () { return as.seen.indexOf('init') !== -1; }).then(function () {
            as.start();
            return until(function () { return as.started; });
        }).then(function () {
            as.submit('StoreExitButton=1');
            return until(function () { return as.seen.indexOf('success') !== -1; });
        }).then(function () {
            t.equal(as.last.json.fields.StoreExitButton, '1');
            as.seen.length = 0;
            Exp.emit('autosubmit:forcesave');
            return until(function () { return as.seen.indexOf('success') !== -1; });
        }).then(function () {
            t.ok(/^\d+$/.test(as.last.json.fields.AutoSubmitForced), 'autosubmit:forcesave posts AutoSubmitForced=<time>');
            as.stop();
        });
    });

    test('autosave: an answer that is not JSON is an error', function (t) {
        var f = form(), as = autosave(f, { action: Exp.io.url('expui/test') });
        return until(function () { return as.seen.indexOf('init') !== -1; }).then(function () {
            as.start();
            return until(function () { return as.started; });
        }).then(function () {
            f.querySelector('[name=title]').value = 'Three';
            as.submit();
            return until(function () { return as.seen.indexOf('error') !== -1; });
        }).then(function () {
            t.ok(as.seen.indexOf('success') === -1);
            as.stop();
        });
    });

    test('autosave: stop() during a save reports abort; nothing saves after stop()', function (t) {
        var f = form(), as = autosave(f);
        return until(function () { return as.seen.indexOf('init') !== -1; }).then(function () {
            as.start();
            return until(function () { return as.started; });
        }).then(function () {
            f.querySelector('[name=title]').value = 'Four';
            as.submit();
            as.stop();
            return wait(400);
        }).then(function () {
            t.ok(as.seen.indexOf('abort') !== -1, 'abort');
            t.ok(as.seen.indexOf('success') === -1, 'no success after the abort');
            var n = as.seen.length;
            f.querySelector('[name=title]').value = 'Five';
            as.submit();
            t.equal(as.seen.length, n, 'stopped: submit() does nothing');
        });
    });

    test('autosave: leaving a field saves (trackUserInput); enabled() false keeps it off; beforeSerialize runs first', function (t) {
        var f = form(), calls = 0, as = autosave(f, { beforeSerialize: function () { calls++; } });
        var off = new Exp.autosave.AutoSubmit({ form: form('<input name="pw" type="password">'), action: Exp.io.url('expui/test/echo'), enabled: function () { return false; } });
        f = document.getElementById('as-form');
        as = autosave(f, { beforeSerialize: function () { calls++; } });
        return until(function () { return as.seen.indexOf('init') !== -1; }).then(function () {
            as.start();
            return until(function () { return as.started; });
        }).then(function () {
            t.equal(off.isEnabled, false, 'enabled() false');
            var input = f.querySelector('[name=title]');
            input.focus(); input.value = 'Six';
            input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
            return until(function () { return as.seen.indexOf('success') !== -1; });
        }).then(function () {
            t.ok(calls >= 1, 'beforeSerialize ran before the form was read');
            as.stop();
        });
    });

    test('autosave: the preview opens (forcing a save), shows content and errors, and closes', function (t) {
        var host = document.getElementById('exp-test-sandbox');
        host.innerHTML = '<div id="pv-bar"></div>';
        var forced = 0, h = function () { forced++; };
        Exp.on('autosubmit:forcesave', h);
        var pv = new Exp.autosave.Preview({ buttonPlace: '#pv-bar', texts: { loading: 'L', error: 'E', preview: 'P' }, topPosition: '10px' });
        pv.init();
        t.ok(document.getElementById('preview-link'), 'the link');
        t.ok(document.getElementById('content-preview').classList.contains('loading'), 'loading at first');
        t.equal(document.getElementById('preview-link').textContent, 'P');
        $('#preview-link').trigger('click');
        return wait(Exp.reducedMotion ? 50 : 900).then(function () {
            Exp.off('autosubmit:forcesave', h);
            var place = document.getElementById('content-preview');
            t.ok(place.classList.contains('previewed'), 'open');
            t.equal(forced, 1, 'an unsaved preview forces a save');
            t.ok(!place.classList.contains('unsaved'));
            pv.setContent('<div><select><option>site</option></select><a class="close" href="#">x</a></div><iframe src="about:blank"></iframe>');
            t.ok(!place.classList.contains('loading') && place.querySelector('iframe'), 'content set');
            pv.error('Server said no');
            t.equal(place.querySelector('.error').textContent, 'E: Server said no');
            $(place).find('a.close').trigger('click');
            return wait(Exp.reducedMotion ? 50 : 1000);
        }).then(function () {
            t.ok(!document.getElementById('content-preview').classList.contains('previewed'), 'closed');
        });
    });
}(window, document));
