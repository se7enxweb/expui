/*!
 * Exponential UI (expui) — browser tests of exp::collapse (Exp.collapse, $.fn.expCollapse).
 * GNU General Public License v2.0 (or any later version). https://github.com/se7enxweb/expui
 */
(function (window, document) {
    'use strict';
    var Exp = window.Exp, test = window.ExpTest.test, $ = Exp.$;

    function sandbox(html) {
        var host = document.getElementById('exp-test-sandbox');
        host.innerHTML = html;
        return host;
    }
    function wait(ms) { return new Promise(function (r) { window.setTimeout(r, ms); }); }

    test('collapse: toggles between the two styles, at once with no duration', function (t) {
        sandbox('<a href="#" id="c-link">x</a><div id="c-box" style="width: 200px"></div>');
        var c = Exp.collapse({ link: '#c-link', collapsed: 0,
            elements: [{ selector: '#c-box', duration: 0, fullStyle: { width: '200px' }, collapsedStyle: { width: '20px' } }] });
        c.collapse();
        t.equal($('#c-box').css('width'), '20px', 'collapsed');
        t.equal(c.conf.collapsed, 1);
        c.toggle();
        t.equal($('#c-box').css('width'), '200px', 'expanded again');
        t.equal(c.conf.collapsed, 0);
    });

    test('collapse: the link toggles it, and says so with aria-expanded', function (t) {
        sandbox('<a href="#" id="c-link">x</a><div id="c-box" style="width: 100px"></div>');
        Exp.collapse({ link: '#c-link', collapsed: '0',
            elements: [{ selector: '#c-box', duration: 0, fullStyle: { width: '100px' }, collapsedStyle: { width: '10px' } }] });
        t.equal($('#c-link').attr('aria-expanded'), 'true', 'expanded at first');
        $('#c-link').trigger('click');
        t.equal($('#c-box').css('width'), '10px', 'the click collapsed it');
        t.equal($('#c-link').attr('aria-expanded'), 'false');
        t.ok($('#c-link').data('expCollapse'), 'the instance is on the link');
    });

    test('collapse: a "1" from a template starts collapsed', function (t) {
        sandbox('<a href="#" id="c-link">x</a><div id="c-box" style="width: 10px"></div>');
        var c = Exp.collapse({ link: '#c-link', collapsed: '1',
            elements: [{ selector: '#c-box', duration: 0, fullStyle: { width: '100px' }, collapsedStyle: { width: '10px' } }] });
        t.equal(c.conf.collapsed, 1);
        c.toggle();
        t.equal($('#c-box').css('width'), '100px', 'the first click expands');
    });

    test('collapse: animates sizes over the duration and calls after* at the end', function (t) {
        sandbox('<a href="#" id="c-link">x</a><div id="c-box" style="width: 200px"></div>');
        var after = 0;
        var c = Exp.collapse({ link: '#c-link', collapsed: 0, aftercollapse: function () { after++; },
            elements: [{ selector: '#c-box', duration: 0.2, fullStyle: { width: '200px' }, collapsedStyle: { width: '20px' } }] });
        c.collapse();
        if (Exp.reducedMotion) {
            t.equal($('#c-box').css('width'), '20px', 'no motion: at once');
            return null;
        }
        t.ok(parseFloat($('#c-box').css('width')) > 20, 'not there yet');
        return wait(400).then(function () {
            t.equal($('#c-box').css('width'), '20px', 'there after the duration');
            t.equal(after, 1, 'aftercollapse once');
        });
    });

    test('collapse: style values may be functions; other values are set at once', function (t) {
        sandbox('<a href="#" id="c-link">x</a><div id="c-box" style="width: 50px"></div>');
        var w = 70;
        var c = Exp.collapse({ link: '#c-link', collapsed: 1,
            elements: [{ selector: '#c-box', duration: 0.3,
                         fullStyle: { width: function () { return w + 'px'; }, backgroundRepeat: 'no-repeat' }, collapsedStyle: {} }] });
        c.uncollapse();
        t.equal($('#c-box').css('background-repeat'), 'no-repeat', 'set at once');
        return wait(Exp.reducedMotion ? 0 : 450).then(function () {
            t.equal($('#c-box').css('width'), '70px', 'the function\'s value');
        });
    });

    test('collapse: the link content follows the state; before*, callback and the event run', function (t) {
        sandbox('<a href="#" id="c-link">Hide</a>');
        var calls = [], seen = null;
        var handler = function (e, d) { seen = d; };
        Exp.on('exp:collapse', handler);
        var c = Exp.collapse({ link: '#c-link', collapsed: 0, content: ['Hide', 'Show'],
            beforecollapse: function () { calls.push('before'); }, callback: function () { calls.push('callback ' + this.conf.collapsed); } });
        c.collapse();
        Exp.off('exp:collapse', handler);
        t.equal($('#c-link').html(), 'Show');
        t.equal(calls.join(','), 'before,callback 1');
        t.ok(seen && seen.collapsed === 1 && seen.link === $('#c-link')[0], 'exp:collapse');
    });

    test('collapse: saves the state as the preference', function (t) {
        sandbox('<a href="#" id="c-link">x</a>');
        var saved = new Promise(function (resolve) {
            var h = function (e, d) { if (d.name === 'exp_test_collapse') { Exp.off('exp:prefs:set', h); resolve(d.value); } };
            Exp.on('exp:prefs:set', h);
        });
        Exp.collapse({ link: '#c-link', collapsed: 0, pref: { name: 'exp_test_collapse', values: ['shown', 'hidden'] } }).collapse();
        return saved.then(function (value) { t.equal(value, 'hidden', 'values[collapsed]'); });
    });

    test('collapse: $.fn.expCollapse sets it up on each element', function (t) {
        sandbox('<a href="#" class="c-many">a</a><a href="#" class="c-many">b</a>');
        $('.c-many').expCollapse({ collapsed: 0 });
        t.equal($('.c-many').filter(function () { return !!$(this).data('expCollapse'); }).length, 2);
    });
}(window, document));
